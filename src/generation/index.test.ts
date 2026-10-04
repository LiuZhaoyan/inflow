import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GenerationError, generatePassage } from './index';

test('generation sends selected word context and returns a completed text passage', async () => {
  let requestBody: Record<string, unknown> | undefined;
  const result = await generatePassage({
    targets: [{ id: 'walk-1', lemma: '걷다', meaningZh: '走路', sourceSentence: '매일 공원을 걷는다.' }],
    topic: '주말 산책',
  }, {
    apiKey: 'fixture-secret',
    fetcher: async (input, init) => {
      assert.equal(String(input), 'https://api.deepseek.com/responses');
      assert.equal(new Headers(init?.headers).get('authorization'), 'Bearer fixture-secret');
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json({
        id: 'resp-1',
        model: 'DeepSeek-V4.1-Flash',
        status: 'completed',
        output: [{
          type: 'message',
          role: 'assistant',
          status: 'completed',
          content: [{
            type: 'output_text',
            text: JSON.stringify({
              title: '주말 산책',
              sentences: [{
                parts: [{ text: '친구와 공원을 ', targetId: null }, { text: '걸었다.', targetId: 'walk-1' }],
                translationZh: '我和朋友在公园散步了。',
              }],
            }),
          }],
        }],
        usage: { input_tokens: 31, output_tokens: 22, total_tokens: 53 },
      });
    },
  });

  assert.equal(requestBody?.model, 'deepseek-flash');
  assert.equal(requestBody?.max_output_tokens, 4096);
  assert.equal((requestBody?.reasoning as { effort: string }).effort, 'none');
  assert.equal(((requestBody?.text as { format: { type: string } }).format).type, 'json_schema');
  const userInput = JSON.parse(String(requestBody?.input)) as { targets: unknown[]; topic: string };
  assert.deepEqual(userInput.targets, [{ id: 'walk-1', lemma: '걷다', meaningZh: '走路', sourceSentence: '매일 공원을 걷는다.' }]);
  assert.equal(userInput.topic, '주말 산책');
  assert.deepEqual(result, {
    title: '주말 산책',
    sentences: [{
      parts: [{ text: '친구와 공원을 ', targetId: null }, { text: '걸었다.', targetId: 'walk-1' }],
      translationZh: '我和朋友在公园散步了。',
    }],
    requestedModel: 'deepseek-flash',
    model: 'DeepSeek-V4.1-Flash',
    responseId: 'resp-1',
    usage: { inputTokens: 31, outputTokens: 22, totalTokens: 53 },
  });
  assert.doesNotMatch(JSON.stringify(result), /fixture-secret/);
});

test('generation uses English for English targets while preserving Chinese meaning and translations', async () => {
  let requestBody: Record<string, unknown> | undefined;
  const result = await generatePassage({
    language: 'en',
    targets: [{ id: 'walk-1', lemma: 'walk', meaningZh: '散步', sourceSentence: 'We walk in the park.' }],
    topic: 'A weekend walk',
  }, {
    apiKey: 'fixture-secret',
    fetcher: async (_input, init) => {
      requestBody = JSON.parse(String(init?.body)) as Record<string, unknown>;
      return Response.json({
        id: 'resp-en-1',
        status: 'completed',
        output: [{
          type: 'message',
          role: 'assistant',
          status: 'completed',
          content: [{
            type: 'output_text',
            text: JSON.stringify({
              title: 'A Walk in the Park',
              sentences: [{
                parts: [{ text: 'We ', targetId: null }, { text: 'walked through the park.', targetId: 'walk-1' }],
                translationZh: '我们在公园里散步。',
              }],
            }),
          }],
        }],
      });
    },
  });

  assert.equal(((requestBody?.text as { format: { name: string } }).format).name, 'english_learning_passage');
  assert.match(String(requestBody?.instructions), /English/i);
  assert.match(String(requestBody?.instructions), /Chinese/i);
  assert.deepEqual(JSON.parse(String(requestBody?.input)), {
    targets: [{ id: 'walk-1', lemma: 'walk', meaningZh: '散步', sourceSentence: 'We walk in the park.' }],
    topic: 'A weekend walk',
  });
  assert.deepEqual(result.sentences[0], {
    parts: [{ text: 'We ', targetId: null }, { text: 'walked through the park.', targetId: 'walk-1' }],
    translationZh: '我们在公园里散步。',
  });
});

test('generation rejects unknown or omitted targets, malformed text, and non-text fields', async () => {
  const input = { targets: [{ id: 'walk-1', lemma: '걷다', meaningZh: '走路' }] };
  const invalidPassages = [
    { title: '산책', sentences: [{ parts: [{ text: '걸었다.', targetId: 'unknown' }], translationZh: '散步了。' }] },
    { title: '산책', sentences: [{ parts: [{ text: '걸었다.', targetId: null }], translationZh: '散步了。' }] },
    { title: '산책', sentences: [{ parts: [{ text: '  ', targetId: 'walk-1' }], translationZh: '散步了。' }] },
    { title: '산책', sentences: [{ parts: [{ text: '걸었다.', targetId: 'walk-1' }], translationZh: '散步了。' }], audio: 'unexpected' },
  ];

  for (const passage of invalidPassages) {
    await assert.rejects(generatePassage(input, {
      apiKey: 'fixture-secret',
      fetcher: async () => Response.json({
        id: 'resp-invalid',
        model: 'deepseek-flash',
        status: 'completed',
        output: [{ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: JSON.stringify(passage) }] }],
      }),
    }), (error: unknown) => error instanceof GenerationError && error.code === 'invalid_response');
  }
});

