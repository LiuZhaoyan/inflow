import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translateSentence, glossVocabulary } from './translation';
import { GenerationError } from '../generation';

const invalidInput = (error: unknown) => error instanceof GenerationError && error.code === 'invalid_input';

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

test('gloss preserves the exact UTF-16 occurrence and rejects mismatched vocabulary context before requesting', async () => {
  const input = { language: 'en' as const, surface: 'walk', sentence: '😀 walk walk.', start: 8, lemma: 'walk', candidates: [] };
  let requests = 0;
  const options = { apiKey: 'test-only', fetcher: async (_url: string | URL | Request, init?: RequestInit) => {
    requests += 1;
    assert.deepEqual(JSON.parse(JSON.parse(String(init?.body)).input), input);
    return Response.json({ id: 'gloss-offset', status: 'completed', output: [{ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: '{"meaningZh":" 散步 "}' }] }] });
  } };
  assert.equal(await glossVocabulary(input, options), '散步');
  for (const fields of [{ start: 2 }, { start: -1 }, { start: 8.5 }, { start: 100 }, { surface: 'run' },
    { surface: 'walk walk' }, { lemma: 'to walk' }, { candidates: [''] }, { candidates: ['词'.repeat(301)] },
    { candidates: Array(101).fill('词') }]) {
    await assert.rejects(glossVocabulary({ ...input, ...fields }, options), invalidInput);
  }
  assert.equal(requests, 1);
});

test('sentence translation rejects empty, oversized and NUL-containing context before requesting', async () => {
  let requests = 0;
  const options = { apiKey: 'test-only', fetcher: async () => { requests += 1; return Response.json({}); } };
  for (const fields of [{ text: '' }, { text: ' \t' }, { text: 'a\0b' }, { text: 'a'.repeat(10001) },
    { previous: '' }, { previous: 'a'.repeat(10001) }, { next: 'a\0b' }, { next: 'a'.repeat(10001) }]) {
    await assert.rejects(translateSentence({ language: 'en', text: 'Hello.', ...fields }, options), invalidInput);
  }
  assert.equal(requests, 0);
});

test('translation and gloss reject extra fields and invalid output instead of accepting partial results', async () => {
  for (const field of ['translation', 'meaningZh'] as const) {
    const limit = field === 'translation' ? 10000 : 300;
    for (const value of [{ [field]: '正确', commentary: 'extra' }, { [field]: '' }, { [field]: ' \t' },
      { [field]: 'a\0b' }, { [field]: '词'.repeat(limit + 1) }, { [field]: 123 }, {}, []]) {
      const options = { apiKey: 'test-only', fetcher: async () => Response.json({ id: 'invalid-translation', status: 'completed', output: [{ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: JSON.stringify(value) }] }] }) };
      const pending = field === 'translation'
        ? translateSentence({ language: 'en', text: 'Hello.' }, options)
        : glossVocabulary({ language: 'en', surface: 'Hello', sentence: 'Hello.', start: 0, lemma: 'hello', candidates: [] }, options);
      await assert.rejects(pending, (error: unknown) => error instanceof GenerationError && error.code === 'invalid_response');
    }
  }
});

test('translation and gloss accept exact text and dictionary limits', async () => {
  const options = { apiKey: 'test-only', fetcher: async (_url: string | URL | Request, init?: RequestInit) => {
    const field = JSON.parse(String(init?.body)).text.format.name as 'translation' | 'meaningZh';
    return Response.json({ id: 'limits', status: 'completed', output: [{ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: JSON.stringify({ [field]: '词'.repeat(field === 'translation' ? 10000 : 300) }) }] }] });
  } };
  const sentence = 'a'.repeat(10000);
  assert.equal((await translateSentence({ language: 'en', text: sentence, previous: sentence, next: sentence }, options)).length, 10000);
  assert.equal((await glossVocabulary({ language: 'en', surface: 'a'.repeat(100), lemma: 'a'.repeat(100), sentence, start: 0,
    candidates: Array(100).fill('词'.repeat(300)) }, options)).length, 300);
});
