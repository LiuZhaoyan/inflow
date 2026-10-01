import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { mkdtemp, writeFile, rm, mkdir } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { DesktopOperations } from './operations';

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
  const processor = async () => ({ segments: result });
  let app = new DesktopOperations(library, processor);
  try {
    assert.equal(app.restore()!.segments[0].id, 'existing-segment');
    assert.equal(app.restore()!.segments[0].text, oldSegment.text);
    const file = path.join(root, '视频.webm');
    await writeFile(file, 'deterministic media fixture');
    const imported = await app.importMedia(file);
    const media = await app.transcribe(imported.id, 'initial');
    const firstSource = { segmentId: media.segments[0].id, surface: '걸렸어요' };
    assert.throws(() => app.saveVocabulary({ lemma: '', meaningZh: '花费时间' }));
    assert.throws(() => app.saveVocabulary({ lemma: '걸리다', meaningZh: '花费时间', source: { ...firstSource, surface: 'unknown word' } }), /不属于/);
    assert.throws(() => app.saveVocabulary({ lemma: '걸리다', meaningZh: '花费时间', source: { ...firstSource, segmentId: 'unknown' } }), /原句已更新/);
    assert.deepEqual(app.listVocabulary(), []);

    const first = app.saveVocabulary({ lemma: '걸리다'.normalize('NFD'), meaningZh: '花费时间', source: firstSource });
    assert.equal(first.lemma, '걸리다');
    assert.equal(first.sources[0].surface, '걸렸어요');
    assert.equal(first.sources[0].sentence, result[0].text);
    assert.equal(first.sources[0].mediaId, media.id);
    assert.equal(first.sources[0].mediaName, '视频.webm');
    const again = app.saveVocabulary({ lemma: '걸리다', meaningZh: '花费时间', source: { segmentId: media.segments[1].id, surface: '걸렸어요' } });
    assert.equal(again.id, first.id); assert.equal(again.sources.length, 2);
    assert.deepEqual(again.sources[0], first.sources[0]);
    assert.equal(app.saveVocabulary({ lemma: '걸리다', meaningZh: '花费时间', source: firstSource }).sources.length, 2);
    const illness = app.saveVocabulary({ lemma: '걸리다', meaningZh: '患病', source: { segmentId: media.segments[2].id, surface: '걸렸어요' } });
    assert.notEqual(illness.id, first.id);
    const manual = app.saveVocabulary({ lemma: '배', meaningZh: '船' });
    assert.deepEqual(manual.sources, []);
    app.selectVocabulary([first.id, manual.id]);
    const corrected = app.saveVocabulary({ id: first.id, lemma: '걸리다', meaningZh: '需要（时间）' });
    assert.equal(corrected.selected, true); assert.deepEqual(corrected.sources, again.sources);
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
