import test from 'node:test';
import assert from 'node:assert/strict';
import {
    buildLearnChatContextMessages,
    mapActionTexts,
} from './learnChatMessageProtocol';

test('mapActionTexts returns init display/model texts', () => {
    const result = mapActionTexts('init', '', 'Travel', 4);
    assert.equal(result.displayText, '');
    assert.match(result.modelText, /Start the session\./);
    assert.match(result.modelText, /Travel/);
    assert.match(result.modelText, /4\/10/);
});

test('mapActionTexts returns explain display/model texts', () => {
    const result = mapActionTexts('explain', 'Hola');
    assert.equal(result.displayText, 'Explain please');
    assert.equal(result.modelText, 'Explain this sentence: "Hola"');
});

test('mapActionTexts returns translate display/model texts', () => {
    const result = mapActionTexts('translate', 'Bonjour');
    assert.equal(result.displayText, 'Translate please');
    assert.equal(result.modelText, 'Translate this sentence: "Bonjour"');
});

test('mapActionTexts returns understand display/model texts', () => {
    const result = mapActionTexts('understand', 'Guten Tag');
    assert.equal(result.displayText, 'I got it!');
    assert.equal(
        result.modelText,
        'I understand this sentence: "Guten Tag". Give me the next one at the appropriate difficulty level.',
    );
});

test('buildLearnChatContextMessages keeps only AI followups for understand action', () => {
    const messages = buildLearnChatContextMessages('System prompt', [
        { role: 'user', content: 'Explain please', userAction: 'explain' },
        { role: 'ai', content: 'Explanation result' },
        { role: 'user', content: 'I got it!', userAction: 'understand' },
        { role: 'ai', content: 'Next sentence A' },
        { role: 'user', content: 'I got it!', userAction: 'understand' },
        { role: 'ai', content: 'Next sentence B' },
    ]);

    assert.deepEqual(messages, [
        { role: 'system', content: 'System prompt' },
        { role: 'assistant', content: 'Next sentence A' },
        { role: 'assistant', content: 'Next sentence B' },
    ]);
});
