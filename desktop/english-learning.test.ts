import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import { DesktopOperations } from './operations';
import type { generatePassage } from '../src/generation';
import type { SourceLanguage } from '../src/listening/desktop';

test('English and Korean imports keep their language and saved learning after restart', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'inflow English '));
  const file = path.join(root, 'sample.wav');
  const processor = async (mode: string, _signal: AbortSignal, _file?: string, _text?: unknown, language = 'ko') => mode === 'probe'
    ? { duration: 5 }
    : { segments: [{ start: 0, end: 2, text: language === 'en' ? 'After work, I met my friends.' : '친구를 만났어요.', groups: language === 'en' ? ['After work,', 'I met my friends.'] : ['친구를', '만났어요.'] }] };
  let app = new DesktopOperations(path.join(root, 'library'), processor);
  try {
    await writeFile(file, 'managed media fixture');
    const english = await app.transcribe((await app.importMedia(file, 'en')).id, 'english');
    assert.equal(english.language, 'en');
    assert.equal(english.segments[0].text, 'After work, I met my friends.');
    app.saveLearning(english.id, { ...english.learning, position: 1, mode: 'sentence', masks: { [english.segments[0].id]: [1] } });
    const korean = await app.transcribe((await app.importMedia(file, 'ko')).id, 'korean');
    assert.equal(korean.segments[0].text, '친구를 만났어요.');
    app.close(); app = new DesktopOperations(path.join(root, 'library'), processor);
    assert.equal(app.get(english.id).language, 'en');
    assert.deepEqual(app.get(english.id).learning.masks, { [english.segments[0].id]: [1] });
    assert.equal(app.get(korean.id).language, 'ko');
    assert.equal(app.list().length, 2);
  } finally { app.close(); await rm(root, { recursive: true, force: true }); }
});

test('English translations use confirmed language and preserve cached results across failure and restart', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'inflow English translation '));
  const requests: SourceLanguage[] = [], localRequests: SourceLanguage[] = [];
  let fail = false;
  const processor = async (mode: string, _signal: AbortSignal, _file?: string, _text?: unknown, language: SourceLanguage = 'ko') => {
    if (mode === 'probe') return { duration: 4 };
    if (mode === 'translate') { localRequests.push(language); return { translation: '本地参考译文' }; }
    return { segments: [{ start: 0, end: 2, text: 'I met my friends.', groups: ['I met', 'my friends.'] }, { start: 2, end: 4, text: 'We walked home.', groups: ['We walked home.'] }] };
  };
  const translator = async (input: { language: SourceLanguage; text: string; next?: string }) => {
    if (fail) throw new Error('offline');
    requests.push(input.language); assert.equal(input.next, 'We walked home.'); return input.language === 'en' ? '我见到了朋友。' : '韩语译文';
  };
  let app = new DesktopOperations(path.join(root, 'library'), processor, undefined, translator);
  try {
    const file = path.join(root, 'sample.wav'); await writeFile(file, 'fixture');
    const english = await app.transcribe((await app.importMedia(file, 'en')).id, 'en');
    const korean = await app.transcribe((await app.importMedia(file, 'ko')).id, 'ko');
    const enInput = { mediaId: english.id, segmentId: english.segments[0].id }, koInput = { mediaId: korean.id, segmentId: korean.segments[0].id };
    assert.equal(await app.translate(enInput, 'en-cloud', 'fixture'), '我见到了朋友。');
    assert.equal(await app.translate(koInput, 'ko-cloud', 'fixture'), '韩语译文');
    assert.deepEqual(requests, ['en', 'ko']);
    fail = true;
    await assert.rejects(app.translate(enInput, 'refresh', 'fixture', { refresh: true }), /offline/);
    assert.equal(await app.translate(enInput, 'cached', ''), '我见到了朋友。');
    assert.equal(await app.translate(enInput, 'explicit-local', '', { local: true }), '本地参考译文');
    assert.deepEqual(localRequests, ['en']);
    app.close(); app = new DesktopOperations(path.join(root, 'library'), processor, undefined, translator);
    assert.equal(await app.translate(enInput, 'reopen-en', ''), '本地参考译文');
    assert.equal(await app.translate(koInput, 'reopen-ko', ''), '韩语译文');
    assert.deepEqual(requests, ['en', 'ko']);
  } finally { app.close(); await rm(root, { recursive: true, force: true }); }
});

