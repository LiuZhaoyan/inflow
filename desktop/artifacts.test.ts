import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { DesktopOperations } from './operations';
import { generatePassage, GenerationError } from '../src/generation';
import type { SaveVocabularyInput } from '../src/listening/desktop';
import { DatabaseSync } from 'node:sqlite';

test('historical target stories provide one context per story without rewriting collected sources', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'inflow story contexts '));
  const processor = async () => { throw new Error('Reading stories must not process media'); };
  let app = new DesktopOperations(root, processor);
  try {
    const word = app.saveVocabulary({ language: 'en', lemma: 'walk', meaningZh: '步行' });
    const otherSense = app.saveVocabulary({ language: 'en', lemma: 'walk', meaningZh: '散步' });
    const story = { language: 'en', title: 'A walk', requestedModel: 'deepseek-flash',
      createdAt: '2026-10-01T00:00:00.000Z', elapsedMs: 10,
      targets: [{ id: word.id, lemma: word.lemma, meaningZh: word.meaningZh }], sentences: [
        { parts: [{ text: 'It is morning.', targetId: null }], translationZh: '早上了。' },
        { parts: [{ text: 'I ', targetId: null }, { text: 'walk', targetId: word.id }, { text: ' then ', targetId: null }, { text: 'walk', targetId: word.id }, { text: ' home.', targetId: null }], translationZh: '我走路然后走回家。' },
        { parts: [{ text: 'We ', targetId: null }, { text: 'walk', targetId: word.id }, { text: ' again.', targetId: null }], translationZh: '我们再次走路。' },
      ] };
    const db = new DatabaseSync(path.join(root, 'learning.sqlite'));
    try {
      db.prepare('INSERT INTO artifacts VALUES (?, ?)').run('historical-story', JSON.stringify(story));
      db.prepare('INSERT INTO artifacts VALUES (?, ?)').run('another-story', JSON.stringify({ ...story, title: 'Another walk' }));
    } finally { db.close(); }
    const contexts = app.listVocabulary().find(entry => entry.id === word.id)!.contexts;
    assert.equal(contexts.length, 2);
    assert.deepEqual(contexts[0], { id: contexts[0].id, surface: 'walk', sentence: 'I walk then walk home.', surfaceStarts: [2, 12],
      source: { type: 'artifact', artifactId: 'historical-story', sentenceIndex: 1, name: story.title } });
    assert.deepEqual(app.listVocabulary().find(entry => entry.id === otherSense.id)!.contexts, []);
    const collected = app.saveVocabulary({ id: word.id, language: 'en', lemma: word.lemma, meaningZh: word.meaningZh,
      context: { surface: 'walk', surfaceStart: 3, sentence: 'We walk again.',
        source: { type: 'artifact', artifactId: 'historical-story', sentenceIndex: 2, name: story.title } } });
    assert.deepEqual(collected.contexts, contexts);
    const lookup = await app.lookupVocabulary({ language: 'en', lemma: 'walk', surface: 'walk', sentence: 'We walk again.', start: 3,
      source: { type: 'artifact', artifactId: 'historical-story', sentenceIndex: 2, name: story.title } }, 'lookup');
    assert.equal(lookup.meaningZh, word.meaningZh);
    const edited = app.saveVocabulary({ id: word.id, language: 'en', lemma: 'stroll', meaningZh: '慢走' });
    assert.deepEqual(edited.contexts, contexts);
    assert.deepEqual(app.openArtifact('historical-story').targets, story.targets);
    app.close(); app = new DesktopOperations(root, processor);
    assert.deepEqual(app.listVocabulary().find(entry => entry.id === word.id), edited);
    app.deleteVocabulary(word.id);
    const replacement = app.saveVocabulary({ language: 'en', lemma: 'walk', meaningZh: '步行' });
    assert.deepEqual(replacement.contexts, []);
    assert.deepEqual(app.openArtifact('historical-story').targets, story.targets);
    const stored = new DatabaseSync(path.join(root, 'learning.sqlite'));
    try { assert.equal(stored.prepare('SELECT count(*) AS count FROM artifact_vocabulary_sources').get()!.count, 0); }
    finally { stored.close(); }
  } finally { app.close(); await rm(root, { recursive: true, force: true }); }
});

