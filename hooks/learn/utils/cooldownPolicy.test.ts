import test from 'node:test';
import assert from 'node:assert/strict';
import {
    computeCooldownAfter429,
    computeCooldownAfterSuccess,
    parseRetryAfterMs,
} from './cooldownPolicy';

test('parseRetryAfterMs parses seconds header into milliseconds', () => {
    assert.equal(parseRetryAfterMs('4', 10000), 4000);
});

test('parseRetryAfterMs falls back when header is missing or invalid', () => {
    assert.equal(parseRetryAfterMs(null, 10000), 10000);
    assert.equal(parseRetryAfterMs('abc', 10000), 10000);
    assert.equal(parseRetryAfterMs('0', 10000), 10000);
});

test('computeCooldownAfter429 respects base and max bounds', () => {
    const result = computeCooldownAfter429(4000, 9000, {
        baseMs: 4000,
        maxMs: 12000,
    });
    assert.equal(result, 9000);

    const bounded = computeCooldownAfter429(11000, 18000, {
        baseMs: 4000,
        maxMs: 12000,
    });
    assert.equal(bounded, 12000);
});

test('computeCooldownAfterSuccess decays after success window', () => {
    const noDecay = computeCooldownAfterSuccess({
        cooldownMs: 8000,
        successSince429: 1,
        baseMs: 4000,
        successWindowForDecay: 3,
        decayStepMs: 1000,
    });
    assert.deepEqual(noDecay, {
        cooldownMs: 8000,
        successSince429: 2,
    });

    const decayed = computeCooldownAfterSuccess({
        cooldownMs: 8000,
        successSince429: 2,
        baseMs: 4000,
        successWindowForDecay: 3,
        decayStepMs: 1000,
    });
    assert.deepEqual(decayed, {
        cooldownMs: 7000,
        successSince429: 0,
    });
});
