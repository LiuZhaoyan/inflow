import { and, count, desc, eq, lt, type SQL } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { db } from './connection';
import { vocabulary } from './schema';
import type { VocabularyWord } from '@/lib/types/vocabulary';

const LEGACY_SINGLE_USER_ID = 'single-user';

export async function initVocabularyDb() {
  return;
}

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

function toCursorDate(cursor: Date | number | string | undefined): Date | undefined {
  if (!cursor) return undefined;
  if (cursor instanceof Date) return cursor;
  if (typeof cursor === 'number') return new Date(cursor);
  const numeric = Number(cursor);
  if (Number.isFinite(numeric)) return new Date(numeric);
  const parsed = new Date(cursor);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

function mapRowToWord(row: typeof vocabulary.$inferSelect): VocabularyWord {
  return {
    id: row.id,
    word: row.word,
    definition: row.definition,
    contextSentence: row.contextSentence || undefined,
    translation: row.translation || undefined,
    imagePath: row.imagePath || undefined,
    audioPath: row.audioPath || undefined,
    language: row.language || undefined,
    createdAt: toMillis(row.createdAt),
  };
}

export interface VocabularyQueryOptions {
  languageCode?: string;
  limit?: number;
  cursor?: Date | number | string;
}

export interface VocabularyStats {
  total: number;
  byLanguage: Record<string, number>;
}

export async function getVocabularyByUser(
  userId: string,
  options: VocabularyQueryOptions = {},
): Promise<VocabularyWord[]> {
  const conditions: SQL[] = [eq(vocabulary.userId, userId)];
  const languageCode = normalizeStoredLanguageCode(options.languageCode);
  if (options.languageCode && languageCode !== 'all') {
    conditions.push(eq(vocabulary.language, languageCode));
  }
  const cursorDate = toCursorDate(options.cursor);
  if (cursorDate) {
    conditions.push(lt(vocabulary.createdAt, cursorDate));
  }

  let query = db
    .select()
    .from(vocabulary)
    .where(and(...conditions))
    .orderBy(desc(vocabulary.createdAt))
    .$dynamic();

  if (options.limit && options.limit > 0) {
    query = query.limit(Math.min(options.limit, 100));
  }

  const rows = await query;

  return rows.map(mapRowToWord);
}

export async function getVocabularyStatsByUser(userId: string): Promise<VocabularyStats> {
  const rows = await db
    .select({
      language: vocabulary.language,
      total: count(),
    })
    .from(vocabulary)
    .where(eq(vocabulary.userId, userId))
    .groupBy(vocabulary.language);

  const byLanguage: Record<string, number> = {};
  let total = 0;
  for (const row of rows) {
    const rowTotal = Number(row.total);
    byLanguage[row.language || 'unknown'] = rowTotal;
    total += rowTotal;
  }

  return { total, byLanguage };
}

export async function addWordByUser(
  userId: string,
  word: Omit<VocabularyWord, 'id' | 'createdAt'>,
): Promise<VocabularyWord> {
  const now = new Date();
  const [created] = await db
    .insert(vocabulary)
    .values({
      id: uuidv4(),
      userId,
      word: word.word,
      definition: word.definition,
      contextSentence: word.contextSentence,
      translation: word.translation,
      imagePath: word.imagePath,
      audioPath: word.audioPath,
      language: normalizeStoredLanguageCode(word.language),
      createdAt: now,
    })
    .returning();

  return mapRowToWord(created);
}

async function safeUnlink(filePath: string) {
  const fs = await import('fs/promises');
  try {
    await fs.unlink(filePath);
  } catch (err: unknown) {
    // ignore missing file
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return;
    throw err;
  }
}

export async function deleteWordByUser(userId: string, id: string): Promise<void> {
    // Also delete any associated media files (image/audio)
    const [existing] = await db
      .select()
      .from(vocabulary)
      .where(and(eq(vocabulary.id, id), eq(vocabulary.userId, userId)))
      .limit(1);

    if (existing) {
      // Best-effort cleanup of media files referenced by this word
      const delPaths: Array<string | null> = [existing.imagePath, existing.audioPath];
      for (const p of delPaths) {
        if (p && typeof p === 'string') {
          try {
            // Convert public URL like "/uploads/images/xxx.jpg" to local file path
            const rel = p.startsWith('/') ? p.slice(1) : p;
            // Only allow deletion inside public/uploads
            if (rel.startsWith('uploads/')) {
              const full = path.join(process.cwd(), 'public', rel);
              await safeUnlink(full);
            }
          } catch {}
        }
      }
    }

    await db
      .delete(vocabulary)
      .where(and(eq(vocabulary.id, id), eq(vocabulary.userId, userId)));
}

export async function updateWordByUser(
  userId: string,
  id: string,
  updates: Partial<VocabularyWord>,
): Promise<VocabularyWord | null> {
    const [prev] = await db
      .select()
      .from(vocabulary)
      .where(and(eq(vocabulary.id, id), eq(vocabulary.userId, userId)))
      .limit(1);

    if (!prev) return null;

    // If image/audio path is being updated, remove the old file
    const maybeDeleteOld = async (oldPath?: string | null, newPath?: string | null) => {
      if (!oldPath || !newPath || oldPath === newPath) return;
      const rel = oldPath.startsWith('/') ? oldPath.slice(1) : oldPath;
      if (rel.startsWith('uploads/')) {
        const full = path.join(process.cwd(), 'public', rel);
        await safeUnlink(full);
      }
    };

    await maybeDeleteOld(prev.imagePath, updates.imagePath);
    await maybeDeleteOld(prev.audioPath, updates.audioPath);

    const [updated] = await db
      .update(vocabulary)
      .set({
        word: updates.word ?? prev.word,
        definition: updates.definition ?? prev.definition,
        contextSentence: updates.contextSentence ?? prev.contextSentence,
        translation: updates.translation ?? prev.translation,
        imagePath: updates.imagePath ?? prev.imagePath,
        audioPath: updates.audioPath ?? prev.audioPath,
        language: updates.language === undefined
          ? prev.language
          : normalizeStoredLanguageCode(updates.language),
      })
      .where(and(eq(vocabulary.id, id), eq(vocabulary.userId, userId)))
      .returning();

    return mapRowToWord(updated);
}
