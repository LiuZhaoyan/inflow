import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { DesktopOperations } from './operations';

test('offline candidates and saved meanings distinguish occurrences; an uncollected cloud gloss is not persisted', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'inflow gloss '));
  const processor = async (mode: string) => mode === 'probe' ? { duration: 2 } : { segments: [{ start: 0, end: 2, text: '배가 배에 있어요.', groups: ['배가 배에 있어요.'] }] };
  let app = new DesktopOperations(root, processor, undefined, undefined, async input => { assert.ok(input.candidates.includes('船')); return '腹部'; });
  try {
    const filename = path.join(root, 'sample.wav'); await writeFile(filename, 'fixture');
    const media = await app.transcribe((await app.importMedia(filename)).id, 'seed');
    const source = { type: 'media', mediaId: media.id, segmentId: media.segments[0].id, name: media.name, start: 0 } as const;
    const input = { surface: '배', sentence: media.segments[0].text, start: 0, lemma: '배', language: 'ko', source } as const;
    const context = { surface: '배', sentence: input.sentence, source, surfaceStart: 0 };
    app.saveVocabulary({ lemma: '배', meaningZh: '肚子', context });
    app.saveVocabulary({ lemma: '배', meaningZh: '船', context: { ...context, surfaceStart: 3 } });
    assert.equal((await app.lookupVocabulary(input, 'first')).meaningZh, '肚子');
    assert.equal((await app.lookupVocabulary({ ...input, start: 3 }, 'second')).meaningZh, '船');
    assert.equal((await app.lookupVocabulary({ ...input, source: undefined }, 'no-source')).meaningZh, undefined);
    const before = app.listVocabulary();
    assert.equal(await app.glossVocabulary(input, 'gloss', 'test'), '腹部');
    app.close(); app = new DesktopOperations(root, processor);
    assert.deepEqual(app.listVocabulary(), before);
    assert.equal((await app.lookupVocabulary(input, 'restored')).meaningZh, '肚子');
    assert.throws(() => app.saveVocabulary({ lemma: '배', meaningZh: '梨', context: { ...context, surfaceStart: 1 } }));
    await assert.rejects(app.lookupVocabulary({ ...input, source: { ...source, segmentId: 'missing' } }, 'invalid'));
  } finally { app.close(); await rm(root, { recursive: true, force: true }); }
});
