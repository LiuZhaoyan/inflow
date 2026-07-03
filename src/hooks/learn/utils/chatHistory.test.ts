import test from 'node:test';
import assert from 'node:assert/strict';
import { deriveCurrentSentence } from './chatHistory';

test('deriveCurrentSentence returns latest AI sentence message', () => {
    const result = deriveCurrentSentence([
        { id: 'u1', role: 'user', content: 'hello' },
        { id: 'a1', role: 'ai', content: 'Old sentence', messageType: 'sentence' },
        { id: 'a2', role: 'ai', content: 'Latest sentence', messageType: 'sentence' },
    ]);

    assert.deepEqual(result, {
        sentence: 'Latest sentence',
        messageId: 'a2',
    });
});

test('deriveCurrentSentence falls back to originalSentence when latest row is explanation', () => {
    const result = deriveCurrentSentence([
        { id: 'a1', role: 'ai', content: 'Explanation', originalSentence: 'Base sentence' },
    ]);

    assert.deepEqual(result, {
        sentence: 'Base sentence',
        messageId: null,
    });
});

test('deriveCurrentSentence returns empty defaults when no usable sentence exists', () => {
    const result = deriveCurrentSentence([
        { id: 'u1', role: 'user', content: 'Only user content' },
        { id: 'a1', role: 'ai', content: '   ', messageType: 'sentence' },
    ]);

    assert.deepEqual(result, {
        sentence: '',
        messageId: null,
    });
});
