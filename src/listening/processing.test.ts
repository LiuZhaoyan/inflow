import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isCompleteEnglishWord, validateSegments } from './processing';

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

test('sentence timing accepts touching boundaries and gaps but rejects even small overlaps', () => {
  const first = { start: 0, end: 1.5, text: 'Hello.', groups: ['Hello.'] };
  const second = { start: 1.5, end: 2, text: 'Goodbye.', groups: ['Goodbye.'] };
  assert.deepEqual(validateSegments([first, second]), [first, second]);
  assert.deepEqual(validateSegments([first, { ...second, start: 1.75 }]), [first, { ...second, start: 1.75 }]);
  for (const segment of [{ ...second, start: 1.499 }, { ...second, start: Infinity },
    { ...second, start: NaN }, { ...second, end: Infinity }, { ...second, end: 1.4 }]) {
    assert.throws(() => validateSegments([first, segment]));
  }
});

test('meaning groups ignore whitespace while preserving punctuation and word order', () => {
  const segment = { start: 0, end: 1, text: '오늘은\t날씨가 좋아요.', groups: ['오늘은\n', ' 날씨가\u00a0좋아요.'] };
  assert.deepEqual(validateSegments([segment]), [segment]);
  for (const groups of [['오늘은', '날씨가 좋아요'], ['날씨가 좋아요.', '오늘은'], ['오늘은', ' ', '날씨가 좋아요.'], ['오늘은', 1], null]) {
    assert.throws(() => validateSegments([{ ...segment, groups }]));
  }
});

test('processing enforces sentence count and text length limits inclusively', () => {
  const text = '가'.repeat(10000);
  const segments = Array.from({ length: 2000 }, (_, start) => ({ start, end: start + 1, text: '가', groups: ['가'] }));
  assert.equal(validateSegments(segments).length, 2000);
  assert.throws(() => validateSegments([...segments, { ...segments[0], start: 2000, end: 2001 }]));
  assert.equal(validateSegments([{ start: 0, end: 1, text, groups: [text] }])[0].text, text);
  for (const invalidText of [text + '가', '', ' \t', 123, null]) {
    assert.throws(() => validateSegments([{ start: 0, end: 1, text: invalidText, groups: [invalidText] }]));
  }
});

test('English selections preserve contractions, hyphens, possessives and quotation boundaries', () => {
  for (const word of ["don't", 'don’t', 'well-known', 'well‐known', 'well‑known', "teacher's", 'teachers’', 'cafe\u0301']) {
    const sentence = `Use ${word} here.`;
    assert.equal(isCompleteEnglishWord(sentence, word, 4), true, word);
    assert.equal(isCompleteEnglishWord(sentence, word.slice(0, -1), 4), false, word);
  }
  for (const sentence of ["'dogs' run.", '‘dogs’ run.']) {
    assert.equal(isCompleteEnglishWord(sentence, 'dogs', 1), true);
    assert.equal(isCompleteEnglishWord(sentence, sentence.slice(1, 6), 1), false);
  }
  assert.equal(isCompleteEnglishWord("dogs' toys", "dogs'", 0), true);
  assert.equal(isCompleteEnglishWord("dogs' toys", 'dogs', 0), false);
  assert.equal(isCompleteEnglishWord('walking', 'walk', 0), false);
});

test('English selection offsets identify repeated occurrences using UTF-16 positions', () => {
  const sentence = '😀 walk walker walk.';
  assert.equal(isCompleteEnglishWord(sentence, 'walk'), true);
  assert.equal(isCompleteEnglishWord(sentence, 'walk', 3), true);
  assert.equal(isCompleteEnglishWord(sentence, 'walk', 15), true);
  assert.equal(isCompleteEnglishWord(sentence, 'walk', 8), false);
  assert.equal(isCompleteEnglishWord(sentence, 'walk', 2), false);
  assert.equal(isCompleteEnglishWord(sentence, 'Walk', 3), false);
});
