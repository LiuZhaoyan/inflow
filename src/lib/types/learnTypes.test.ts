import test from 'node:test';
import assert from 'node:assert/strict';
import {
  normalizeLearningProfile,
} from './learnTypes';

test('normalizeLearningProfile migrates legacy weakVocabulary and removes deprecated fields', () => {
  const profile = normalizeLearningProfile({
    weakVocabulary: {
      hello: 2,
      world: 1,
    },
    grammarStatus: {
      general: -1,
    },
    totalStudyTimeMs: 12345,
    learningPace: 'fast',
  });

  assert.equal(profile.schemaVersion, 2);
  assert.equal(profile.learningPace, 'fast');
  assert.deepEqual(profile.supportTerms.map((item) => [item.term, item.score, item.source]), [
    ['hello', 2, 'legacy'],
    ['world', 1, 'legacy'],
  ]);
  assert.equal('grammarStatus' in profile, false);
  assert.equal('totalStudyTimeMs' in profile, false);
});

test('normalizeLearningProfile limits support terms and comprehension window', () => {
  const supportTerms = Array.from({ length: 30 }, (_, index) => ({
    term: `term-${index}`,
    score: index,
    lastSeenAt: index,
    source: 'explain',
  }));
  const window = Array.from({ length: 20 }, (_, index) => ({
    rating: index % 2 === 0 ? 'too_hard' : 'just_right',
    at: index,
  }));

  const profile = normalizeLearningProfile({
    supportTerms,
    recentComprehension: {
      window,
      tooHardStreak: 1,
      tooEasyStreak: 0,
      justRightStreak: 0,
    },
  });

  assert.equal(profile.supportTerms.length, 24);
  assert.equal(profile.supportTerms[0].term, 'term-29');
  assert.equal(profile.recentComprehension.window.length, 12);
  assert.equal(profile.recentComprehension.window[0].at, 8);
});
