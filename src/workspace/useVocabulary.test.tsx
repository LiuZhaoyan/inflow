import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, expect, test, vi } from 'vitest';
import type { DesktopBridge, VocabularyEntry } from '@/listening/desktop';
import { useVocabulary } from './useVocabulary';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>(done => { resolve = done; });
  return { promise, resolve };
}

const word: VocabularyEntry = {
  id: 'home', language: 'en', lemma: 'home', meaningZh: '家', selected: true, contexts: [],
};

afterEach(() => {
  cleanup();
  delete window.inflow;
});

test('a stale vocabulary reply cannot replace a newer completed read', async () => {
  const stale = deferred<VocabularyEntry[]>();
  const fresh = deferred<VocabularyEntry[]>();
  const listVocabulary = vi.fn().mockReturnValueOnce(stale.promise).mockReturnValueOnce(fresh.promise);
  window.inflow = { listVocabulary } as unknown as DesktopBridge;
  const { result } = renderHook(() => useVocabulary(true));
  let reload!: Promise<VocabularyEntry[]>;
  act(() => { reload = result.current.reload(); });
  const latest = [{ ...word, note: 'Latest note' }];

  await act(async () => {
    fresh.resolve(latest);
    expect(await reload).toEqual(latest);
  });
  await act(async () => {
    stale.resolve([{ ...word, note: 'Outdated note' }]);
    await stale.promise;
  });

  expect(listVocabulary).toHaveBeenCalledTimes(2);
  expect(result.current.entries).toEqual(latest);
  expect(result.current.loading).toBe(false);
  expect(result.current.loadError).toBe('');
});

test('a read interrupted by a successful write retries without losing the note or new contexts', async () => {
  const stale = deferred<VocabularyEntry[]>();
  const fresh = deferred<VocabularyEntry[]>();
  const write = deferred<VocabularyEntry>();
  const listVocabulary = vi.fn().mockReturnValueOnce(stale.promise).mockReturnValueOnce(fresh.promise);
  window.inflow = { listVocabulary, saveVocabulary: vi.fn().mockReturnValue(write.promise) } as unknown as DesktopBridge;
  const { result } = renderHook(() => useVocabulary(true));
  const saved = { ...word, note: 'Saved while reading' };
  let saving!: Promise<VocabularyEntry>;
  act(() => { saving = result.current.save(saved); });
  await act(async () => { write.resolve(saved); await saving; });
  expect(result.current.entries).toEqual([saved]);

  await act(async () => { stale.resolve([word]); await stale.promise; });
  expect(listVocabulary).toHaveBeenCalledTimes(2);
  expect(result.current.entries).toEqual([saved]);
  const reloaded: VocabularyEntry[] = [{ ...saved, contexts: [{
    id: 'context', surface: 'home', sentence: 'I walk home.',
    source: { type: 'artifact', artifactId: 'story', sentenceIndex: 0, name: 'Walking home' },
  }] }];
  await act(async () => { fresh.resolve(reloaded); await fresh.promise; });

  expect(result.current.entries).toEqual(reloaded);
  expect(result.current.loading).toBe(false);
  expect(result.current.loadError).toBe('');
});
