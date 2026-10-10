import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { DesktopOperations } from './operations';
import type { generatePassage } from '../src/generation';
import type { SaveVocabularyInput } from '../src/listening/desktop';

test('reprocessing clears source contexts while collection, distinct senses, corrections and selection survive restart', async () => {
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
    const first = app.saveVocabulary({ lemma: '걸리다'.normalize('NFD'), meaningZh: '花费时间', note: 'Personal reminder', context: {
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
    const after = before.map(entry => ({ ...entry, contexts: [] }));
    assert.deepEqual(app.listVocabulary(), after);
    await rm(app.mediaPath(media.id));
    app.close(); app = new DesktopOperations(library, processor);
    assert.deepEqual(app.listVocabulary(), after);
    assert.equal(app.restore()!.missing, true);
    assert.equal(app.get('existing-media').segments[0].id, 'existing-segment');
    assert.equal(app.listVocabulary().filter(entry => entry.selected).length, 2);
  } finally { app.close(); await rm(root, { recursive: true, force: true }); }
});

test('transcript replacement atomically clears only its media sources and permits source-less reuse', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'inflow vocabulary reprocess '));
  const library = path.join(root, 'library');
  const segments = [{ start: 0, end: 2, text: '친구와 걸어요.', groups: ['친구와', '걸어요.'] }];
  let mode = 'success';
  const processor = async (operation: string, signal: AbortSignal) => {
    if (operation === 'probe') return { duration: 10 };
    if (mode === 'failure') throw new Error('fixture ASR failure');
    if (mode === 'invalid') return { segments: [] };
    if (mode === 'cancel') await new Promise<void>(resolve => signal.addEventListener('abort', () => resolve(), { once: true }));
    return { segments };
  };
  const generator: typeof generatePassage = async input => ({ title: '산책', requestedModel: 'deepseek-flash',
    sentences: [{ parts: [{ text: input.targets[0].lemma, targetId: input.targets[0].id }], translationZh: input.targets[0].meaningZh }] });
  let app = new DesktopOperations(library, processor, generator);
  let db: DatabaseSync | undefined;
  try {
    const file = path.join(root, 'sample.webm'); await writeFile(file, 'fixture');
    const media = await app.transcribe((await app.importMedia(file)).id, 'first');
    const other = await app.transcribe((await app.importMedia(file)).id, 'other');
    const context = (source: typeof media, surface: string, surfaceStart: number): NonNullable<SaveVocabularyInput['context']> => ({
      surface, surfaceStart, sentence: source.segments[0].text,
      source: { type: 'media', mediaId: source.id, segmentId: source.segments[0].id, name: source.name, start: source.segments[0].start },
    });
    const walk = app.saveVocabulary({ lemma: '걷다', meaningZh: '走路', context: context(media, '걸어요', 4) });
    const friend = app.saveVocabulary({ lemma: '친구', meaningZh: '朋友', context: context(media, '친구', 0) });
    app.saveVocabulary({ lemma: walk.lemma, meaningZh: walk.meaningZh, context: context(other, '걸어요', 4) });
    const story = await app.generateArtifact([walk.id], '', 'story', 'fixture-key');
    app.saveVocabulary({ lemma: walk.lemma, meaningZh: walk.meaningZh, context: { surface: '걷다', surfaceStart: 0, sentence: '걷다',
      source: { type: 'artifact', artifactId: story.id, sentenceIndex: 0, name: story.title } } });
    app.selectVocabulary([friend.id]);

    db = new DatabaseSync(path.join(library, 'learning.sqlite'));
    // Include a retained segment from a prior version of this material.
    db.prepare('INSERT INTO segments VALUES (?, ?, ?, ?, ?)').run('historical', media.id, 0, JSON.stringify(segments[0]), 0);
    db.prepare('INSERT INTO vocabulary_sources VALUES (?, ?, ?, ?, ?)').run('historical-context', walk.id, 'historical', '걸어요', segments[0].text);
    db.prepare('INSERT INTO vocabulary_positions VALUES (?, ?)').run('historical-context', 4);
    db.prepare('INSERT INTO translations VALUES (?, ?, ?)').run(media.segments[0].id, 'fixture', '朋友一起走路。');
    const before = app.listVocabulary();
    const positions = db.prepare('SELECT * FROM vocabulary_positions ORDER BY context_id, start').all();
    for (mode of ['failure', 'invalid']) {
      await assert.rejects(app.transcribe(media.id, mode));
      assert.deepEqual(app.get(media.id), media);
      assert.deepEqual(app.listVocabulary(), before);
    }
    mode = 'cancel';
    const pending = app.transcribe(media.id, 'cancel');
    app.cancel('cancel'); await assert.rejects(pending, /取消/);
    assert.deepEqual(app.get(media.id), media);
    assert.deepEqual(app.listVocabulary(), before);

    mode = 'success';
    db.exec("CREATE TRIGGER reject_replacement BEFORE INSERT ON segments BEGIN SELECT RAISE(ABORT, 'fixture save failure'); END");
    await assert.rejects(app.transcribe(media.id, 'save-failure'), /fixture save failure/);
    assert.deepEqual(app.get(media.id), media);
    assert.deepEqual(app.listVocabulary(), before);
    assert.deepEqual(db.prepare('SELECT * FROM vocabulary_positions ORDER BY context_id, start').all(), positions);
    assert.ok(db.prepare('SELECT * FROM translations WHERE segment_id = ?').get(media.segments[0].id));
    db.exec('DROP TRIGGER reject_replacement');

    // Even unchanged text replaces all old contexts for this material.
    const updated = await app.transcribe(media.id, 'replace');
    const after = before.map(entry => ({ ...entry, contexts: entry.contexts.filter(item => item.source.type !== 'media' || item.source.mediaId !== media.id) }));
    assert.deepEqual(app.listVocabulary(), after);
    assert.deepEqual(app.get(other.id), other);
    assert.deepEqual(app.openArtifact(story.id), story);
    for (const segmentId of [media.segments[0].id, 'historical']) {
      assert.equal(db.prepare('SELECT * FROM segments WHERE id = ?').get(segmentId), undefined);
    }
    for (const entry of before) for (const item of entry.contexts) {
      if (item.source.type === 'media' && item.source.mediaId === media.id) {
        assert.equal(db.prepare('SELECT * FROM vocabulary_positions WHERE context_id = ?').get(item.id), undefined);
      }
    }
    assert.equal(db.prepare('SELECT * FROM translations WHERE segment_id = ?').get(media.segments[0].id), undefined);
    assert.equal(db.prepare('SELECT count(*) AS count FROM vocabulary_positions').get()!.count, 2);
    assert.throws(() => app.saveVocabulary({ lemma: friend.lemma, meaningZh: friend.meaningZh, context: context(media, '친구', 0) }), /原句已更新/);

    db.close(); db = undefined;
    app.close(); app = new DesktopOperations(library, processor, generator);
    assert.deepEqual(app.listVocabulary(), after);
    const edited = app.saveVocabulary({ id: friend.id, lemma: friend.lemma, meaningZh: friend.meaningZh });
    assert.deepEqual(edited, after.find(entry => entry.id === friend.id));
    assert.equal(edited.selected, true);
    const generated = await app.generateArtifact([friend.id], '', 'source-less', 'fixture-key');
    assert.deepEqual(generated.targets, [{ id: friend.id, lemma: friend.lemma, meaningZh: friend.meaningZh }]);
    const collected = app.saveVocabulary({ lemma: friend.lemma, meaningZh: friend.meaningZh, context: context(updated, '친구', 0) });
    assert.equal(collected.id, friend.id); assert.equal(collected.selected, true);
    assert.equal(collected.contexts.length, 1);
    assert.deepEqual(collected.contexts[0].source, context(updated, '친구', 0).source);
    assert.equal(app.listVocabulary().length, before.length);
  } finally { db?.close(); app.close(); await rm(root, { recursive: true, force: true }); }
});

