import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPersonalizationPrompt,
  calculateDifficultyContext,
  updateLearningProfileFromAction,
  updateLearningProfileFromFeedback,
} from './difficulty-engine';
import {
  DEFAULT_LEARNING_PROFILE,
} from '../../types/learnTypes';
import {
  DEFAULT_PROGRESS,
} from '../../types/progress';

test('updateLearningProfileFromFeedback records short-window feedback and support terms', () => {
  const profile = updateLearningProfileFromFeedback(
    DEFAULT_LEARNING_PROFILE,
    'too_hard',
    'I need a subway ticket',
  );

  assert.equal(profile.recentComprehension.window.length, 1);
  assert.equal(profile.recentComprehension.tooHardStreak, 1);
  assert.equal(profile.recentComprehension.tooEasyStreak, 0);
  assert.equal(profile.supportTerms.some((item) => item.term === 'subway' && item.source === 'too_hard'), true);
});

test('updateLearningProfileFromAction tracks explain terms without grammar status', () => {
  const profile = updateLearningProfileFromAction(
    DEFAULT_LEARNING_PROFILE,
    'explain',
    'The train arrives soon',
  );

  assert.equal(profile.supportTerms.some((item) => item.term === 'train' && item.source === 'explain'), true);
  assert.equal('grammarStatus' in profile, false);
});

test('calculateDifficultyContext lets lightweight feedback affect direction', () => {
  const hardProfile = updateLearningProfileFromFeedback(
    DEFAULT_LEARNING_PROFILE,
    'too_hard',
    'This one is hard',
  );
  const easyOnce = updateLearningProfileFromFeedback(DEFAULT_LEARNING_PROFILE, 'too_easy', 'easy');
  const easyTwice = updateLearningProfileFromFeedback(easyOnce, 'too_easy', 'easy again');

  assert.equal(calculateDifficultyContext(DEFAULT_PROGRESS, hardProfile).direction, 'decrease');
  assert.equal(calculateDifficultyContext(DEFAULT_PROGRESS, easyOnce).direction, 'maintain');
  assert.equal(calculateDifficultyContext(DEFAULT_PROGRESS, easyTwice).direction, 'increase');
});

test('buildPersonalizationPrompt summarizes known input without deprecated fields', () => {
  const profile = updateLearningProfileFromFeedback(
    DEFAULT_LEARNING_PROFILE,
    'too_hard',
    'airport gate',
  );
  const ctx = calculateDifficultyContext(DEFAULT_PROGRESS, profile);
  const prompt = buildPersonalizationPrompt(ctx, {
    vocabularyTerms: ['ticket', 'gate'],
    masteredSentences: ['I have a ticket.'],
  });

  assert.match(prompt, /KNOWN INPUT BASE/);
  assert.match(prompt, /ticket, gate/);
  assert.match(prompt, /I have a ticket/);
  assert.match(prompt, /I\+1 CONTRACT/);
  assert.equal(prompt.includes('grammarStatus'), false);
  assert.equal(prompt.includes('totalStudyTimeMs'), false);
});
