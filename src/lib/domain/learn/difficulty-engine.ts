/**
 * Difficulty Engine
 *
 * Keeps the learner profile intentionally small: support terms, recent
 * comprehension signals, and a derived learning pace.
 */

import {
  normalizeLearningProfile,
  type ComprehensionRating,
  type LearningPace,
  type LearningProfile,
  type SupportTerm,
  type SupportTermSource,
} from '../../types/learnTypes';
import type { MasteredSentence, UserProgress } from '../../types/progress';
import { normalizeChallengeIndex } from './challenge-index';

export interface DifficultyContext {
  currentLevel: number;
  levelLabel: string;
  performance: 'struggling' | 'learning' | 'comfortable' | 'excellent';
  direction: 'decrease' | 'maintain' | 'increase';
  recentExplainRate: number;
  recentTranslateRate: number;
  consecutiveMastered: number;
  supportTerms: SupportTerm[];
  recentComprehension: LearningProfile['recentComprehension'];
  reviewDue: string[];
}

export interface LearnerCorpusSummary {
  vocabularyTerms?: string[];
  masteredSentences?: string[];
}

const WINDOW_SIZE = 10;
const DECREASE_EXPLAIN_RATE = 0.6;
const DECREASE_TRANSLATE_RATE = 0.5;
const MAX_SUPPORT_TERMS = 24;
const MAX_COMPREHENSION_WINDOW = 12;
const JUST_RIGHT_INCREASE_STREAK = 3;
const TOO_EASY_INCREASE_STREAK = 2;

export function getLevelLabel(level: number): string {
  const challengeIndex = normalizeChallengeIndex(level);
  if (challengeIndex <= 1) return 'Foundation';
  if (challengeIndex <= 3) return 'Early Flow';
  if (challengeIndex <= 6) return 'Building Flow';
  if (challengeIndex <= 10) return 'Expanding Flow';
  if (challengeIndex <= 15) return 'Nuanced Flow';
  return 'Open Flow';
}

export function analyseRecentActions(history: Array<{ role: string; content: string }>): {
  explainRate: number;
  translateRate: number;
  totalSentences: number;
  consecutiveSmooth: number;
} {
  const safeHistory = Array.isArray(history) ? history : [];
  let sentences = 0;
  let explains = 0;
  let translates = 0;
  let consecutiveSmooth = 0;
  let currentSmooth = 0;

  for (const msg of safeHistory) {
    if (msg.role !== 'user') continue;
    const c = (msg.content || '').toLowerCase();
    if (c.includes('got it') || c.includes('understand')) {
      sentences += 1;
      currentSmooth += 1;
      consecutiveSmooth = Math.max(consecutiveSmooth, currentSmooth);
    } else if (c.includes('explain')) {
      explains += 1;
      currentSmooth = 0;
    } else if (c.includes('translate')) {
      translates += 1;
      currentSmooth = 0;
    }
  }

  return {
    explainRate: sentences > 0 ? explains / sentences : 0,
    translateRate: sentences > 0 ? translates / sentences : 0,
    totalSentences: sentences,
    consecutiveSmooth,
  };
}

export function calculateDifficultyContext(
  progress: UserProgress,
  profile: LearningProfile | null | undefined,
  history: Array<{ role: string; content: string }> = [],
): DifficultyContext {
  const normalizedProfile = normalizeLearningProfile(profile);
  const currentLevel = normalizeChallengeIndex(progress.currentDifficultyLevel ?? 3);
  const metrics = analyseRecentActions(history);
  const recentMastered = (progress.masteredSentences || []).slice(-WINDOW_SIZE);
  const comprehension = normalizedProfile.recentComprehension;

  let direction: DifficultyContext['direction'] = 'maintain';
  if (comprehension.tooHardStreak > 0) {
    direction = 'decrease';
  } else if (comprehension.tooEasyStreak >= TOO_EASY_INCREASE_STREAK) {
    direction = 'increase';
  } else if (metrics.explainRate > DECREASE_EXPLAIN_RATE || metrics.translateRate > DECREASE_TRANSLATE_RATE) {
    direction = 'decrease';
  } else if (comprehension.justRightStreak >= JUST_RIGHT_INCREASE_STREAK && metrics.explainRate < 0.2) {
    direction = 'increase';
  }

  let performance: DifficultyContext['performance'] = 'learning';
  if (comprehension.tooHardStreak > 0 || metrics.explainRate > 0.5) {
    performance = 'struggling';
  } else if (
    comprehension.justRightStreak >= 3
    || (metrics.explainRate < 0.15 && metrics.consecutiveSmooth >= 3)
  ) {
    performance = 'excellent';
  } else if (metrics.explainRate < 0.3 || comprehension.justRightStreak > 0) {
    performance = 'comfortable';
  }

  return {
    currentLevel,
    levelLabel: getLevelLabel(currentLevel),
    performance,
    direction,
    recentExplainRate: Math.round(metrics.explainRate * 100) / 100,
    recentTranslateRate: Math.round(metrics.translateRate * 100) / 100,
    consecutiveMastered: metrics.consecutiveSmooth,
    supportTerms: normalizedProfile.supportTerms,
    recentComprehension: comprehension,
    reviewDue: computeReviewDue(recentMastered),
  };
}

