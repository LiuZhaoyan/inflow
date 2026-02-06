/**
 * Difficulty Engine
 * 
 * Calculates and adjusts difficulty levels based on user performance.
 * Uses a sliding-window approach over recent sessions to adapt in real-time.
 */

import type { LearningProfile, PerformanceMetrics } from './types/learnTypes';
import type { MasteredSentence, UserProgress } from './types/progress';

// ── Difficulty context passed to the AI prompt ──────────────────────────
export interface DifficultyContext {
  currentLevel: number;          // 1-10
  levelLabel: string;            // e.g. "Beginner", "Advanced"
  performance: 'struggling' | 'learning' | 'comfortable' | 'excellent';
  direction: 'decrease' | 'maintain' | 'increase';
  recentExplainRate: number;
  recentTranslateRate: number;
  consecutiveMastered: number;
  weakAreas: string[];
  knownVocabularyCount: number;
  masteredGrammar: string[];
  reviewDue: string[];           // sentences due for spaced repetition
}

// ── Constants ───────────────────────────────────────────────────────────
const WINDOW_SIZE = 10;             // look at last N mastered sentences
const INCREASE_THRESHOLD = 3;       // mastered N+ smoothly → increase
const DECREASE_EXPLAIN_RATE = 0.6;  // explain rate above this → decrease
const DECREASE_TRANSLATE_RATE = 0.5;

export const LEVEL_LABELS: Record<number, string> = {
  1: 'Absolute Beginner',
  2: 'Beginner',
  3: 'Upper Beginner',
  4: 'Lower Intermediate',
  5: 'Intermediate',
  6: 'Upper Intermediate',
  7: 'Lower Advanced',
  8: 'Advanced',
  9: 'Upper Advanced',
  10: 'Near-Native',
};

export function getLevelLabel(level: number): string {
  return LEVEL_LABELS[Math.max(1, Math.min(10, Math.round(level)))] ?? 'Intermediate';
}

// ── Performance analysis ────────────────────────────────────────────────

/** 
 * Analyse the recent action history to compute explain / translate rates
 * `history` is the raw chat history array from the client.
 */
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
    if (msg.role === 'user') {
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
  }

  return {
    explainRate: sentences > 0 ? explains / sentences : 0,
    translateRate: sentences > 0 ? translates / sentences : 0,
    totalSentences: sentences,
    consecutiveSmooth,
  };
}

// ── Core difficulty calculation ─────────────────────────────────────────

export function calculateDifficultyContext(
  progress: UserProgress,
  profile: LearningProfile | null | undefined,
  history: Array<{ role: string; content: string }> = [],
): DifficultyContext {
  const currentLevel = progress.currentDifficultyLevel ?? 3;
  const metrics = analyseRecentActions(history);
  const recentMastered = (progress.masteredSentences || []).slice(-WINDOW_SIZE);

  // Determine adjustment direction
  let direction: DifficultyContext['direction'] = 'maintain';

  if (metrics.explainRate > DECREASE_EXPLAIN_RATE || metrics.translateRate > DECREASE_TRANSLATE_RATE) {
    direction = 'decrease';
  } else if (metrics.consecutiveSmooth >= INCREASE_THRESHOLD && metrics.explainRate < 0.2) {
    direction = 'increase';
  }

  // Performance label
  let performance: DifficultyContext['performance'] = 'learning';
  if (metrics.explainRate > 0.5) {
    performance = 'struggling';
  } else if (metrics.explainRate < 0.15 && metrics.consecutiveSmooth >= 3) {
    performance = 'excellent';
  } else if (metrics.explainRate < 0.3) {
    performance = 'comfortable';
  }

  // Spaced repetition – find sentences due for review
  const reviewDue = computeReviewDue(recentMastered);

  return {
    currentLevel,
    levelLabel: getLevelLabel(currentLevel),
    performance,
    direction,
    recentExplainRate: Math.round(metrics.explainRate * 100) / 100,
    recentTranslateRate: Math.round(metrics.translateRate * 100) / 100,
    consecutiveMastered: metrics.consecutiveSmooth,
    weakAreas: profile?.strugglingGrammar ?? [],
    knownVocabularyCount: profile?.knownVocabulary?.length ?? 0,
    masteredGrammar: profile?.masteredGrammar ?? [],
    reviewDue,
  };
}

/**
 * Given the current level and difficulty context, compute the new level.
 * Called server-side after each "understand" action.
 */
export function computeNewDifficultyLevel(
  currentLevel: number,
  ctx: DifficultyContext,
): number {
  let newLevel = currentLevel;

  if (ctx.direction === 'increase') {
    newLevel = Math.min(10, currentLevel + 1);
  } else if (ctx.direction === 'decrease') {
    newLevel = Math.max(1, currentLevel - 1);
  }

  return newLevel;
}

// ── Spaced repetition ───────────────────────────────────────────────────

const REVIEW_INTERVALS_MS = [
  1 * 24 * 60 * 60 * 1000,   // 1 day
  3 * 24 * 60 * 60 * 1000,   // 3 days
  7 * 24 * 60 * 60 * 1000,   // 7 days
  14 * 24 * 60 * 60 * 1000,  // 14 days
  30 * 24 * 60 * 60 * 1000,  // 30 days
];

function computeReviewDue(sentences: MasteredSentence[]): string[] {
  const now = Date.now();
  const due: string[] = [];

  for (const s of sentences) {
    const age = now - (s.masteredAt || 0);
    const reviewCount = s.reviewCount ?? 0;
    const interval = REVIEW_INTERVALS_MS[Math.min(reviewCount, REVIEW_INTERVALS_MS.length - 1)];
    const lastReview = s.lastReviewedAt ?? s.masteredAt ?? 0;
    if (now - lastReview >= interval) {
      due.push(s.content);
    }
  }

  return due.slice(0, 3); // return at most 3
}

