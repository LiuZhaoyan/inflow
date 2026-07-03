import test from 'node:test';
import assert from 'node:assert/strict';
import { generateRequestId } from './requestId';

test('generateRequestId returns a non-empty string', () => {
    const id = generateRequestId();
    assert.equal(typeof id, 'string');
    assert.ok(id.length > 0);
});

test('generateRequestId returns different values across calls', () => {
    const id1 = generateRequestId();
    const id2 = generateRequestId();
    assert.notEqual(id1, id2);
});