export function computeNewDifficultyLevel(
  currentLevel: number,
  ctx: DifficultyContext,
): number {
  const challengeIndex = normalizeChallengeIndex(currentLevel);
  if (ctx.direction === 'increase') return challengeIndex + 1;
  if (ctx.direction === 'decrease') return Math.max(1, challengeIndex - 1);
  return challengeIndex;
}

const REVIEW_INTERVALS_MS = [
  1 * 24 * 60 * 60 * 1000,
  3 * 24 * 60 * 60 * 1000,
  7 * 24 * 60 * 60 * 1000,
  14 * 24 * 60 * 60 * 1000,
  30 * 24 * 60 * 60 * 1000,
];

function computeReviewDue(sentences: MasteredSentence[]): string[] {
  const now = Date.now();
  const due: string[] = [];

  for (const s of sentences) {
    const reviewCount = s.reviewCount ?? 0;
    const interval = REVIEW_INTERVALS_MS[Math.min(reviewCount, REVIEW_INTERVALS_MS.length - 1)];
    const lastReview = s.lastReviewedAt ?? s.masteredAt ?? 0;
    if (now - lastReview >= interval) {
      due.push(s.content);
    }
  }

  return due.slice(0, 3);
}

export function updateLearningProfileFromAction(
  existing: LearningProfile,
  action: string,
  sentence: string,
): LearningProfile {
  const updated = normalizeLearningProfile(existing);

  if (action === 'understand') {
    return updateLearningProfileFromFeedback(updated, 'just_right', sentence);
  }

  if (action !== 'explain') return updated;

  const supportTerms = addSupportTerms(
    updated.supportTerms,
    extractTokens(sentence),
    'explain',
    1,
  );

  return {
    ...updated,
    supportTerms,
    learningPace: deriveLearningPace(updated.recentComprehension),
  };
}

export function updateLearningProfileFromFeedback(
  existing: LearningProfile,
  rating: ComprehensionRating,
  sentence: string,
): LearningProfile {
  const updated = normalizeLearningProfile(existing);
  const now = Date.now();
  const window = [
    ...updated.recentComprehension.window,
    { rating, at: now },
  ].slice(-MAX_COMPREHENSION_WINDOW);

  const recentComprehension = {
    window,
    tooHardStreak: rating === 'too_hard' ? updated.recentComprehension.tooHardStreak + 1 : 0,
    tooEasyStreak: rating === 'too_easy' ? updated.recentComprehension.tooEasyStreak + 1 : 0,
    justRightStreak: rating === 'just_right' ? updated.recentComprehension.justRightStreak + 1 : 0,
  };

  const supportTerms = rating === 'too_hard'
    ? addSupportTerms(updated.supportTerms, extractTokens(sentence), 'too_hard', 2)
    : updated.supportTerms;

  return {
    schemaVersion: 2,
    supportTerms,
    recentComprehension,
    learningPace: deriveLearningPace(recentComprehension),
  };
}

function deriveLearningPace(recentComprehension: LearningProfile['recentComprehension']): LearningPace {
  if (recentComprehension.tooHardStreak >= 2) return 'slow';
  if (recentComprehension.tooEasyStreak >= 2) return 'fast';
  return 'normal';
}

function addSupportTerms(
  existing: SupportTerm[],
  terms: string[],
  source: SupportTermSource,
  increment: number,
): SupportTerm[] {
  const now = Date.now();
  const byTerm = new Map<string, SupportTerm>();

  for (const item of existing) {
    byTerm.set(item.term.toLowerCase(), { ...item });
  }

  for (const term of terms) {
    const key = term.toLowerCase();
    const current = byTerm.get(key);
    byTerm.set(key, {
      term: current?.term ?? term,
      score: (current?.score ?? 0) + increment,
      lastSeenAt: now,
      source: current?.source === 'legacy' ? source : (current?.source ?? source),
    });
  }

  return Array.from(byTerm.values())
    .sort((a, b) => b.score - a.score || b.lastSeenAt - a.lastSeenAt)
    .slice(0, MAX_SUPPORT_TERMS);
}

