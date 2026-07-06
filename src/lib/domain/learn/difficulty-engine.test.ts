import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildPersonalizationPrompt,
  calculateDifficultyContext,
  computeNewDifficultyLevel,
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

test('computeNewDifficultyLevel can rise above 10 and never falls below 1', () => {
  const easyOnce = updateLearningProfileFromFeedback(DEFAULT_LEARNING_PROFILE, 'too_easy', 'easy');
  const easyTwice = updateLearningProfileFromFeedback(easyOnce, 'too_easy', 'easy again');
  const increaseCtx = calculateDifficultyContext(
    { ...DEFAULT_PROGRESS, currentDifficultyLevel: 10 },
    easyTwice,
  );

  assert.equal(computeNewDifficultyLevel(10, increaseCtx), 11);

  const hardProfile = updateLearningProfileFromFeedback(
    DEFAULT_LEARNING_PROFILE,
    'too_hard',
    'This one is hard',
  );
  const decreaseCtx = calculateDifficultyContext(
    { ...DEFAULT_PROGRESS, currentDifficultyLevel: 1 },
    hardProfile,
  );

  assert.equal(computeNewDifficultyLevel(1, decreaseCtx), 1);
});

test('difficulty only increases after stable positive feedback', () => {
  const tooEasyOnce = updateLearningProfileFromFeedback(DEFAULT_LEARNING_PROFILE, 'too_easy', 'easy');
  const tooEasyTwice = updateLearningProfileFromFeedback(tooEasyOnce, 'too_easy', 'still easy');

  assert.equal(calculateDifficultyContext(DEFAULT_PROGRESS, tooEasyOnce).direction, 'maintain');
  assert.equal(calculateDifficultyContext(DEFAULT_PROGRESS, tooEasyTwice).direction, 'increase');

  const understoodOnce = updateLearningProfileFromAction(
    DEFAULT_LEARNING_PROFILE,
    'understand',
    'I understood this.',
  );
  const understoodTwice = updateLearningProfileFromAction(
    understoodOnce,
    'understand',
    'I understood this too.',
  );
  const understoodThrice = updateLearningProfileFromAction(
    understoodTwice,
    'understand',
    'Still clear.',
  );

  assert.equal(calculateDifficultyContext(DEFAULT_PROGRESS, understoodOnce).direction, 'maintain');
  assert.equal(calculateDifficultyContext(DEFAULT_PROGRESS, understoodThrice).direction, 'increase');
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
  assert.equal(prompt.includes('/10'), false);
  assert.equal(prompt.includes('Level 7-10'), false);
  assert.equal(prompt.includes('grammarStatus'), false);
  assert.equal(prompt.includes('totalStudyTimeMs'), false);
});
