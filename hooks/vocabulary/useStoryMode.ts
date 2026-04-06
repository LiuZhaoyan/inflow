'use client';

import { useState, useEffect } from 'react';
import type { VocabularyWord } from '@/lib/types/vocabulary';
import type { Story } from '@/lib/types/story';
import { logger } from '@/lib/logger';

interface StoryModeOptions {
  words: VocabularyWord[];
}

export default function useStoryMode({ words }: StoryModeOptions) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [story, setStory] = useState<string | null>(null);
  const [translation, setTranslation] = useState<string | null>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [activeStoryId, setActiveStoryId] = useState<string | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [isStorySidebarOpen, setIsStorySidebarOpen] = useState(false);

  // Load saved stories on mount
  useEffect(() => {
    fetch('/api/stories')
      .then(r => r.json())
      .then(data => {
        if (data.stories) setStories(data.stories);
      })
      .catch(err => logger.error('useStoryMode: Failed to load stories', err));
  }, []);

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const resetStory = () => {
    setSelectionMode(false);
    setSelectedIds(new Set());
    setStory(null);
    setTranslation(null);
    setActiveStoryId(null);
  };

  const generateStory = async () => {
    if (selectedIds.size === 0) return;
    setIsGeneratingStory(true);
    setStory(null);
    setTranslation(null);
    try {
      const selectedWords = words.filter(w => selectedIds.has(w.id)).map(w => w.word);
      const res = await fetch('/api/ai-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: selectedWords })
      });
      const data = await res.json();
      setStory(data.story);
      setTranslation(data.translation || null);
      if (data.saved) {
        setStories(prev => [data.saved, ...prev]);
        setActiveStoryId(data.saved.id);
      }
      setIsStorySidebarOpen(true);
    } catch (err) {
      logger.error('useStoryMode: Failed to generate story', err);
      alert('Failed to generate story');
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const selectStory = (s: Story) => {
    setStory(s.content);
    setTranslation(s.translation || null);
    setActiveStoryId(s.id);
    setIsStorySidebarOpen(true);
  };

  const handleDeleteStory = async (id: string) => {
    try {
      const res = await fetch('/api/stories', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      if (!res.ok) throw new Error('Delete failed');
      setStories(prev => prev.filter(s => s.id !== id));
      if (activeStoryId === id) {
        setStory(null);
        setActiveStoryId(null);
      }
    } catch (err) {
      logger.error('useStoryMode: Failed to delete story', err);
    }
  };

  const updateStoryAudioPath = (id: string, audioPath: string) => {
    setStories(prev => prev.map(s => (s.id === id ? { ...s, audioPath } : s)));
  };

  return {
    selectionMode,
    selectedIds,
    story,
    translation,
    stories,
    activeStoryId,
    isGeneratingStory,
    isStorySidebarOpen,
    setSelectionMode,
    setIsStorySidebarOpen,
    toggleSelection,
    generateStory,
    resetStory,
    selectStory,
    deleteStory: handleDeleteStory,
    updateStoryAudioPath,
  };
}