function extractTokens(sentence: string): string[] {
  if (!sentence) return [];
  const hasCJK = /[\u3000-\u9FFF\uAC00-\uD7AF]/.test(sentence);
  if (hasCJK) {
    const chars = sentence.replace(/[\s\p{P}]/gu, '').split('');
    const tokens: string[] = [];
    for (let i = 0; i < chars.length; i += 2) {
      tokens.push(chars.slice(i, Math.min(i + 2, chars.length)).join(''));
    }
    return tokens.filter(Boolean).slice(0, 8);
  }
  return sentence
    .toLowerCase()
    .split(/[\s,.!?;:'"()[\]{}]+/)
    .filter((token) => token.length > 1)
    .slice(0, 8);
}

export function buildPersonalizationPrompt(
  ctx: DifficultyContext,
  corpus: LearnerCorpusSummary = {},
): string {
  const lines: string[] = [];
  const supportTerms = ctx.supportTerms.slice(0, 8).map((item) => item.term);
  const vocabularyTerms = (corpus.vocabularyTerms || []).slice(0, 12);
  const masteredSentences = (corpus.masteredSentences || []).slice(0, 5);

  lines.push('');
  lines.push('LEARNER STATE:');
  lines.push(`- Adaptive Challenge Index: ${ctx.currentLevel} (${ctx.levelLabel})`);
  lines.push(`- Recent Performance: ${ctx.performance}`);
  lines.push(`- Adjustment Direction: ${ctx.direction}`);
  lines.push(`- Learning Pace: ${ctx.recentComprehension.tooHardStreak >= 2 ? 'slow' : ctx.recentComprehension.tooEasyStreak >= 2 ? 'fast' : 'normal'}`);
  lines.push(`- Recent Explain Request Rate: ${(ctx.recentExplainRate * 100).toFixed(0)}%`);
  lines.push(`- Recent Translate Request Rate: ${(ctx.recentTranslateRate * 100).toFixed(0)}%`);
  lines.push(`- Consecutive Sentences Mastered Smoothly: ${ctx.consecutiveMastered}`);
  lines.push(`- Feedback Streaks: too_hard=${ctx.recentComprehension.tooHardStreak}, just_right=${ctx.recentComprehension.justRightStreak}, too_easy=${ctx.recentComprehension.tooEasyStreak}`);

  lines.push('');
  lines.push('KNOWN INPUT BASE:');
  if (vocabularyTerms.length > 0) {
    lines.push(`- Saved vocabulary to reuse: ${vocabularyTerms.join(', ')}`);
  }
  if (masteredSentences.length > 0) {
    lines.push('- Recently mastered sentences to anchor new input:');
    for (const sentence of masteredSentences) {
      lines.push(`  - "${sentence}"`);
    }
  }
  if (supportTerms.length > 0) {
    lines.push(`- Support terms needing gentle reinforcement: ${supportTerms.join(', ')}`);
  }
  if (vocabularyTerms.length === 0 && masteredSentences.length === 0 && supportTerms.length === 0) {
    lines.push('- No strong known-input base yet. Use very common vocabulary for the level.');
  }

  lines.push('');
  lines.push('I+1 CONTRACT:');
  lines.push('- Generate comprehensible input first: most of the sentence should be familiar or inferable.');
  lines.push('- Add exactly one main new challenge point per new sentence.');
  lines.push('- Prefer reusing known vocabulary/sentence patterns, then introduce the +1 as one new word, phrase, register shift, or sentence pattern.');
  lines.push('- Do not combine multiple new grammar ideas with multiple unfamiliar words in the same sentence.');
  lines.push('- If adjustment direction is "decrease", shorten the sentence and make the +1 more transparent.');
  lines.push('- If adjustment direction is "increase", keep the known base but make the single +1 slightly richer.');
  lines.push('- When explaining, explain only the useful challenge point and any support terms the learner likely needs.');

  lines.push('');
  lines.push('CHALLENGE TUNING GUIDELINES:');
  lines.push('- Treat the challenge index as an open-ended internal position, not a learner-facing score.');
  lines.push('- Lower indexes should use shorter daily sentences, common vocabulary, and very transparent word order.');
  lines.push('- Middle indexes can add one clause expansion, common connectors, tense/aspect, register, or word-choice nuance.');
  lines.push('- Higher indexes can use more natural phrasing, idioms, discourse nuance, or cultural references while preserving one main +1 point.');

  if (ctx.reviewDue.length > 0) {
    lines.push('');
    lines.push('REVIEW DUE:');
    lines.push('Consider incorporating vocabulary from these previously mastered sentences:');
    for (const sentence of ctx.reviewDue) {
      lines.push(`  - "${sentence}"`);
    }
  }

  return lines.join('\n');
}
