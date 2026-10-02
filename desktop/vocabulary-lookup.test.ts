import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { DesktopOperations } from './operations';
import type { LookupVocabularyInput } from '../src/listening/desktop';

test('lookup suggests a dictionary form without saving, validates selection, and permits retry', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'inflow lookup '));
  let failed = false;
  const app = new DesktopOperations(root, async () => {
    if (failed) throw new Error('parser unavailable');
    return { surface: '갔어요', lemma: '가다', language: 'ko' };
  });
  const input = { surface: '갔어요', sentence: '학교에 갔어요.', start: 4, language: 'ko' } as const;
  try {
    const lookup = await app.lookupVocabulary(input, 'lookup');
    assert.equal(lookup.lemma, '가다'); assert.equal(lookup.surface, '갔어요'); assert.equal(lookup.language, 'ko');
    assert.ok(lookup.candidates.includes('去'));
    assert.deepEqual(app.listVocabulary(), []);
    for (const invalid of [
      { ...input, surface: '학교에 갔어요', start: 0 }, { ...input, start: 0 },
      { ...input, start: -1 }, { ...input, sentence: '' }, { ...input, language: 'en' },
    ]) await assert.rejects(app.lookupVocabulary(invalid as LookupVocabularyInput, 'invalid'));
    failed = true;
    await assert.rejects(app.lookupVocabulary(input, 'failed'), /parser unavailable/);
    assert.deepEqual(app.listVocabulary(), []);
    const manual = app.saveVocabulary({ lemma: '가다', meaningZh: '去' });
    assert.equal(manual.lemma, '가다');
    assert.equal(manual.language, 'ko');
    assert.throws(() => app.saveVocabulary({ lemma: '가다 먹다', meaningZh: '去、吃' }), /单词/);
    failed = false;
    assert.equal((await app.lookupVocabulary(input, 'retry')).lemma, '가다');
    assert.deepEqual(app.listVocabulary(), [manual]);
  } finally { app.close(); await rm(root, { recursive: true, force: true }); }
});
