import test from 'node:test';
import assert from 'node:assert/strict';

type PerformanceModule = typeof import('./learn-chat-performance');

const {
  getLearnChatMaxTokens,
  scheduleMasteredSentenceTts,
} = await import(new URL('./learn-chat-performance.ts', import.meta.url).href) as PerformanceModule;

function createDeferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

test('getLearnChatMaxTokens uses short per-action limits for learn chat responses', () => {
  assert.equal(getLearnChatMaxTokens('init'), 150);
  assert.equal(getLearnChatMaxTokens('understand'), 150);
  assert.equal(getLearnChatMaxTokens('explain'), 200);
  assert.equal(getLearnChatMaxTokens('translate'), 100);
});

test('scheduleMasteredSentenceTts does not wait for TTS before returning', async () => {
  const tts = createDeferred<string>();
  const updates: Array<[string, string, string, string]> = [];
  let requestStarted = false;

  scheduleMasteredSentenceTts({
    sentenceId: 'sentence-1',
    sentence: '안녕하세요.',
    userId: 'user-1',
    languageCode: 'ko',
    requestId: 'request-1',
    endpoint: 'POST /api/learn-chat',
  }, {
    requestTtsPersistent: async (text, options, userId) => {
      requestStarted = true;
      assert.equal(text, '안녕하세요.');
      assert.deepEqual(options, { voiceId: 'audiobook_female_1', speed: 1.0 });
      assert.equal(userId, 'user-1');
      return tts.promise;
    },
    updateMasteredSentenceAudioPath: async (...args) => {
      updates.push(args);
    },
    warn: () => {
      throw new Error('warn should not be called on successful TTS');
    },
  });

  assert.equal(requestStarted, true);
  assert.deepEqual(updates, []);

  tts.resolve('/audio/sentence-1.mp3');
  await tts.promise;
  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.deepEqual(updates, [[
    'sentence-1',
    '/audio/sentence-1.mp3',
    'user-1',
    'ko',
  ]]);
});

test('scheduleMasteredSentenceTts logs failed background TTS without throwing', async () => {
  const warnings: Array<[string, Record<string, unknown>]> = [];

  assert.doesNotThrow(() => {
    scheduleMasteredSentenceTts({
      sentenceId: 'sentence-2',
      sentence: 'こんにちは。',
      userId: 'user-2',
      languageCode: 'ja',
      requestId: 'request-2',
      endpoint: 'POST /api/learn-chat',
    }, {
      requestTtsPersistent: async () => {
        throw new Error('tts failed');
      },
      updateMasteredSentenceAudioPath: async () => {
        throw new Error('audio path should not be updated on failed TTS');
      },
      warn: (message, meta) => {
        warnings.push([message, meta]);
      },
    });
  });

  await new Promise((resolve) => setTimeout(resolve, 0));

  assert.equal(warnings.length, 1);
  assert.equal(warnings[0][0], 'Auto-TTS failed for mastered sentence');
  assert.deepEqual(warnings[0][1], {
    requestId: 'request-2',
    userId: 'user-2',
    endpoint: 'POST /api/learn-chat',
  });
});