test('existing vocabulary rows gain language identity without losing historical provenance', async () => {
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
  const mediaRows = previous.prepare('SELECT * FROM vocabulary_sources').all();
  const artifactRows = previous.prepare('SELECT * FROM artifact_vocabulary_sources').all();
  previous.close();

  const processor = async () => { throw new Error('Reading contexts must not process media'); };
  let app = new DesktopOperations(root, processor);
  try {
    const entries = app.listVocabulary();
    assert.deepEqual(entries, [
      { id: 'manual', language: 'ko', lemma: '배', meaningZh: '船', selected: false, contexts: [] },
      { id: 'entry', language: 'ko', lemma: '그대로', meaningZh: '就那样', selected: true, contexts: [
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
    const corrected = app.saveVocabulary({ id: 'entry', language: 'ko', lemma: '그대로', meaningZh: '保持原样' });
    assert.equal(corrected.selected, true);
    assert.deepEqual(corrected.contexts, entries[1].contexts);
    const extended = app.saveVocabulary({ lemma: corrected.lemma, meaningZh: corrected.meaningZh,
      context: { ...entries[1].contexts[1], surface: '그냥' } });
    assert.equal(extended.id, 'entry');
    assert.equal(extended.contexts.length, 3);
    assert.deepEqual(extended.contexts.slice(0, 2), entries[1].contexts);
    const expected = app.listVocabulary();
    app.close(); app = new DesktopOperations(root, processor);
    assert.deepEqual(app.listVocabulary(), expected);
    assert.deepEqual(app.openArtifact('artifact'), { ...artifact, language: 'ko', id: 'artifact' });
    assert.equal(app.get('media').segments.length, 0);
    assert.equal(app.get('media').missing, true);
    const stored = new DatabaseSync(filename);
    try {
      assert.deepEqual(stored.prepare('PRAGMA foreign_key_check').all(), []);
      assert.deepEqual(stored.prepare('SELECT * FROM vocabulary_sources').all(), mediaRows);
      assert.deepEqual(stored.prepare('SELECT * FROM artifact_vocabulary_sources LIMIT 1').all(), artifactRows);
      assert.equal(stored.prepare('SELECT COUNT(*) AS count FROM artifact_vocabulary_sources').get()!.count, 2);
    } finally { stored.close(); }
  } finally { app.close(); await rm(root, { recursive: true, force: true }); }
});

test('notes and collected positions survive edits, recollection and restart; deletion is atomic and preserves stories', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'inflow vocabulary notes '));
  const processor = async (mode: string) => mode === 'probe' ? { duration: 2 }
    : { segments: [{ start: 0, end: 2, text: '배가 배에 있어요.', groups: ['배가 배에 있어요.'] }] };
  const generator: typeof generatePassage = async input => ({ title: '배 이야기', requestedModel: 'deepseek-flash',
    sentences: [{ parts: [{ text: '배', targetId: input.targets[0].id }], translationZh: '船' }] });
  let app = new DesktopOperations(root, processor, generator);
  let db: DatabaseSync | undefined;
  try {
    const filename = path.join(root, 'sample.wav'); await writeFile(filename, 'fixture');
    const media = await app.transcribe((await app.importMedia(filename)).id, 'seed');
    const context = { surface: '배', sentence: media.segments[0].text, surfaceStart: 3,
      source: { type: 'media', mediaId: media.id, segmentId: media.segments[0].id, name: media.name, start: 0 } as const };
    const word = app.saveVocabulary({ lemma: '배', meaningZh: '船', note: 'Remember this sense.\nNot the stomach.', context });
    assert.deepEqual(word.contexts[0].surfaceStarts, [3]);
    const collected = app.saveVocabulary({ lemma: word.lemma, meaningZh: word.meaningZh, context: { ...context, surfaceStart: 0 } });
    assert.equal(collected.note, word.note);
    assert.equal(collected.contexts.length, 1);
    assert.deepEqual(collected.contexts[0].surfaceStarts, [0, 3]);
    assert.equal(app.saveVocabulary({ id: word.id, lemma: word.lemma, meaningZh: '船只' }).note, word.note);
    for (const note of ['x'.repeat(2001), 'bad\0note', 123]) {
      assert.throws(() => app.saveVocabulary({ id: word.id, lemma: word.lemma, meaningZh: '船只', note: note as string }), /备注/);
    }
    const other = app.saveVocabulary({ lemma: '친구', meaningZh: '朋友' });
    app.selectVocabulary([word.id, other.id]);
    const story = await app.generateArtifact([word.id], '', 'story', 'fixture');
    app.saveVocabulary({ lemma: word.lemma, meaningZh: '船只', context: { surface: '배', surfaceStart: 0, sentence: '배',
      source: { type: 'artifact', artifactId: story.id, sentenceIndex: 0, name: story.title } } });
    app.close(); app = new DesktopOperations(root, processor, generator);
    const before = app.listVocabulary();
    assert.equal(before.find(entry => entry.id === word.id)!.note, word.note);
    assert.deepEqual(before.find(entry => entry.id === word.id)!.contexts.map(item => item.surfaceStarts), [[0, 3], [0]]);
    db = new DatabaseSync(path.join(root, 'learning.sqlite'));
    const positions = db.prepare('SELECT * FROM vocabulary_positions ORDER BY context_id, start').all();
    db.exec("CREATE TRIGGER reject_word_delete BEFORE DELETE ON vocabulary BEGIN SELECT RAISE(ABORT, 'fixture delete failure'); END");
    assert.throws(() => app.deleteVocabulary(word.id), /fixture delete failure/);
    assert.deepEqual(app.listVocabulary(), before);
    assert.deepEqual(db.prepare('SELECT * FROM vocabulary_positions ORDER BY context_id, start').all(), positions);
    db.exec('DROP TRIGGER reject_word_delete');
    assert.throws(() => app.deleteVocabulary('missing'), /不存在/);
    assert.throws(() => app.deleteVocabulary(null as unknown as string), /编号/);
    app.deleteVocabulary(word.id);
    assert.deepEqual(app.listVocabulary(), before.filter(entry => entry.id !== word.id));
    assert.equal(db.prepare('SELECT count(*) AS count FROM vocabulary_positions').get()!.count, 0);
    assert.deepEqual(db.prepare('PRAGMA foreign_key_check').all(), []);
    assert.deepEqual(app.get(media.id), media);
    assert.deepEqual(app.openArtifact(story.id), story);
    db.close(); db = undefined;
    app.close(); app = new DesktopOperations(root, processor, generator);
    assert.deepEqual(app.openArtifact(story.id), story);
    assert.deepEqual(app.listVocabulary(), before.filter(entry => entry.id !== word.id));
    assert.equal(app.saveVocabulary({ id: other.id, lemma: other.lemma, meaningZh: other.meaningZh, note: 'temporary' }).note, 'temporary');
    assert.equal(app.saveVocabulary({ id: other.id, lemma: other.lemma, meaningZh: other.meaningZh, note: '' }).note, undefined);
  } finally { db?.close(); app.close(); await rm(root, { recursive: true, force: true }); }
});
