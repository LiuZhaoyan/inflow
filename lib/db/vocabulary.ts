import { and, desc, eq } from 'drizzle-orm';
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

export async function getVocabularyByUser(userId: string): Promise<VocabularyWord[]> {
  const rows = await db
    .select()
    .from(vocabulary)
    .where(eq(vocabulary.userId, userId))
    .orderBy(desc(vocabulary.createdAt));

  return rows.map(mapRowToWord);
}

export async function getVocabulary(userId: string = LEGACY_SINGLE_USER_ID): Promise<VocabularyWord[]> {
  await initVocabularyDb();
  return getVocabularyByUser(userId);
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
      language: word.language,
      createdAt: now,
    })
    .returning();

  return mapRowToWord(created);
}

export async function addWord(
  word: Omit<VocabularyWord, 'id' | 'createdAt'>,
  userId: string = LEGACY_SINGLE_USER_ID,
): Promise<VocabularyWord> {
  return addWordByUser(userId, word);
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
      const delPaths: Array<string | undefined> = [existing.imagePath, existing.audioPath];
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

export async function deleteWord(id: string, userId: string = LEGACY_SINGLE_USER_ID): Promise<void> {
  return deleteWordByUser(userId, id);
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
    const maybeDeleteOld = async (oldPath?: string, newPath?: string) => {
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
        language: updates.language ?? prev.language,
      })
      .where(and(eq(vocabulary.id, id), eq(vocabulary.userId, userId)))
      .returning();

    return mapRowToWord(updated);
}

export async function updateWord(
  id: string,
  updates: Partial<VocabularyWord>,
  userId: string = LEGACY_SINGLE_USER_ID,
): Promise<VocabularyWord | null> {
  return updateWordByUser(userId, id, updates);
}
