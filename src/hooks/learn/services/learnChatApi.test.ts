import test from 'node:test';
import assert from 'node:assert/strict';
import {
    fetchChatHistory,
    fetchMasteredSentences,
    fetchPlacementStatus,
    fetchProfile,
    postLearnChatAction,
    postLearnFeedback,
    updateCurrentLanguageCode,
    type LearnChatApiError,
} from './learnChatApi';

const originalFetch = globalThis.fetch;

function mockFetch(handler: typeof fetch) {
    // node/test runs in-process; overwrite per test and restore in finally.
    globalThis.fetch = handler;
}

test('fetchProfile returns profile on success', async () => {
    mockFetch(async () => new Response(JSON.stringify({ profile: { id: 'u1', username: 'u', nativeLanguage: 'en', targetLanguage: 'ja', isOnboarded: true, createdAt: 1, updatedAt: 1 } }), { status: 200 }));
    try {
        const result = await fetchProfile();
        assert.equal(result?.id, 'u1');
        assert.equal(result?.targetLanguage, 'ja');
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('fetchPlacementStatus returns fallback when response is not ok', async () => {
    mockFetch(async () => new Response(null, { status: 500 }));
    try {
        const result = await fetchPlacementStatus();
        assert.deepEqual(result, { completed: false, level: 3 });
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('fetchMasteredSentences returns parsed sentences list', async () => {
    mockFetch(async () => new Response(JSON.stringify({ sentences: [{ id: 's1', content: 'hello', masteredAt: 1, difficultyLevel: 3 }] }), { status: 200 }));
    try {
        const result = await fetchMasteredSentences('ja');
        assert.equal(result.length, 1);
        assert.equal(result[0].id, 's1');
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('fetchChatHistory returns null when endpoint is not ok', async () => {
    mockFetch(async () => new Response(null, { status: 404 }));
    try {
        const result = await fetchChatHistory('ja', 'Daily Conversation');
        assert.equal(result, null);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('updateCurrentLanguageCode sends PUT payload', async () => {
    let called = false;
    mockFetch(async (input, init) => {
        called = true;
        assert.equal(String(input), '/api/user');
        assert.equal(init?.method, 'PUT');
        assert.ok(typeof init?.body === 'string');
        assert.equal(JSON.parse(String(init?.body)).currentLanguageCode, 'ko');
        return new Response(null, { status: 200 });
    });
    try {
        await updateCurrentLanguageCode('ko');
        assert.equal(called, true);
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('postLearnChatAction returns response on success', async () => {
    mockFetch(async () => new Response(JSON.stringify({ messageId: 'm1', response: 'ok', type: 'sentence' }), { status: 200 }));
    try {
        const result = await postLearnChatAction({
            action: 'init',
            currentSentence: '',
            messageId: null,
            languageCode: 'ja',
            context: 'Daily Conversation',
        });

        assert.equal(result.messageId, 'm1');
        assert.equal(result.response, 'ok');
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('postLearnChatAction throws LearnChatApiError with retryAfter on 429', async () => {
    mockFetch(async () => new Response(null, { status: 429, headers: { 'Retry-After': '0.001' } }));
    try {
        await assert.rejects(
            () => postLearnChatAction({
                action: 'translate',
                currentSentence: 'a',
                messageId: 'm1',
                languageCode: 'ja',
                context: 'Travel',
            }),
            (err: unknown) => {
                const apiErr = err as LearnChatApiError;
                assert.equal(apiErr.status, 429);
                assert.equal(apiErr.retryAfterMs, 1);
                return true;
            },
        );
    } finally {
        globalThis.fetch = originalFetch;
    }
});

test('postLearnFeedback sends lightweight comprehension feedback', async () => {
    let called = false;
    mockFetch(async (input, init) => {
        called = true;
        assert.equal(String(input), '/api/learn-feedback');
        assert.equal(init?.method, 'POST');
        assert.ok(typeof init?.body === 'string');
        assert.deepEqual(JSON.parse(String(init?.body)), {
            messageId: 'm1',
            sentence: 'hello',
            languageCode: 'ko',
            context: 'Daily Conversation',
            rating: 'just_right',
        });
        return new Response(JSON.stringify({
            learningProfileUpdated: true,
            difficulty: {
                level: 3,
                direction: 'maintain',
                performance: 'comfortable',
            },
        }), { status: 200 });
    });

    try {
        const result = await postLearnFeedback({
            messageId: 'm1',
            sentence: 'hello',
            languageCode: 'ko',
            context: 'Daily Conversation',
            rating: 'just_right',
        });

        assert.equal(called, true);
        assert.equal(result.learningProfileUpdated, true);
        assert.equal(result.difficulty?.performance, 'comfortable');
    } finally {
        globalThis.fetch = originalFetch;
    }
});
