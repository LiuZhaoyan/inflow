import { and, count, desc, eq, lt, type SQL } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from './connection';
import { learningProgress, masteredSentences } from './schema';
import { getUserProfile } from './user';
import { normalizeChallengeIndex } from '@/lib/domain/learn/challenge-index';
import { normalizeLearningProfile } from '@/lib/types/learnTypes';
import { DEFAULT_PROGRESS, type MasteredSentence, type UserProgress } from '@/lib/types/progress';

const LEGACY_SINGLE_USER_ID = 'single-user';

function toMillis(value: Date | number | null | undefined): number {
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  return Date.now();
}

function normalizeStoredLanguageCode(language?: string | null): string {
  const normalized = (language || '').trim().toLowerCase();
  if (!normalized || normalized === 'auto') return 'unknown';
  return normalized;
}

function normalizeSentenceFingerprint(value?: string | null): string {
  return (value || '').trim().replace(/\s+/g, ' ').toLowerCase();
}

function toCursorDate(cursor: Date | number | string | undefined): Date | undefined {
  if (!cursor) return undefined;
  if (cursor instanceof Date) return cursor;
  if (typeof cursor === 'number') return new Date(cursor);
  const numeric = Number(cursor);
  if (Number.isFinite(numeric)) return new Date(numeric);
  const parsed = new Date(cursor);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function mergeProfile(raw: unknown) {
  return normalizeLearningProfile(raw);
}

function mergeMetrics(raw: unknown) {
  const safeRaw = (raw && typeof raw === 'object' ? raw : {}) as Record<string, unknown>;
  return {
    ...DEFAULT_PROGRESS.performanceMetrics,
    ...safeRaw,
  };
}

function mapMasteredSentence(row: typeof masteredSentences.$inferSelect): MasteredSentence {
  return {
    id: row.id,
    content: row.content,
    translation: row.translation || undefined,
    masteredAt: toMillis(row.masteredAt),
    difficultyLevel: row.difficultyLevel ?? 3,
    audioPath: row.audioPath || undefined,
    context: row.context || undefined,
    messageId: row.messageId || undefined,
    languageCode: row.languageCode || undefined,
    reviewCount: row.reviewCount ?? 0,
    lastReviewedAt: row.lastReviewedAt ? toMillis(row.lastReviewedAt) : undefined,
  };
}

function buildRecentContext(sentences: MasteredSentence[]) {
  const recentContext: string[] = [];
  const seen = new Set<string>();

  for (const sentence of sentences) {
    const key = `${sentence.languageCode || 'default'}:${sentence.content}`;
    if (seen.has(key)) continue;
    seen.add(key);
    recentContext.push(key);
    if (recentContext.length >= 10) break;
  }

  return recentContext;
}

export interface MasteredSentenceQueryOptions {
  languageCode?: string;
  limit?: number;
  cursor?: Date | number | string;
}

export interface MasteredSentenceStats {
  total: number;
  byLanguage: Record<string, number>;
}

async function resolveLanguageCode(userId: string, languageCode?: string): Promise<string> {
  if (languageCode && languageCode.trim()) return languageCode.trim();
  const profile = await getUserProfile(userId);
  return (
    profile?.currentLanguageCode
    || profile?.targetLanguage
    || DEFAULT_PROGRESS.targetLanguage
  );
}

async function ensureProgressRow(userId: string, languageCode: string) {
  const now = new Date();
  await db
    .insert(learningProgress)
    .values({
      id: uuidv4(),
      userId,
      languageCode,
      currentDifficultyLevel: DEFAULT_PROGRESS.currentDifficultyLevel,
      initialDifficultyLevel: DEFAULT_PROGRESS.initialDifficultyLevel,
      placementCompleted: DEFAULT_PROGRESS.placementCompleted,
      learningProfile: DEFAULT_PROGRESS.learningProfile,
      performanceMetrics: DEFAULT_PROGRESS.performanceMetrics,
      lastUpdated: now,
    })
    .onConflictDoNothing({
      target: [learningProgress.userId, learningProgress.languageCode],
    });

  const [row] = await db
    .select()
    .from(learningProgress)
    .where(and(eq(learningProgress.userId, userId), eq(learningProgress.languageCode, languageCode)))
    .limit(1);

  if (row) return row;

  throw new Error(`Failed to ensure progress row: ${userId}/${languageCode}`);
}

export async function initProgressDb() {
  const profile = await getUserProfile();
  const languageCode = profile.currentLanguageCode || profile.targetLanguage || DEFAULT_PROGRESS.targetLanguage;
  await ensureProgressRow(LEGACY_SINGLE_USER_ID, languageCode);
}

export async function getProgressByUser(userId: string, languageCode: string): Promise<UserProgress> {
  const row = await ensureProgressRow(userId, languageCode);
  const mastered = await getMasteredSentencesByUser(userId, { languageCode });

  return {
    targetLanguage: languageCode,
    currentDifficultyLevel: row.currentDifficultyLevel ?? DEFAULT_PROGRESS.currentDifficultyLevel,
    initialDifficultyLevel: row.initialDifficultyLevel ?? DEFAULT_PROGRESS.initialDifficultyLevel,
    masteredSentences: mastered,
    recentContext: buildRecentContext(mastered),
    performanceMetrics: mergeMetrics(row.performanceMetrics),
    learningProfile: mergeProfile(row.learningProfile),
    placementCompleted: Boolean(row.placementCompleted),
    lastUpdated: toMillis(row.lastUpdated),
  };
}

export async function getMasteredSentencesByUser(
  userId: string,
  options: MasteredSentenceQueryOptions = {},
): Promise<MasteredSentence[]> {
  const conditions: SQL[] = [eq(masteredSentences.userId, userId)];
  const languageCode = normalizeStoredLanguageCode(options.languageCode);
  if (options.languageCode && languageCode !== 'all') {
    conditions.push(eq(masteredSentences.languageCode, languageCode));
  }
  const cursorDate = toCursorDate(options.cursor);
  if (cursorDate) {
    conditions.push(lt(masteredSentences.masteredAt, cursorDate));
  }

  let query = db
    .select()
    .from(masteredSentences)
    .where(and(...conditions))
    .orderBy(desc(masteredSentences.masteredAt))
    .$dynamic();

  if (options.limit && options.limit > 0) {
    query = query.limit(Math.min(options.limit, 100));
  }

  const rows = await query;
  return rows.map(mapMasteredSentence);
}

export async function getMasteredSentenceStatsByUser(userId: string): Promise<MasteredSentenceStats> {
  const rows = await db
    .select({
      language: masteredSentences.languageCode,
      total: count(),
    })
    .from(masteredSentences)
    .where(eq(masteredSentences.userId, userId))
    .groupBy(masteredSentences.languageCode);

  const byLanguage: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    const rowTotal = Number(row.total);
    byLanguage[row.language || 'unknown'] = rowTotal;
    total += rowTotal;
  }

  return { total, byLanguage };
}

