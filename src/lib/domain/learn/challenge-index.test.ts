import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isValidChallengeIndex,
  normalizeChallengeIndex,
} from './challenge-index';

test('challenge index validation accepts finite integers greater than or equal to 1', () => {
  assert.equal(isValidChallengeIndex(1), true);
  assert.equal(isValidChallengeIndex(11), true);

  assert.equal(isValidChallengeIndex(0), false);
  assert.equal(isValidChallengeIndex(1.5), false);
  assert.equal(isValidChallengeIndex(Number.POSITIVE_INFINITY), false);
  assert.equal(isValidChallengeIndex(Number.NaN), false);
  assert.equal(isValidChallengeIndex('7'), false);
});

test('challenge index normalization keeps only the lower bound', () => {
  assert.equal(normalizeChallengeIndex(12), 12);
  assert.equal(normalizeChallengeIndex(1), 1);
  assert.equal(normalizeChallengeIndex(0), 1);
  assert.equal(normalizeChallengeIndex(2.6), 3);
  assert.equal(normalizeChallengeIndex(Number.NaN, 3), 3);
});
