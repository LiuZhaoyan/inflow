'use client';

import { useCallback, useEffect, useState } from 'react';
import type { VocabularyWord } from '@/lib/types/vocabulary';
import { logger } from '@/lib/core/logger';

export default function useVocabularyData() {
  const [words, setWords] = useState<VocabularyWord[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVocabulary = useCallback(async () => {
    try {
      const res = await fetch('/api/vocabulary');
      if (res.ok) {
        const data = await res.json();
        setWords(data.sort((a: VocabularyWord, b: VocabularyWord) => b.createdAt - a.createdAt));
      }
    } catch (err) {
      logger.error('useVocabularyData: Failed to load vocabulary', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchVocabulary();
  }, [fetchVocabulary]);

  return {
    words,
    setWords,
    loading,
    refreshWords: fetchVocabulary,
  };
}
