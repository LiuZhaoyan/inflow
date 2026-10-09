import { test } from 'node:test';
import assert from 'node:assert/strict';
import { GenerationError, generatePassage, requestStructuredOutput, validatePassage } from './index';

test('a single JSON code fence is accepted without relaxing passage validation', async () => {
  const passage = { title: '인사', sentences: [{ parts: [{ text: '안녕하세요.', targetId: 'greeting' }], translationZh: '你好。' }] };
  const input = { targets: [{ id: 'greeting', lemma: '안녕하다', meaningZh: '你好' }] };
  const generate = (text: string) => generatePassage(input, {
    apiKey: 'fixture-secret',
    fetcher: async () => Response.json({ id: 'resp-fenced', status: 'completed', output: [{
      type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text }],
    }] }),
  });
  const fenced = '```json\n' + JSON.stringify(passage) + '\n```';
  assert.deepEqual((await generate(fenced)).sentences, passage.sentences);
  for (const text of [
    'Commentary\n' + fenced,
    '```json\nnot JSON\n```',
    fenced.replace('"greeting"', '"unknown"'),
    '```json\n' + JSON.stringify({ ...passage, audio: 'unexpected' }) + '\n```',
  ]) {
    await assert.rejects(generate(text), (error: unknown) => error instanceof GenerationError && error.code === 'invalid_response');
  }
});

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

const target = { id: 'walk', lemma: 'walk', meaningZh: '散步' };
const passage = { title: 'A walk', sentences: [{ parts: [{ text: 'We ', targetId: null }, { text: 'walk.', targetId: 'walk' }], translationZh: '我们散步。' }] };
const completedResponse = (text: string) => ({ id: 'regression-response', status: 'completed', output: [{
  type: 'message', role: 'assistant', status: 'completed', content: [{ type: 'output_text', text }],
}] });
const hasCode = (code: GenerationError['code']) => (error: unknown) => error instanceof GenerationError && error.code === code;

test('generation enforces unique IDs, required text and field limits before contacting the provider', async () => {
  let requests = 0;
  const options = { apiKey: 'test-only', fetcher: async () => { requests += 1; return Response.json(completedResponse(JSON.stringify(passage))); } };
  for (const fields of [{ id: '' }, { id: ' ' }, { id: 'a\0b' }, { id: 'a'.repeat(129) },
    { lemma: 'a'.repeat(101) }, { lemma: 'a\0b' }, { meaningZh: '' }, { meaningZh: '词'.repeat(301) },
    { meaningZh: 'a\0b' }, { sourceSentence: 'a'.repeat(1001) }]) {
    await assert.rejects(generatePassage({ targets: [{ ...target, ...fields }] }, options), hasCode('invalid_input'));
  }
  await assert.rejects(generatePassage({ targets: [target, target] }, options), hasCode('invalid_input'));
  await assert.rejects(generatePassage({ targets: [target], topic: 'a'.repeat(201) }, options), hasCode('invalid_input'));
  const escapedContext = Array.from({ length: 20 }, (_, id) => ({ ...target, id: String(id), sourceSentence: '\u0001'.repeat(1000) }));
  await assert.rejects(generatePassage({ targets: escapedContext }, options), hasCode('invalid_input'));
  assert.equal(requests, 0);
});

test('generation accepts maximum field lengths and target count while trimming the topic', async () => {
  const targets = Array.from({ length: 20 }, (_, index) => ({ id: String(index).padEnd(128, 'x'),
    lemma: 'a'.repeat(100), meaningZh: '词'.repeat(300), sourceSentence: 'a'.repeat(1000) }));
  const expected = { title: 'All words', sentences: [{ parts: targets.map(item => ({ text: item.lemma, targetId: item.id })), translationZh: '所有词。' }] };
  const result = await generatePassage({ targets, topic: '  ' + 'a'.repeat(196) + '  ' }, {
    apiKey: 'test-only', fetcher: async (_url, init) => {
      const body = JSON.parse(String(init?.body));
      assert.equal(body.text.format.name, 'korean_learning_passage');
      assert.deepEqual(JSON.parse(body.input), { targets, topic: 'a'.repeat(196) });
      return Response.json(completedResponse(JSON.stringify(expected)));
    },
  });
  assert.deepEqual(result.sentences, expected.sentences);
});

test('passage validation preserves ordered repeated targets and requires every selected ID across sentences', () => {
  const targets = [target, { id: 'run', lemma: 'run', meaningZh: '跑步' }];
  const second = { parts: [{ text: 'Then run and ', targetId: 'run' }, { text: 'walk.', targetId: 'walk' }], translationZh: '然后跑步和散步。' };
  const value = { ...passage, sentences: [...passage.sentences, second] };
  assert.deepEqual(validatePassage(value, targets), value);
  assert.throws(() => validatePassage(passage, targets), hasCode('invalid_response'));
});

test('passage validation rejects malformed nested fields even when a selected target is present', () => {
  const sentence = passage.sentences[0];
  const markedPart = sentence.parts[1];
  for (const value of [null, [], { ...passage, title: ' ' }, { ...passage, title: 'a\0b' }, { ...passage, sentences: [] },
    ...[{ ...sentence, translationZh: '' }, { ...sentence, translationZh: 'a\0b' }, { ...sentence, parts: [] },
      { ...sentence, audio: 'extra' }, { ...sentence, parts: [{ ...markedPart, annotation: 'extra' }] },
      { ...sentence, parts: [{ ...markedPart, text: 'a\0b' }] }, { ...sentence, parts: [{ text: 'walk.' }] },
      { ...sentence, parts: [{ ...markedPart, targetId: '' }] }].map(item => ({ ...passage, sentences: [item] }))]) {
    assert.throws(() => validatePassage(value, [target]), hasCode('invalid_response'));
  }
});