export async function getProgress(languageCode?: string, userId: string = LEGACY_SINGLE_USER_ID): Promise<UserProgress> {
  await initProgressDb();
  const resolvedLanguageCode = await resolveLanguageCode(userId, languageCode);
  return getProgressByUser(userId, resolvedLanguageCode);
}

export async function updateProgressByUser(
  userId: string,
  languageCode: string,
  newProgress: Partial<UserProgress>,
) {
  const current = await getProgressByUser(userId, languageCode);
  const now = Date.now();
  const updated: UserProgress = {
    ...current,
    ...newProgress,
    targetLanguage: languageCode,
    performanceMetrics: {
      ...current.performanceMetrics,
      ...(newProgress.performanceMetrics || {}),
    },
    learningProfile: normalizeLearningProfile(newProgress.learningProfile || current.learningProfile),
    masteredSentences: newProgress.masteredSentences ?? current.masteredSentences,
    recentContext: newProgress.recentContext ?? current.recentContext,
    lastUpdated: now,
  };

  await db
    .update(learningProgress)
    .set({
      currentDifficultyLevel: updated.currentDifficultyLevel,
      initialDifficultyLevel: updated.initialDifficultyLevel,
      placementCompleted: updated.placementCompleted,
      learningProfile: updated.learningProfile,
      performanceMetrics: updated.performanceMetrics,
      lastUpdated: new Date(updated.lastUpdated),
    })
    .where(and(eq(learningProgress.userId, userId), eq(learningProgress.languageCode, languageCode)));

  return updated;
}

export async function updateProgress(
  newProgress: Partial<UserProgress>,
  userId: string = LEGACY_SINGLE_USER_ID,
  languageCode?: string,
) {
  const resolvedLanguageCode =
    newProgress.targetLanguage
    || languageCode
    || await resolveLanguageCode(userId);
  return updateProgressByUser(userId, resolvedLanguageCode, newProgress);
}

