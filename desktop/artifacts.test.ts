import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { DesktopOperations } from './operations';
import { generatePassage, GenerationError } from '../src/generation';

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
  const processor = async () => ({ segments: [{ start: 0, end: 2, text: '매일 공원을 걸어요.', groups: ['매일 공원을', '걸어요.'] }] });
  let app = new DesktopOperations(root, processor, generator);
  try {
    const file = path.join(root, 'video.webm'); await writeFile(file, 'fixture');
    const media = await app.transcribe((await app.importMedia(file)).id, 'process');
    const walk = app.saveVocabulary({ lemma: '걷다', meaningZh: '走路', source: { segmentId: media.segments[0].id, surface: '걸어요' } });
    app.selectVocabulary([walk.id]);
    const first = await app.generateArtifact([walk.id], '', 'first', 'fixture-secret');
    assert.equal(first.sentences[0].parts[1].text, '걸었어요.');
    assert.equal(first.sentences[0].parts[1].targetId, walk.id);
    assert.equal(first.targets[0].sourceSentence, media.segments[0].text);
    assert.equal(first.topic, undefined); assert.deepEqual(first.usage, { inputTokens: 10, outputTokens: 20, totalTokens: 30 });
    assert.throws(() => app.saveVocabulary({ lemma: '친구', meaningZh: '朋友', source: { artifactId: first.id, sentenceIndex: 0, surface: 'absent' } }), /不属于/);
    assert.throws(() => app.saveVocabulary({ lemma: '친구', meaningZh: '朋友', source: { artifactId: first.id, sentenceIndex: -1, surface: '친구' } }), /编号/);
    const friend = app.saveVocabulary({ lemma: '친구', meaningZh: '朋友', source: { artifactId: first.id, sentenceIndex: 0, surface: '친구' } });
    assert.deepEqual({ ...friend.sources[0] }, { id: friend.sources[0].id, artifactId: first.id, artifactTitle: first.title, sentenceIndex: 0, surface: '친구', sentence: '친구와 공원을 걸었어요.' });
    assert.equal(app.saveVocabulary({ lemma: '친구', meaningZh: '朋友', source: { artifactId: first.id, sentenceIndex: 0, surface: '친구' } }).sources.length, 1);
    app.saveVocabulary({ id: walk.id, lemma: '걷다', meaningZh: '步行' });
    assert.equal(app.openArtifact(first.id).targets[0].meaningZh, '走路');
    app.selectVocabulary([friend.id]);
    const second = await app.generateArtifact([friend.id], '朋友的一天', 'second', 'fixture-secret');
    assert.notEqual(first.id, second.id); assert.equal(second.topic, '朋友的一天');
    assert.equal(second.targets[0].sourceSentence, friend.sources[0].sentence);
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
    app.openArtifact(first.id);
    const all = app.listArtifacts();
    app.close(); app = new DesktopOperations(root, processor, async () => { throw new Error('Reopening must not call the provider'); });
    assert.deepEqual(app.listArtifacts(), all); assert.equal(app.restoreArtifact()!.id, first.id);
    assert.deepEqual(app.listVocabulary(), vocabulary); assert.equal(app.get(media.id).segments.length, 1);
    assert.doesNotMatch((await readFile(path.join(root, 'learning.sqlite'))).toString(), /fixture-secret|secret-provider-body/);
  } finally { app.close(); await rm(root, { recursive: true, force: true }); }
});