test('generation rejects incomplete responses and bounds selected vocabulary before the request', async () => {
  let requestCount = 0;
  const input = { targets: [{ id: 'walk-1', lemma: '걷다', meaningZh: '走路' }] };
  const incompleteFetch = async () => {
    requestCount += 1;
    return Response.json({ id: 'resp-partial', status: 'incomplete', output: [] });
  };
  await assert.rejects(generatePassage(input, { apiKey: 'fixture-secret', fetcher: incompleteFetch }), (error: unknown) =>
    error instanceof GenerationError && error.code === 'incomplete');

  const tooManyTargets = { targets: Array.from({ length: 21 }, (_, index) => ({ id: String(index), lemma: '단어', meaningZh: '词' })) };
  await assert.rejects(generatePassage(tooManyTargets, { apiKey: 'fixture-secret', fetcher: incompleteFetch }), (error: unknown) =>
    error instanceof GenerationError && error.code === 'invalid_input');

  for (const invalidInput of [
    { language: 'fr', targets: [{ id: 'word-1', lemma: 'walk', meaningZh: '走路' }] } as never,
    { targets: [] },
    { targets: [{ id: 'word-1', lemma: '', meaningZh: '走路' }] },
  ]) {
    await assert.rejects(generatePassage(invalidInput, { apiKey: 'fixture-secret', fetcher: incompleteFetch }), (error: unknown) =>
      error instanceof GenerationError && error.code === 'invalid_input');
  }
  assert.equal(requestCount, 1);
});

test('provider authentication and quota errors are actionable without exposing response bodies', async () => {
  for (const [status, code, message] of [[401, 'unauthorized', /API key/i], [429, 'quota', /rate limit|quota/i]] as const) {
    await assert.rejects(generatePassage({ targets: [{ id: 'walk-1', lemma: '걷다', meaningZh: '走路' }] }, {
      apiKey: 'fixture-secret',
      fetcher: async () => new Response('private-provider-error-body', { status }),
    }), (error: unknown) => {
      assert.ok(error instanceof GenerationError);
      assert.equal(error.code, code);
      assert.match(error.message, message);
      assert.doesNotMatch(error.message, /private-provider-error-body|fixture-secret/);
      return true;
    });
  }
});

test('missing API key fails before the provider request', async () => {
  let requestCount = 0;
  await assert.rejects(generatePassage({ targets: [{ id: 'walk-1', lemma: '걷다', meaningZh: '走路' }] }, {
    apiKey: '  ',
    fetcher: async () => {
      requestCount += 1;
      return Response.json({});
    },
  }), (error: unknown) => error instanceof GenerationError && error.code === 'missing_key');
  assert.equal(requestCount, 0);
});

test('cancellation after response headers prevents a passage from being returned', async () => {
  const controller = new AbortController();
  const passage = {
    title: '산책',
    sentences: [{ parts: [{ text: '걸었다.', targetId: 'walk-1' }], translationZh: '散步了。' }],
  };
  let bodyTimer: ReturnType<typeof setTimeout> | undefined;
  const pending = generatePassage({ targets: [{ id: 'walk-1', lemma: '걷다', meaningZh: '走路' }] }, {
    apiKey: 'fixture-secret',
    signal: controller.signal,
    fetcher: async () => new Response(new ReadableStream({
      start(stream) {
        bodyTimer = setTimeout(() => {
          stream.enqueue(new TextEncoder().encode(JSON.stringify({
            id: 'resp-1',
            model: 'deepseek-flash',
            status: 'completed',
            output: [{ type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text: JSON.stringify(passage) }] }],
          })));
          stream.close();
        }, 100);
      },
      cancel() {
        if (bodyTimer) clearTimeout(bodyTimer);
      },
    }), { status: 200 }),
  });
  setTimeout(() => controller.abort(new DOMException('User canceled', 'AbortError')), 0);

  await assert.rejects(pending, (error: unknown) => error instanceof DOMException && error.name === 'AbortError');
});

test('generation cancels streamed provider responses above one mebibyte', async () => {
  let cancelled = false;
  let chunks = 0;
  const body = new ReadableStream<Uint8Array>({
    pull(stream) {
      chunks += 1;
      stream.enqueue(new Uint8Array(600_000));
    },
    cancel() {
      cancelled = true;
    },
  });

  await assert.rejects(generatePassage({ targets: [{ id: 'walk-1', lemma: '걷다', meaningZh: '走路' }] }, {
    apiKey: 'fixture-secret',
    fetcher: async () => new Response(body),
  }), (error: unknown) => error instanceof GenerationError && error.code === 'invalid_response');
  assert.equal(cancelled, true);
  assert.ok(chunks <= 3);
});

test('declared oversized responses release the provider stream', async () => {
  let cancelled = false;
  const body = new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } });
  await assert.rejects(generatePassage({ targets: [{ id: 'walk-1', lemma: '걷다', meaningZh: '走路' }] }, {
    apiKey: 'fixture-secret',
    fetcher: async () => new Response(body, { headers: { 'content-length': '1048577' } }),
  }), (error: unknown) => error instanceof GenerationError && error.code === 'invalid_response');
  assert.equal(cancelled, true);
});
