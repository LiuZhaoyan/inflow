import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { DesktopOperations } from './operations';
import type { SaveVocabularyInput } from '../src/listening/desktop';

test('collection, distinct senses, correction and target selection survive reprocessing and restart without losing source context', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'inflow vocabulary 韩语 '));
  const library = path.join(root, 'library');
  await mkdir(library);
  // Existing ticket-03 database: the additive migration must preserve saved material.
  const previous = new DatabaseSync(path.join(library, 'learning.sqlite'));
  previous.exec(`CREATE TABLE media (id TEXT PRIMARY KEY, name TEXT NOT NULL, filename TEXT NOT NULL, hash TEXT NOT NULL, learning TEXT NOT NULL);
    CREATE TABLE segments (id TEXT PRIMARY KEY, media_id TEXT NOT NULL REFERENCES media(id), ordinal INTEGER NOT NULL, content TEXT NOT NULL);
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);`);
  const oldSegment = { start: 0, end: 1, text: '안녕하세요.', groups: ['안녕하세요.'] };
  previous.prepare('INSERT INTO media VALUES (?, ?, ?, ?, ?)').run('existing-media', 'old.webm', 'old.webm', 'fixture', JSON.stringify({ duration: 2, position: 0, index: 0, rate: 1, loop: false }));
  previous.prepare('INSERT INTO segments VALUES (?, ?, ?, ?)').run('existing-segment', 'existing-media', 0, JSON.stringify(oldSegment));
  previous.prepare('INSERT INTO settings VALUES (?, ?)').run('active', 'existing-media');
  previous.close();

  let result = [
    { start: 0.1, end: 2.5, text: '집까지 삼십 분이 걸렸어요.', groups: ['집까지 삼십 분이', '걸렸어요.'] },
    { start: 3, end: 4.5, text: '역까지 십 분이 걸렸어요.', groups: ['역까지 십 분이', '걸렸어요.'] },
    { start: 5, end: 6.5, text: '감기에 걸렸어요.', groups: ['감기에', '걸렸어요.'] },
  ];
  const processor = async (mode: string) => mode === 'probe' ? { duration: 10 } : ({ segments: result });
  let app = new DesktopOperations(library, processor);
  try {
    assert.equal(app.restore()!.segments[0].id, 'existing-segment');
    assert.equal(app.restore()!.segments[0].text, oldSegment.text);
    assert.equal(app.restore()!.learning.mode, 'full');
    const file = path.join(root, '视频.webm');
    await writeFile(file, 'deterministic media fixture');
    const imported = await app.importMedia(file);
    const media = await app.transcribe(imported.id, 'initial');
    const context = (index: number): NonNullable<SaveVocabularyInput['context']> => ({
      surface: '걸렸어요', sentence: media.segments[index].text,
      source: { type: 'media', mediaId: media.id, segmentId: media.segments[index].id, name: media.name, start: media.segments[index].start },
    });
    const firstContext = context(0);
    assert.throws(() => app.saveVocabulary({ lemma: '', meaningZh: '花费时间' }));
    assert.throws(() => app.saveVocabulary({ lemma: '걸리다', meaningZh: '花费时间', context: { ...firstContext, surface: 'unknown word' } }), /不属于/);
    assert.throws(() => app.saveVocabulary({ lemma: '걸리다', meaningZh: '花费时间', context: { ...firstContext, source: { type: 'media', mediaId: media.id, segmentId: 'unknown', name: media.name, start: 0 } } }), /原句已更新/);
    assert.throws(() => app.saveVocabulary({ lemma: '걸리다', meaningZh: '花费时间', context: { ...firstContext, source: { type: 'media', mediaId: 'existing-media', segmentId: media.segments[0].id, name: '', start: 0 } } }), /原句已更新/);
    for (const invalid of [null, {}, { source: null }, { source: { type: 'manual' } }]) {
      assert.throws(() => app.saveVocabulary({ lemma: '걸리다', meaningZh: '花费时间', context: invalid as SaveVocabularyInput['context'] }), /原句来源无效/);
    }
    assert.deepEqual(app.listVocabulary(), []);

    assert.ok(firstContext.source.type === 'media');
    const first = app.saveVocabulary({ lemma: '걸리다'.normalize('NFD'), meaningZh: '花费时间', context: {
      ...firstContext, surface: firstContext.surface.normalize('NFD'), sentence: 'untrusted sentence',
      source: { ...firstContext.source, name: 'untrusted name', start: 999 },
    } });
    assert.equal(first.lemma, '걸리다');
    assert.deepEqual(first.contexts[0], { id: first.contexts[0].id, ...firstContext });
    const again = app.saveVocabulary({ lemma: '걸리다', meaningZh: '花费时间', context: context(1) });
    assert.equal(again.id, first.id); assert.equal(again.contexts.length, 2);
    assert.deepEqual(again.contexts[0], first.contexts[0]);
    assert.equal(app.saveVocabulary({ lemma: '걸리다', meaningZh: '花费时间', context: firstContext }).contexts.length, 2);
    const illness = app.saveVocabulary({ lemma: '걸리다', meaningZh: '患病', context: context(2) });
    assert.notEqual(illness.id, first.id);
    const manual = app.saveVocabulary({ lemma: '배', meaningZh: '船' });
    assert.deepEqual(manual.contexts, []);
    app.selectVocabulary([first.id, manual.id]);
    const corrected = app.saveVocabulary({ id: first.id, lemma: '걸리다', meaningZh: '需要（时间）' });
    assert.equal(corrected.selected, true); assert.deepEqual(corrected.contexts, again.contexts);
    const before = app.listVocabulary();
    assert.throws(() => app.saveVocabulary({ id: illness.id, lemma: corrected.lemma, meaningZh: corrected.meaningZh }), /已有同词同义/);
    assert.throws(() => app.selectVocabulary([manual.id, 'unknown']), /不存在/);
    assert.deepEqual(app.listVocabulary(), before);

    result = [{ start: 0.1, end: 2.5, text: '새로운 원문입니다.', groups: ['새로운 원문입니다.'] }];
    await app.transcribe(media.id, 'reprocess');
    assert.equal(app.get(media.id).segments.length, 1);
    assert.equal(app.get(media.id).segments[0].text, result[0].text);
    assert.deepEqual(app.listVocabulary(), before);
    await rm(app.mediaPath(media.id));
    app.close(); app = new DesktopOperations(library, processor);
    assert.deepEqual(app.listVocabulary(), before);
    assert.equal(app.restore()!.missing, true);
    assert.equal(app.get('existing-media').segments[0].id, 'existing-segment');
    assert.equal(app.listVocabulary().filter(entry => entry.selected).length, 2);
  } finally { app.close(); await rm(root, { recursive: true, force: true }); }
});