test('English Story supports two collection cycles and mixed targets fail before provider access', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'inflow English story '));
  let requests = 0;
  const generator: typeof generatePassage = async input => {
    requests++;
    assert.equal(input.language, 'en');
    return { title: 'A day outside', requestedModel: 'deepseek-flash', sentences: [{
      parts: input.targets.flatMap(target => [{ text: target.lemma, targetId: target.id }, { text: ' with friends. ', targetId: null }]), translationZh: '和朋友在一起。',
    }] };
  };
  let app = new DesktopOperations(root, async () => { throw new Error('No worker required'); }, generator);
  try {
    const walk = app.saveVocabulary({ language: 'en', lemma: 'walk', meaningZh: '步行' });
    const korean = app.saveVocabulary({ language: 'ko', lemma: '친구', meaningZh: '朋友' });
    app.selectVocabulary([walk.id, korean.id]);
    const before = app.listVocabulary();
    await assert.rejects(app.generateArtifact([walk.id, korean.id], '', 'mixed', 'fixture'), /语种|语言/);
    assert.equal(requests, 0); assert.deepEqual(app.listVocabulary(), before); assert.deepEqual(app.listArtifacts(), []);
    app.selectVocabulary([walk.id]);
    const first = await app.generateArtifact([walk.id], '', 'first', 'fixture');
    assert.equal(first.language, 'en'); assert.equal(first.sentences[0].translationZh, '和朋友在一起。');
    const friend = app.saveVocabulary({ language: 'en', lemma: 'friend', meaningZh: '朋友', context: {
      surface: 'friends', surfaceStart: 10, sentence: 'untrusted', source: { type: 'artifact', artifactId: first.id, sentenceIndex: 0, name: 'untrusted' },
    } });
    assert.equal(friend.contexts[0].sentence, 'walk with friends. ');
    app.saveVocabulary({ id: walk.id, lemma: 'walk', meaningZh: '散步' });
    assert.equal(app.openArtifact(first.id).targets[0].meaningZh, '步行');
    app.selectVocabulary([friend.id]);
    const second = await app.generateArtifact([friend.id], '朋友', 'second', 'fixture');
    assert.equal(second.language, 'en'); assert.equal(second.targets[0].sourceSentence, 'walk with friends. ');
    const all = app.listArtifacts(), notebook = app.listVocabulary();
    app.close(); app = new DesktopOperations(root, async () => { throw new Error('Offline'); }, async () => { throw new Error('Offline'); });
    assert.deepEqual(app.listArtifacts(), all); assert.deepEqual(app.listVocabulary(), notebook);
    assert.equal(app.restoreArtifact()!.id, second.id); assert.equal(app.openArtifact(first.id).language, 'en');
    assert.equal(app.listVocabulary().find(entry => entry.id === korean.id)!.language, 'ko');
  } finally { app.close(); await rm(root, { recursive: true, force: true }); }
});

test('the last successful import language is restored and invalid imports do not change it', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'inflow import language '));
  const file = path.join(root, 'sample.wav');
  let duration = 5;
  const processor = async () => ({ duration });
  let app = new DesktopOperations(path.join(root, 'library'), processor);
  try {
    await writeFile(file, 'media fixture');
    assert.equal(app.getImportLanguage(), 'ko');
    await app.importMedia(file, 'en');
    assert.equal(app.getImportLanguage(), 'en');
    duration = 601;
    await assert.rejects(app.importMedia(file, 'ko'), /10 分钟/);
    assert.equal(app.getImportLanguage(), 'en');
    app.close(); app = new DesktopOperations(path.join(root, 'library'), processor);
    assert.equal(app.getImportLanguage(), 'en');
    duration = 5;
    await app.importMedia(file, 'ko');
    assert.equal(app.getImportLanguage(), 'ko');
  } finally { app.close(); await rm(root, { recursive: true, force: true }); }
});

test('English collection preserves complete surfaces, normalizes apostrophes, and keeps language identity', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'inflow English words '));
  const sentence = "😀 The teacher’s children don't like well-known stories.";
  const processor = async (mode: string, _signal: AbortSignal, _file?: string, input?: unknown) => {
    if (mode === 'probe') return { duration: 5 };
    if (mode === 'lookup') return { ...(input as object), lemma: 'child' };
    return { segments: [{ start: 0, end: 3, text: sentence, groups: [sentence] }] };
  };
  const app = new DesktopOperations(path.join(root, 'library'), processor);
  try {
    const file = path.join(root, 'sample.wav'); await writeFile(file, 'fixture');
    const media = await app.transcribe((await app.importMedia(file, 'en')).id, 'transcribe');
    const source = { type: 'media' as const, mediaId: media.id, segmentId: media.segments[0].id, name: media.name, start: 0 };
    const input = { language: 'en' as const, sentence, surface: 'children', start: sentence.indexOf('children'), source };
    const lookup = await app.lookupVocabulary(input, 'lookup');
    assert.equal(lookup.lemma, 'child');
    assert.deepEqual(app.listVocabulary(), []);
    const context = { source, sentence: 'untrusted display text', surface: input.surface, surfaceStart: input.start };
    const child = app.saveVocabulary({ language: 'en', lemma: lookup.lemma, meaningZh: '孩子', context });
    assert.equal(child.contexts[0].sentence, sentence);
    assert.equal(app.saveVocabulary({ language: 'en', lemma: 'child', meaningZh: '孩子', context }).id, child.id);
    assert.notEqual(app.saveVocabulary({ language: 'en', lemma: 'child', meaningZh: '子代' }).id, child.id);
    assert.notEqual(app.saveVocabulary({ language: 'ko', lemma: 'child', meaningZh: '孩子' }).id, child.id);
    for (const surface of ["teacher’s", "don't", 'well-known']) {
      const start = sentence.indexOf(surface);
      const entry = app.saveVocabulary({ language: 'en', lemma: surface, meaningZh: '测试释义', context: { ...context, surface, surfaceStart: start } });
      assert.equal(entry.lemma, surface.replaceAll('’', "'"));
      assert.equal(entry.contexts[0].surface, surface);
    }
    for (const surface of ['child', 'don', 'known', 'children don\'t']) {
      const start = sentence.indexOf(surface);
      await assert.rejects(app.lookupVocabulary({ ...input, surface, start, lemma: 'corrected' }, 'partial'), /单词/);
      assert.throws(() => app.saveVocabulary({ language: 'en', lemma: 'corrected', meaningZh: '错误', context: { ...context, surface, surfaceStart: start } }), /单词/);
    }
    assert.throws(() => app.saveVocabulary({ id: child.id, language: 'ko', lemma: 'child', meaningZh: '孩子' }), /语种/);
    assert.throws(() => app.saveVocabulary({ language: 'ko', lemma: 'child', meaningZh: '孩子', context }), /语种/);
  } finally { app.close(); await rm(root, { recursive: true, force: true }); }
});