// ── Learning profile updater ────────────────────────────────────────────

export function updateLearningProfileFromAction(
  existing: LearningProfile,
  action: string,
  sentence: string,
  history: Array<{ role: string; content: string }>,
): LearningProfile {
  const updated = { ...existing };
  const now = Date.now();

  if (action === 'understand') {
    // Extract basic vocabulary tokens (split by whitespace/punctuation for CJK-friendly approach)
    const tokens = extractTokens(sentence);
    const vocab = new Set(updated.knownVocabulary || []);
    for (const t of tokens) vocab.add(t);
    updated.knownVocabulary = Array.from(vocab);

    // Track mastery speed
    updated.totalSentencesMastered = (updated.totalSentencesMastered ?? 0) + 1;
  }

  if (action === 'explain') {
    // The sentence the user needed help with – track weak vocabulary
    const tokens = extractTokens(sentence);
    const weakMap: Record<string, number> = {};
    for (const [k, v] of Object.entries(updated.weakVocabulary || {})) {
      weakMap[k] = v;
    }
    for (const t of tokens) {
      weakMap[t] = (weakMap[t] || 0) + 1;
    }
    updated.weakVocabulary = weakMap;

    // If user asks for explain a lot, mark grammar as struggling
    const recentActions = analyseRecentActions(history);
    if (recentActions.explainRate > 0.5 && !updated.strugglingGrammar?.includes('general')) {
      updated.strugglingGrammar = [...(updated.strugglingGrammar || []), 'general'];
    }
  }

  updated.lastUpdated = now;
  return updated;
}

function extractTokens(sentence: string): string[] {
  if (!sentence) return [];
  // For CJK languages, split into individual characters / small chunks
  // For latin-based, split by spaces
  const hasCJK = /[\u3000-\u9FFF\uAC00-\uD7AF]/.test(sentence);
  if (hasCJK) {
    // Split into 2-character chunks for CJK (rough approximation of words)
    const chars = sentence.replace(/[\s\p{P}]/gu, '').split('');
    const tokens: string[] = [];
    for (let i = 0; i < chars.length; i += 2) {
      tokens.push(chars.slice(i, Math.min(i + 2, chars.length)).join(''));
    }
    return tokens.filter(Boolean);
  }
  return sentence
    .toLowerCase()
    .split(/[\s,.!?;:'"()\[\]{}]+/)
    .filter(t => t.length > 1);
}

// ── Build personalization block for the system prompt ───────────────────

export function buildPersonalizationPrompt(ctx: DifficultyContext): string {
  const lines: string[] = [];

  lines.push(`\nDIFFICULTY & PERSONALIZATION:`);
  lines.push(`- Current Difficulty Level: ${ctx.currentLevel}/10 (${ctx.levelLabel})`);
  lines.push(`- Recent Performance: ${ctx.performance}`);
  lines.push(`- Adjustment Direction: ${ctx.direction}`);
  lines.push(`- Recent Explain Request Rate: ${(ctx.recentExplainRate * 100).toFixed(0)}%`);
  lines.push(`- Recent Translate Request Rate: ${(ctx.recentTranslateRate * 100).toFixed(0)}%`);
  lines.push(`- Consecutive Sentences Mastered Smoothly: ${ctx.consecutiveMastered}`);
  lines.push(`- Known Vocabulary Count: ${ctx.knownVocabularyCount}`);

  if (ctx.weakAreas.length > 0) {
    lines.push(`- Weak Areas to Reinforce: ${ctx.weakAreas.join(', ')}`);
  }
  if (ctx.masteredGrammar.length > 0) {
    lines.push(`- Mastered Grammar: ${ctx.masteredGrammar.join(', ')}`);
  }

  lines.push('');
  lines.push(`DIFFICULTY GUIDELINES:`);
  lines.push(`Level 1-3 (Beginner):`);
  lines.push(`  - Use present tense, simple subject-verb-object structure`);
  lines.push(`  - Common vocabulary (top 500-1000 words)`);
  lines.push(`  - Short sentences (3-8 words)`);
  lines.push(`  - Basic greetings, numbers, simple daily actions`);
  lines.push(`Level 4-6 (Intermediate):`);
  lines.push(`  - Introduce past/future tenses, compound sentences`);
  lines.push(`  - Expand vocabulary (top 3000 words)`);
  lines.push(`  - Medium sentences (8-15 words)`);
  lines.push(`  - Add conjunctions, particles, polite/informal registers`);
  lines.push(`Level 7-10 (Advanced):`);
  lines.push(`  - Complex grammar (conditionals, passive voice, causatives)`);
  lines.push(`  - Nuanced vocabulary, idioms, colloquial expressions`);
  lines.push(`  - Longer sentences (15+ words)`);
  lines.push(`  - Cultural references, abstract topics, humor`);

  lines.push('');
  lines.push(`ADAPTIVE RULES:`);
  lines.push(`- If adjustment direction is "decrease": make the next sentence noticeably easier`);
  lines.push(`- If adjustment direction is "increase": make the next sentence slightly harder`);
  lines.push(`- If adjustment direction is "maintain": keep the same difficulty`);
  lines.push(`- NEVER jump more than 1 level at a time`);
  lines.push(`- When explaining, adjust explanation complexity to match user level`);

  if (ctx.reviewDue.length > 0) {
    lines.push('');
    lines.push(`REVIEW SENTENCES DUE (spaced repetition):`);
    lines.push(`Consider incorporating vocabulary from these previously mastered sentences:`);
    for (const s of ctx.reviewDue) {
      lines.push(`  - "${s}"`);
    }
  }

  return lines.join('\n');
}