test('existing vocabulary rows adapt to contexts without changing the schema or losing historical provenance', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'inflow vocabulary compatibility '));
  const filename = path.join(root, 'learning.sqlite');
  const previous = new DatabaseSync(filename);
  previous.exec(`CREATE TABLE media (id TEXT PRIMARY KEY, name TEXT NOT NULL, filename TEXT NOT NULL, hash TEXT NOT NULL, learning TEXT NOT NULL);
    CREATE TABLE segments (id TEXT PRIMARY KEY, media_id TEXT NOT NULL REFERENCES media(id), ordinal INTEGER NOT NULL, content TEXT NOT NULL, active INTEGER NOT NULL DEFAULT 1);
    CREATE TABLE settings (key TEXT PRIMARY KEY, value TEXT NOT NULL);
    CREATE TABLE vocabulary (id TEXT PRIMARY KEY, lemma TEXT NOT NULL, meaning TEXT NOT NULL, selected INTEGER NOT NULL DEFAULT 0, UNIQUE(lemma, meaning));
    CREATE TABLE vocabulary_sources (id TEXT PRIMARY KEY, entry_id TEXT NOT NULL REFERENCES vocabulary(id), segment_id TEXT NOT NULL REFERENCES segments(id), surface TEXT NOT NULL, sentence TEXT NOT NULL, UNIQUE(entry_id, segment_id, surface));
    CREATE TABLE artifacts (id TEXT PRIMARY KEY, content TEXT NOT NULL);
    CREATE TABLE artifact_vocabulary_sources (id TEXT PRIMARY KEY, entry_id TEXT NOT NULL REFERENCES vocabulary(id), artifact_id TEXT NOT NULL REFERENCES artifacts(id), sentence_index INTEGER NOT NULL, surface TEXT NOT NULL, sentence TEXT NOT NULL, UNIQUE(entry_id, artifact_id, sentence_index, surface));`);
  const sentence = '뒤돌아서 그대로 앞으로 가면 돼.';
  const artifact = { title: 'The Lost Umbrella', sentences: [{ parts: [{ text: '그냥 그대로 있어.', targetId: null }], translationZh: '就那样待着。' }],
    targets: [], createdAt: '2026-10-01T00:00:00.000Z', elapsedMs: 100, requestedModel: 'fixture' };
  previous.prepare('INSERT INTO media VALUES (?, ?, ?, ?, ?)').run('media', 'Queen of Tears', 'missing.webm', 'fixture', JSON.stringify({ duration: 200, position: 0, index: 0, rate: 1, loop: false, mode: 'full' }));
  previous.prepare('INSERT INTO segments VALUES (?, ?, ?, ?, ?)').run('historical-segment', 'media', 0, JSON.stringify({ start: 133, end: 136, text: sentence, groups: [sentence] }), 0);
  previous.prepare('INSERT INTO artifacts VALUES (?, ?)').run('artifact', JSON.stringify(artifact));
  previous.prepare('INSERT INTO vocabulary VALUES (?, ?, ?, ?)').run('entry', '그대로', '就那样', 1);
  previous.prepare('INSERT INTO vocabulary VALUES (?, ?, ?, ?)').run('manual', '배', '船', 0);
  previous.prepare('INSERT INTO artifact_vocabulary_sources VALUES (?, ?, ?, ?, ?, ?)').run('artifact-context', 'entry', 'artifact', 0, '그대로', '그냥 그대로 있어.');
  previous.prepare('INSERT INTO vocabulary_sources VALUES (?, ?, ?, ?, ?)').run('media-context', 'entry', 'historical-segment', '그대로', sentence);
  const schema = previous.prepare('SELECT name, sql FROM sqlite_schema ORDER BY name').all();
  const mediaRows = previous.prepare('SELECT * FROM vocabulary_sources').all();
  const artifactRows = previous.prepare('SELECT * FROM artifact_vocabulary_sources').all();
  previous.close();

  const processor = async () => { throw new Error('Reading contexts must not process media'); };
  let app = new DesktopOperations(root, processor);
  try {
    const entries = app.listVocabulary();
    assert.deepEqual(entries, [
      { id: 'manual', lemma: '배', meaningZh: '船', selected: false, contexts: [] },
      { id: 'entry', lemma: '그대로', meaningZh: '就那样', selected: true, contexts: [
        { id: 'media-context', surface: '그대로', sentence, source: { type: 'media', mediaId: 'media', segmentId: 'historical-segment', name: 'Queen of Tears', start: 133 } },
        { id: 'artifact-context', surface: '그대로', sentence: '그냥 그대로 있어.', source: { type: 'artifact', artifactId: 'artifact', sentenceIndex: 0, name: artifact.title } },
      ] },
    ]);
    for (const context of entries[1].contexts) {
      assert.deepEqual(app.saveVocabulary({ lemma: '그대로', meaningZh: '就那样', context }), entries[1]);
    }
    const historical = entries[1].contexts[0];
    assert.ok(historical.source.type === 'media');
    assert.deepEqual(app.saveVocabulary({ lemma: '그대로', meaningZh: '就那样', context: {
      ...historical, sentence: 'forged sentence', source: { ...historical.source, name: 'forged name', start: 999 },
    } }), entries[1]);
    const corrected = app.saveVocabulary({ id: 'entry', lemma: '그대로', meaningZh: '保持原样' });
    assert.equal(corrected.selected, true);
    assert.deepEqual(corrected.contexts, entries[1].contexts);
    const extended = app.saveVocabulary({ lemma: corrected.lemma, meaningZh: corrected.meaningZh,
      context: { ...entries[1].contexts[1], surface: '그대로 있어' } });
    assert.equal(extended.id, 'entry');
    assert.equal(extended.contexts.length, 3);
    assert.deepEqual(extended.contexts.slice(0, 2), entries[1].contexts);
    const expected = app.listVocabulary();
    app.close(); app = new DesktopOperations(root, processor);
    assert.deepEqual(app.listVocabulary(), expected);
    assert.deepEqual(app.openArtifact('artifact'), { ...artifact, id: 'artifact' });
    assert.equal(app.get('media').segments.length, 0);
    assert.equal(app.get('media').missing, true);
    const stored = new DatabaseSync(filename);
    try {
      assert.deepEqual(stored.prepare('SELECT name, sql FROM sqlite_schema ORDER BY name').all(), schema);
      assert.deepEqual(stored.prepare('SELECT * FROM vocabulary_sources').all(), mediaRows);
      assert.deepEqual(stored.prepare('SELECT * FROM artifact_vocabulary_sources LIMIT 1').all(), artifactRows);
      assert.equal(stored.prepare('SELECT COUNT(*) AS count FROM artifact_vocabulary_sources').get()!.count, 2);
    } finally { stored.close(); }
  } finally { app.close(); await rm(root, { recursive: true, force: true }); }
});