export async function saveMasteredSentenceByUser(
  userId: string,
  sentence: MasteredSentence,
  languageCode?: string,
) {
  const resolvedLanguageCode =
    normalizeStoredLanguageCode(languageCode || sentence.languageCode || await resolveLanguageCode(userId));
  await ensureProgressRow(userId, resolvedLanguageCode);
  const contentHash = normalizeSentenceFingerprint(sentence.content);
  const contextHash = normalizeSentenceFingerprint(sentence.context);

  const [created] = await db.insert(masteredSentences).values({
    id: sentence.id || uuidv4(),
    userId,
    content: sentence.content,
    contentHash,
    translation: sentence.translation,
    context: sentence.context,
    contextHash,
    languageCode: resolvedLanguageCode,
    difficultyLevel: sentence.difficultyLevel,
    audioPath: sentence.audioPath,
    messageId: sentence.messageId,
    masteredAt: new Date(sentence.masteredAt || Date.now()),
    reviewCount: sentence.reviewCount || 0,
    lastReviewedAt: sentence.lastReviewedAt ? new Date(sentence.lastReviewedAt) : null,
  })
    .onConflictDoNothing({
      target: [
        masteredSentences.userId,
        masteredSentences.languageCode,
        masteredSentences.contentHash,
        masteredSentences.contextHash,
      ],
    })
    .returning();

  if (created) {
    await db
      .update(learningProgress)
      .set({ lastUpdated: new Date() })
      .where(and(eq(learningProgress.userId, userId), eq(learningProgress.languageCode, resolvedLanguageCode)));

    return mapMasteredSentence(created);
  }

  const [existing] = await db
    .select()
    .from(masteredSentences)
    .where(and(
      eq(masteredSentences.userId, userId),
      eq(masteredSentences.languageCode, resolvedLanguageCode),
      eq(masteredSentences.contentHash, contentHash),
      eq(masteredSentences.contextHash, contextHash),
    ))
    .limit(1);

  return existing ? mapMasteredSentence(existing) : null;
}

export async function saveMasteredSentence(
  sentence: MasteredSentence,
  userId: string = LEGACY_SINGLE_USER_ID,
  languageCode?: string,
) {
  return saveMasteredSentenceByUser(userId, sentence, languageCode);
}

export async function updateMasteredSentenceAudioPath(
  sentenceId: string,
  audioPath: string,
  userId: string,
  languageCode?: string,
) {
  const resolvedLanguageCode = languageCode || await resolveLanguageCode(userId);
  await db
    .update(masteredSentences)
    .set({ audioPath })
    .where(
      and(
        eq(masteredSentences.id, sentenceId),
        eq(masteredSentences.userId, userId),
        eq(masteredSentences.languageCode, resolvedLanguageCode),
      ),
    );
}

export async function deleteMasteredSentenceByUser(
  userId: string,
  id: string,
  languageCode?: string,
) {
  if (languageCode) {
    await db
      .delete(masteredSentences)
      .where(
        and(
          eq(masteredSentences.id, id),
          eq(masteredSentences.userId, userId),
          eq(masteredSentences.languageCode, languageCode),
        ),
      );
    await db
      .update(learningProgress)
      .set({ lastUpdated: new Date() })
      .where(and(eq(learningProgress.userId, userId), eq(learningProgress.languageCode, languageCode)));
    return getProgressByUser(userId, languageCode);
  }

  const [sentence] = await db
    .select({ languageCode: masteredSentences.languageCode })
    .from(masteredSentences)
    .where(and(eq(masteredSentences.id, id), eq(masteredSentences.userId, userId)))
    .limit(1);

  if (!sentence?.languageCode) {
    const resolvedLanguageCode = await resolveLanguageCode(userId);
    return getProgressByUser(userId, resolvedLanguageCode);
  }

  await db
    .delete(masteredSentences)
    .where(and(eq(masteredSentences.id, id), eq(masteredSentences.userId, userId)));

  await db
    .update(learningProgress)
    .set({ lastUpdated: new Date() })
    .where(and(eq(learningProgress.userId, userId), eq(learningProgress.languageCode, sentence.languageCode)));

  return getProgressByUser(userId, sentence.languageCode);
}

export async function deleteMasteredSentence(
  id: string,
  userId: string = LEGACY_SINGLE_USER_ID,
  languageCode?: string,
) {
  return deleteMasteredSentenceByUser(userId, id, languageCode);
}

export async function updateLearningProfile(
  profile: UserProgress['learningProfile'],
  userId: string = LEGACY_SINGLE_USER_ID,
  languageCode?: string,
) {
  const resolvedLanguageCode = languageCode || await resolveLanguageCode(userId);
  const progress = await updateProgressByUser(userId, resolvedLanguageCode, {
    learningProfile: profile,
  });
  return progress.learningProfile;
}

export async function setDifficultyLevel(level: number, userId: string = LEGACY_SINGLE_USER_ID, languageCode?: string) {
  const resolvedLanguageCode = languageCode || await resolveLanguageCode(userId);
  const progress = await updateProgressByUser(userId, resolvedLanguageCode, {
    currentDifficultyLevel: normalizeChallengeIndex(level, DEFAULT_PROGRESS.currentDifficultyLevel),
  });
  return progress.currentDifficultyLevel;
}

export async function setPlacementResult(
  level: number,
  userId: string = LEGACY_SINGLE_USER_ID,
  languageCode?: string,
) {
  const resolvedLanguageCode = languageCode || await resolveLanguageCode(userId);
  const challengeIndex = normalizeChallengeIndex(level, DEFAULT_PROGRESS.currentDifficultyLevel);

  return updateProgressByUser(userId, resolvedLanguageCode, {
    currentDifficultyLevel: challengeIndex,
    initialDifficultyLevel: challengeIndex,
    placementCompleted: true,
  });
}
