import { test } from 'node:test';
import assert from 'node:assert/strict';
import { validateSegments } from './processing';

test('processing accepts ordered timed sentences with lossless meaning groups', () => {
  const segments = [{ start: 0.2, end: 2, text: '오늘은 날씨가 좋아요.', groups: ['오늘은', '날씨가 좋아요.'] }];
  assert.deepEqual(validateSegments(segments), segments);
});

test('processing rejects empty, overlapping, invalid timing and changed text', () => {
  const segment = { start: 0, end: 2, text: '안녕하세요.', groups: ['안녕하세요.'] };
  for (const invalid of [null, [], [{}], [{ ...segment, start: -1 }], [{ ...segment, end: NaN }], [{ ...segment, end: 0 }], [segment, segment], [{ ...segment, groups: [] }], [{ ...segment, groups: ['다른 문장'] }]]) {
    assert.throws(() => validateSegments(invalid));
  }
});
