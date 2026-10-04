import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translateSentence, glossVocabulary } from './translation';

test('cloud translation sends context but returns only the requested Chinese field without reasoning', async () => {
  const requests: Record<string, unknown>[] = [];
  const fetcher: typeof fetch = async (_url, options) => {
    const request = JSON.parse(String(options?.body)); requests.push(request);
    const result = requests.length === 1 ? { translation: '昨天和朋友见面了。' } : { meaningZh: '见面' };
    return Response.json({ id: 'fixture', status: 'completed', output: [{ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: JSON.stringify(result) }] }] });
  };
  const options = { apiKey: 'test-only', fetcher };
  assert.equal(await translateSentence({ language: 'ko', text: '어제 친구를 만났어요.', previous: '친구가 왔어요.', next: '즐거웠어요.' }, options), '昨天和朋友见面了。');
  assert.equal(await glossVocabulary({ language: 'ko', surface: '만났어요', sentence: '어제 친구를 만났어요.', start: 7, lemma: '만나다', candidates: ['见面', '遇见'] }, options), '见面');
  assert.deepEqual(requests.map(request => request.reasoning), [{ effort: 'none' }, { effort: 'none' }]);
  assert.ok(JSON.parse(String(requests[0].input)).previous.includes('친구'));
  assert.equal(JSON.parse(String(requests[1].input)).start, 7);
  assert.notEqual(requests[0].max_output_tokens, requests[1].max_output_tokens);
  await assert.rejects(translateSentence({ language: 'ko', text: '안녕' }, { apiKey: '' }), /key/i);
  await assert.rejects(glossVocabulary({ language: 'ko', surface: '만났어요', sentence: '어제 친구를 만났어요.', start: 0, lemma: '만나다', candidates: [] }, options));
});

test('English translation and gloss requests use English prompts and return Chinese results', async () => {
  const requests: Record<string, unknown>[] = [];
  const fetcher: typeof fetch = async (_url, options) => {
    const request = JSON.parse(String(options?.body)) as Record<string, unknown>;
    requests.push(request);
    const result = requests.length === 1 ? { translation: '孩子们正在玩。' } : { meaningZh: '孩子' };
    return Response.json({ id: 'fixture-en', status: 'completed', output: [{ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: JSON.stringify(result) }] }] });
  };
  const options = { apiKey: 'test-only', fetcher };

  assert.equal(await translateSentence({ language: 'en', text: 'The children are playing.', previous: 'It is sunny.', next: 'They are laughing.' }, options), '孩子们正在玩。');
  assert.equal(await glossVocabulary({ language: 'en', surface: 'children', sentence: 'The children are playing.', start: 4, lemma: 'child', candidates: ['孩子', '儿童'] }, options), '孩子');

  assert.match(String(requests[0].instructions), /English into natural Simplified Chinese/i);
  assert.match(String(requests[1].instructions), /selected English word/i);
  assert.deepEqual(JSON.parse(String(requests[0].input)), {
    language: 'en', text: 'The children are playing.', previous: 'It is sunny.', next: 'They are laughing.',
  });
  assert.equal(JSON.parse(String(requests[1].input)).language, 'en');
  assert.equal(requests[0].max_output_tokens, 2048);
  assert.equal(requests[1].max_output_tokens, 256);
});
