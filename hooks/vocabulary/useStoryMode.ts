'use client';

import { useState, useEffect } from 'react';
import type { VocabularyWord } from '@/lib/types/vocabulary';
import type { Story } from '@/lib/types/story';

interface StoryModeOptions {
  words: VocabularyWord[];
}

export default function useStoryMode({ words }: StoryModeOptions) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [story, setStory] = useState<string | null>(null);
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
      .catch(err => console.error('Failed to load stories:', err));
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
    setActiveStoryId(null);
  };

  const generateStory = async () => {
    if (selectedIds.size === 0) return;
    setIsGeneratingStory(true);
    setStory(null);
    try {
      const selectedWords = words.filter(w => selectedIds.has(w.id)).map(w => w.word);
      const res = await fetch('/api/ai-story', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ words: selectedWords })
      });
      const data = await res.json();
      setStory(data.story);
      if (data.saved) {
        setStories(prev => [data.saved, ...prev]);
        setActiveStoryId(data.saved.id);
      }
      setIsStorySidebarOpen(true);
    } catch (err) {
      console.error(err);
      alert('Failed to generate story');
    } finally {
      setIsGeneratingStory(false);
    }
  };

  const selectStory = (s: Story) => {
    setStory(s.content);
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
      console.error('Failed to delete story:', err);
    }
  };

  return {
    selectionMode,
    selectedIds,
    story,
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
  };
}