test('two artifact cycles preserve snapshots and source relationships across failure, retry and restart', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'inflow artifacts 韩语 '));
  let mode = 'valid';
  let release: (() => void) | undefined;
  const generator: typeof generatePassage = async (input, options) => {
    if (mode === 'cancel') await new Promise<void>(resolve => { release = resolve; });
    return generatePassage(input, { ...options, fetcher: async (_url, init) => {
      const body = JSON.parse(String(init!.body));
      const requested = JSON.parse(body.input);
      assert.deepEqual(requested.targets, input.targets);
      if (mode === '401' || mode === '429') return new Response('secret-provider-body', { status: Number(mode) });
      if (mode === 'incomplete') return Response.json({ id: 'partial', status: 'incomplete', output: [] });
      if (mode === 'malformed') return new Response('not JSON');
      const targetId = mode === 'unknown' ? 'unknown' : mode === 'missing' ? null : input.targets[0].id;
      const parts = input.targets[0].lemma === '친구'
        ? [{ text: '친구', targetId }, { text: '와 공원을 걸었어요.', targetId: null }]
        : [{ text: '친구와 공원을 ', targetId: null }, { text: '걸었어요.', targetId }];
      const passage = { title: '공원에서', sentences: [{ parts, translationZh: '和朋友走过公园。' }] };
      return Response.json({ id: 'response-fixture', status: 'completed', model: 'fixture',
        output: [{ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: JSON.stringify(passage) }] }],
        usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 } });
    } });
  };
  const processor = async (mode: string) => mode === 'probe' ? { duration: 10 } : ({ segments: [{ start: 0, end: 2, text: '매일 공원을 걸어요.', groups: ['매일 공원을', '걸어요.'] }] });
  let app = new DesktopOperations(root, processor, generator);
  try {
    const file = path.join(root, 'video.webm'); await writeFile(file, 'fixture');
    const media = await app.transcribe((await app.importMedia(file)).id, 'process');
    const walk = app.saveVocabulary({ lemma: '걷다', meaningZh: '走路', context: { surface: '걸어요', sentence: media.segments[0].text,
      source: { type: 'media', mediaId: media.id, segmentId: media.segments[0].id, name: media.name, start: media.segments[0].start } } });
    app.selectVocabulary([walk.id]);
    const first = await app.generateArtifact([walk.id], '', 'first', 'fixture-secret');
    assert.equal(first.sentences[0].parts[1].text, '걸었어요.');
    assert.equal(first.sentences[0].parts[1].targetId, walk.id);
    assert.equal(first.targets[0].sourceSentence, media.segments[0].text);
    assert.equal(first.topic, undefined); assert.deepEqual(first.usage, { inputTokens: 10, outputTokens: 20, totalTokens: 30 });
    const context: NonNullable<SaveVocabularyInput['context']> = { surface: '친구', sentence: 'untrusted sentence',
      source: { type: 'artifact', artifactId: first.id, sentenceIndex: 0, name: 'untrusted title' } };
    assert.throws(() => app.saveVocabulary({ lemma: '친구', meaningZh: '朋友', context: { ...context, surface: 'absent' } }), /不属于/);
    assert.throws(() => app.saveVocabulary({ lemma: '친구', meaningZh: '朋友', context: { ...context, source: { type: 'artifact', artifactId: first.id, sentenceIndex: -1, name: first.title } } }), /编号/);
    const friend = app.saveVocabulary({ lemma: '친구', meaningZh: '朋友', context });
    assert.deepEqual(friend.contexts[0], { id: friend.contexts[0].id, surface: '친구', sentence: '친구와 공원을 걸었어요.',
      source: { type: 'artifact', artifactId: first.id, sentenceIndex: 0, name: first.title } });
    assert.equal(app.saveVocabulary({ lemma: '친구', meaningZh: '朋友', context }).contexts.length, 1);
    app.saveVocabulary({ id: walk.id, lemma: '걷다', meaningZh: '步行' });
    assert.equal(app.openArtifact(first.id).targets[0].meaningZh, '走路');
    app.selectVocabulary([friend.id]);
    const second = await app.generateArtifact([friend.id], '朋友的一天', 'second', 'fixture-secret');
    assert.notEqual(first.id, second.id); assert.equal(second.topic, '朋友的一天');
    assert.equal(second.targets[0].sourceSentence, friend.contexts[0].sentence);
    const saved = app.listArtifacts(), vocabulary = app.listVocabulary();
    for (mode of ['401', '429', 'incomplete', 'unknown', 'missing', 'malformed']) {
      await assert.rejects(app.generateArtifact([friend.id], '', 'failure', 'fixture-secret'), error => error instanceof GenerationError);
      assert.deepEqual(app.listArtifacts(), saved); assert.deepEqual(app.listVocabulary(), vocabulary);
      assert.equal(app.restoreArtifact()!.id, second.id);
    }
    await assert.rejects(app.generateArtifact([], '', 'empty', 'fixture-secret'));
    await assert.rejects(app.generateArtifact(['unknown'], '', 'unknown', 'fixture-secret'));
    await assert.rejects(app.generateArtifact([friend.id], '', 'no-key', ''));
    mode = 'cancel';
    const canceled = app.generateArtifact([friend.id], '', 'cancel', 'fixture-secret');
    app.cancel('cancel'); release!(); await assert.rejects(canceled);
    assert.deepEqual(app.listArtifacts(), saved); assert.deepEqual(app.listVocabulary(), vocabulary);
    mode = 'valid';
    const retry = await app.generateArtifact([friend.id], '', 'retry', 'fixture-secret');
    assert.notEqual(retry.id, second.id); assert.equal(app.listArtifacts().length, 3);
    const afterRetry = app.listVocabulary();
    assert.equal(afterRetry.find(entry => entry.id === friend.id)!.contexts.length, vocabulary.find(entry => entry.id === friend.id)!.contexts.length + 1);
    app.openArtifact(first.id);
    const all = app.listArtifacts();
    app.close(); app = new DesktopOperations(root, processor, async () => { throw new Error('Reopening must not call the provider'); });
    assert.deepEqual(app.listArtifacts(), all); assert.equal(app.restoreArtifact()!.id, first.id);
    assert.deepEqual(app.listVocabulary(), afterRetry); assert.equal(app.get(media.id).segments.length, 1);
    assert.doesNotMatch((await readFile(path.join(root, 'learning.sqlite'))).toString(), /fixture-secret|secret-provider-body/);
  } finally { app.close(); await rm(root, { recursive: true, force: true }); }
});
