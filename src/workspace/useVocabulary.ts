"use client";

import { useCallback, useEffect, useRef, useState } from 'react';
import type { SaveVocabularyInput, VocabularyEntry } from '@/listening/desktop';

export function useVocabulary(enabled: boolean) {
  const [entries, setEntries] = useState<VocabularyEntry[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const current = useRef<VocabularyEntry[]>([]);
  const readRequest = useRef(0);
  const writeVersion = useRef(0);
  const writes = useRef(new Set<Promise<unknown>>());
  const latestRead = useRef<Promise<VocabularyEntry[]> | null>(null);

  const publish = useCallback((next: VocabularyEntry[]) => {
    current.current = next;
    setEntries(next);
  }, []);

  const reload = useCallback((): Promise<VocabularyEntry[]> => {
    const request = ++readRequest.current;
    setLoading(true);
    const reading = (async () => {
      for (;;) {
        while (writes.current.size) await Promise.allSettled([...writes.current]);
        if (request !== readRequest.current) return latestRead.current ?? current.current;
        const version = writeVersion.current;
        try {
          const next = await window.inflow!.listVocabulary();
          if (request !== readRequest.current) return latestRead.current ?? current.current;
          // Retry interrupted snapshots so Context/source changes are not lost with stale notes.
          if (version !== writeVersion.current) continue;
          publish(next); setLoaded(true); setLoading(false); setLoadError('');
          return next;
        } catch (failure) {
          if (request !== readRequest.current) return latestRead.current ?? current.current;
          if (version !== writeVersion.current) continue;
          setLoaded(true); setLoading(false);
          setLoadError(failure instanceof Error ? failure.message : 'Could not load vocabulary.');
          throw failure;
        }
      }
    })();
    latestRead.current = reading;
    return reading;
  }, [publish]);

  useEffect(() => {
    if (!enabled) return;
    void reload().catch(() => {});
    const requests = readRequest;
    return () => { requests.current++; latestRead.current = null; };
  }, [enabled, reload]);

  const mutate = useCallback(async <T,>(operation: Promise<T>, update: (entries: VocabularyEntry[], result: T) => VocabularyEntry[]) => {
    writeVersion.current++;
    writes.current.add(operation);
    try {
      const result = await operation;
      publish(update(current.current, result)); setLoaded(true);
      return result;
    } finally {
      writes.current.delete(operation);
      writeVersion.current++;
    }
  }, [publish]);

  const save = useCallback((input: SaveVocabularyInput) => mutate(window.inflow!.saveVocabulary(input), (previous, saved) =>
    previous.some(entry => entry.id === saved.id) ? previous.map(entry => entry.id === saved.id ? saved : entry) : [saved, ...previous]), [mutate]);
  const remove = useCallback((id: string) => mutate(window.inflow!.deleteVocabulary(id), previous => previous.filter(entry => entry.id !== id)), [mutate]);
  const select = useCallback((ids: string[]) => mutate(window.inflow!.selectVocabulary(ids), (_previous, next) => next), [mutate]);
  const refresh = useCallback(() => { void reload().catch(() => {}); }, [reload]);

  return { entries, loaded, loading, loadError, reload, refresh, save, remove, select };
}

export type VocabularyState = ReturnType<typeof useVocabulary>;
