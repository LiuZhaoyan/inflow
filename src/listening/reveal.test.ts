import { test } from 'node:test';
import assert from 'node:assert/strict';
import { revealedGroupCount } from './reveal';

test('reveal choices expose complete groups and keep more inclusive', () => {
  const groups = ['안녕하십니까?', '네,', '안녕하십니까?'];
  assert.equal(revealedGroupCount(groups, 'little'), 1);
  assert.equal(revealedGroupCount(groups, 'more'), 2);
  assert.equal(revealedGroupCount(groups, 'all'), 3);
  assert.deepEqual(groups.slice(0, revealedGroupCount(groups, 'more')), ['안녕하십니까?', '네,']);
});

test('more reveals at least two groups when available', () => {
  assert.equal(revealedGroupCount(['a', 'b', 'c', 'd'], 'more'), 3);
  assert.equal(revealedGroupCount(['a', 'b'], 'more'), 2);
  assert.equal(revealedGroupCount(['a'], 'more'), 1);
});
