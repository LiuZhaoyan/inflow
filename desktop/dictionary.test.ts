import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dictionaryMeanings } from './dictionary';

test('the bundled KRDict snapshot provides actual Chinese senses and safe missing-word lookup', () => {
  assert.deepEqual(dictionaryMeanings('학생'), ['学生']);
  assert.ok(dictionaryMeanings('가다').includes('去'));
  assert.ok(dictionaryMeanings('배').includes('船'));
  assert.ok(dictionaryMeanings('배').includes('梨'));
  assert.ok(dictionaryMeanings('배').includes('肚子'));
  assert.deepEqual(dictionaryMeanings('constructor'), []);
  assert.deepEqual(dictionaryMeanings('not-in-the-dictionary'), []);
});
