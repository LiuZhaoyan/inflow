'use client';

import { useState } from 'react';
import type { VocabularyWord } from '@/lib/types/vocabulary';

interface StoryModeOptions {
  words: VocabularyWord[];
}

export default function useStoryMode({ words }: StoryModeOptions) {
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [story, setStory] = useState<string | null>(null);
  const [isGeneratingStory, setIsGeneratingStory] = useState(false);
  const [isStorySidebarOpen, setIsStorySidebarOpen] = useState(false);

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
      setIsStorySidebarOpen(true);
    } catch (err) {
      console.error(err);
      alert('Failed to generate story');
    } finally {
      setIsGeneratingStory(false);
    }
  };

  return {
    selectionMode,
    selectedIds,
    story,
    isGeneratingStory,
    isStorySidebarOpen,
    setSelectionMode,
    setIsStorySidebarOpen,
    toggleSelection,
    generateStory,
    resetStory,
  };
}