test('generation joins only completed assistant output text and discards invalid usage metadata', async () => {
  const text = JSON.stringify(passage);
  const response = completedResponse(text);
  response.output[0].content = [{ type: 'output_text', text: text.slice(0, 30) }, { type: 'refusal', text: 'not JSON' }, { type: 'output_text', text: text.slice(30) }];
  response.output.unshift(
    { ...response.output[0], role: 'user', content: [{ type: 'output_text', text: 'not JSON' }] },
    { ...response.output[0], status: 'in_progress', content: [{ type: 'output_text', text: 'not JSON' }] },
    { ...response.output[0], type: 'reasoning', content: [{ type: 'output_text', text: 'not JSON' }] },
  );
  for (const usage of [{ input_tokens: -1, output_tokens: 2, total_tokens: 1 },
    { input_tokens: 1.5, output_tokens: 2, total_tokens: 3.5 }, { input_tokens: '1', output_tokens: 2, total_tokens: 3 },
    { input_tokens: 1, output_tokens: 2 }, { input_tokens: 0, output_tokens: 0, total_tokens: 0 }]) {
    const result = await generatePassage({ targets: [target] }, { apiKey: 'test-only', fetcher: async () => Response.json({ ...response, usage }) });
    assert.deepEqual(result.sentences, passage.sentences);
    assert.equal(result.responseId, response.id);
    if (usage.input_tokens === 0) assert.deepEqual(result.usage, { inputTokens: 0, outputTokens: 0, totalTokens: 0 });
    else assert.equal(result.usage, undefined);
  }
});

test('generation rejects unreadable envelopes, missing completed text and invalid UTF-8', async () => {
  const response = completedResponse(JSON.stringify(passage));
  for (const [body, code] of [[{ ...response, id: '' }, 'incomplete'], [{ ...response, output: [] }, 'invalid_response'],
    [{ ...response, output: [{ ...response.output[0], status: 'in_progress' }] }, 'invalid_response'],
    [{ ...response, output: [{ ...response.output[0], role: 'user' }] }, 'invalid_response']] as const) {
    await assert.rejects(generatePassage({ targets: [target] }, { apiKey: 'test-only', fetcher: async () => Response.json(body) }), hasCode(code));
  }
  const invalidUtf8 = new TextEncoder().encode(JSON.stringify(completedResponse(JSON.stringify({ ...passage, title: 'INVALID_UTF8' }))));
  invalidUtf8[invalidUtf8.indexOf('I'.charCodeAt(0))] = 0xff;
  for (const body of ['not JSON', invalidUtf8]) {
    await assert.rejects(generatePassage({ targets: [target] }, { apiKey: 'test-only', fetcher: async () => new Response(body) }), hasCode('invalid_response'));
  }
});

test('generation classifies remaining provider errors and network failures without leaking secrets', async () => {
  for (const [status, code] of [[403, 'unauthorized'], [402, 'quota'], [503, 'service'], [400, 'request']] as const) {
    await assert.rejects(generatePassage({ targets: [target] }, { apiKey: 'test-only', fetcher: async () => new Response('private body', { status }) }), (error: unknown) => {
      assert.ok(error instanceof GenerationError);
      assert.equal(error.code, code);
      assert.doesNotMatch(error.message, /private body|test-only/);
      return true;
    });
  }
  await assert.rejects(generatePassage({ targets: [target] }, { apiKey: 'test-only', fetcher: async () => { throw new Error('private connection details'); } }), hasCode('network'));
});

test('already canceled generation preserves the caller reason and never contacts the provider', async () => {
  const reason = new Error('User stopped generation');
  let requests = 0;
  await assert.rejects(generatePassage({ targets: [target] }, { apiKey: 'test-only', signal: AbortSignal.abort(reason),
    fetcher: async () => { requests += 1; return Response.json({}); } }), (error: unknown) => error === reason);
  assert.equal(requests, 0);
});

test('structured output times out while reading a stalled body and cancels the stream', async (t) => {
  // AbortSignal.timeout uses an unreferenced timer; keep the test alive until it fires.
  const keepAlive = setTimeout(() => {}, 2000);
  t.after(() => clearTimeout(keepAlive));
  let cancelled = false;
  await assert.rejects(requestStructuredOutput({ model: 'deepseek-flash', instructions: 'Return JSON', payload: '{}',
    schema: {}, name: 'timeout', maxOutputTokens: 10, timeoutMs: 10 }, {
    apiKey: 'test-only', fetcher: async () => new Response(new ReadableStream<Uint8Array>({ cancel() { cancelled = true; } })),
  }), hasCode('timeout'));
  assert.equal(cancelled, true);
});

test('generation accepts exactly one mebibyte with UTF-8 characters split between chunks', async () => {
  const bytes = new TextEncoder().encode(JSON.stringify(completedResponse(JSON.stringify(passage))));
  const body = new Uint8Array(1_048_576).fill(32);
  body.set(bytes);
  const split = bytes.findIndex(byte => byte >= 0x80) + 1;
  assert.ok(split > 0);
  const result = await generatePassage({ targets: [target] }, { apiKey: 'test-only', fetcher: async () => new Response(new ReadableStream({
    start(stream) { stream.enqueue(body.slice(0, split)); stream.enqueue(body.slice(split)); stream.close(); },
  }), { headers: { 'content-length': String(body.length) } }) });
  assert.deepEqual(result.sentences, passage.sentences);
});
