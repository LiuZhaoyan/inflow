import test from 'node:test';
import assert from 'node:assert/strict';
import { mapChatHistoryRowsToViewModel, mapLearnChatActionResponseToViewModel } from './learnChatMapper';

test('mapChatHistoryRowsToViewModel maps rows and derives sentence state', () => {
    const result = mapChatHistoryRowsToViewModel([
        { id: 'u1', role: 'user', content: 'Explain please', userAction: 'explain' },
        { id: 'a1', role: 'ai', content: 'An explanation', messageType: 'explanation' },
        { id: 'a2', role: 'ai', content: 'Latest sentence', messageType: 'sentence' },
    ]);

    assert.deepEqual(result.messages, [
        { id: 'u1', role: 'user', content: 'Explain please', userAction: 'explain' },
        { id: 'a1', role: 'ai', content: 'An explanation', userAction: 'explain', messageType: 'explanation' },
        { id: 'a2', role: 'ai', content: 'Latest sentence', messageType: 'sentence' },
    ]);
    assert.equal(result.currentSentence, 'Latest sentence');
    assert.equal(result.currentSentenceMessageId, 'a2');
});

test('mapLearnChatActionResponseToViewModel normalizes payload fields', () => {
    const result = mapLearnChatActionResponseToViewModel({
        messageId: 'm1',
        response: 'Hello',
        type: 'SENTENCE',
        original: 'origin',
        difficulty: {
            level: 5,
            direction: 'increase',
            performance: 'improving',
        },
    });

    assert.equal(result.aiMessageId, 'm1');
    assert.equal(result.response, 'Hello');
    assert.equal(result.normalizedType, 'sentence');
    assert.equal(result.originalSentence, 'origin');
    assert.deepEqual(result.difficulty, {
        level: 5,
        direction: 'increase',
        performance: 'improving',
    });
});

test('mapLearnChatActionResponseToViewModel falls back on malformed fields', () => {
    const result = mapLearnChatActionResponseToViewModel({
        messageId: 123,
        response: null,
        type: 42,
        original: false,
        difficulty: {
            level: 'bad',
            direction: 'invalid',
            performance: 99,
        },
    });

    assert.equal(typeof result.aiMessageId, 'string');
    assert.ok(result.aiMessageId.length > 0);
    assert.equal(result.response, '');
    assert.equal(result.normalizedType, '');
    assert.equal(result.originalSentence, undefined);
    assert.deepEqual(result.difficulty, {
        level: undefined,
        direction: undefined,
        performance: undefined,
    });
});
