import { test } from 'node:test';
import assert from 'node:assert/strict';
import { compare, assess, restore, freshAttempt } from './practice';
import lesson from './lesson.json';

test('dictation ignores spacing and punctuation, but catches missing, extra and wrong Hangul', () => {
  assert.equal(compare('안녕 하세요!', '안녕하세요.').score, 100);
  assert.equal(compare('안녕하세요'.normalize('NFD'), '안녕하세요').score, 100);
  assert.equal(compare('', '안녕하세요').score, 0);
  assert.equal(compare('가다', '가나다').score, 67);
  assert.equal(compare('가나다라', '가나다').score, 75);
  assert.equal(compare('가마', '가나').score, 50);
});

test('self-report or a revealed answer alone cannot mark a segment independently mastered', () => {
  assert.equal(assess(100, 3, 'clear'), 'review');
  assert.equal(assess(60, 0, 'clear'), 'review');
  assert.equal(assess(100, 0, 'unclear'), 'review');
  assert.equal(assess(100, 0, 'clear'), 'independent');
});

test('malformed or foreign saved state does not break the lesson', () => {
  assert.equal(restore('{'), null);
  assert.equal(restore('{"version":1,"index":999,"items":{}}'), null);
  assert.equal(restore('null'), null);
  const valid = { version: 1, lesson: lesson.id, index: 0, phase: 'practice', impression: '少量词语', items: { p1: { ...freshAttempt(), text: '안녕', notes: '连音' } } };
  assert.deepEqual(restore(JSON.stringify(valid)), valid);
  assert.equal(restore(JSON.stringify({ ...valid, items: { p1: { ...freshAttempt(), hint: 99 } } })), null);
});

test('missing-character feedback does not reveal the answer before a hint', () => {
  assert.deepEqual(compare('가다', '가나다').parts, [
    { text: '가', kind: 'correct' }, { text: '□', kind: 'missing' }, { text: '다', kind: 'correct' },
  ]);
});

test('material segments form a complete ordered playable timeline', () => {
  let end = 0;
  const ids = new Set<string>();
  for (const s of lesson.segments) {
    assert.equal(s.start, end);
    assert.ok(s.end > s.start && s.end - s.start <= 15);
    assert.ok(s.text.trim() && s.translation.trim());
    assert.ok(!ids.has(s.id)); ids.add(s.id);
    end = s.end;
  }
  assert.equal(end, lesson.duration);
});
