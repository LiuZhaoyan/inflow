import { and, count, desc, eq } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import path from 'path';
import { db } from './connection';
import { stories } from './schema';
import type { Story } from '@/lib/types/story';

const LEGACY_SINGLE_USER_ID = 'single-user';

export async function initStoriesDb() {
  return;
}

function toMillis(value: Date | number | null | undefined): number {
  if (typeof value === 'number') return value;
  if (value instanceof Date) return value.getTime();
  return Date.now();
}

function mapRowToStory(row: typeof stories.$inferSelect): Story {
  return {
    id: row.id,
    content: row.content,
    translation: row.translation || undefined,
    words: Array.isArray(row.words) ? row.words : [],
    language: row.language || undefined,
    translationLanguage: row.translationLanguage || undefined,
    audioPath: row.audioPath || undefined,
    createdAt: toMillis(row.createdAt),
  };
}

export async function getStoriesByUser(userId: string): Promise<Story[]> {
  const rows = await db
    .select()
    .from(stories)
    .where(eq(stories.userId, userId))
    .orderBy(desc(stories.createdAt));

  return rows.map(mapRowToStory);
}

export async function getStoryStatsByUser(userId: string): Promise<{ total: number }> {
  const [row] = await db
    .select({ total: count() })
    .from(stories)
    .where(eq(stories.userId, userId));

  return { total: Number(row?.total ?? 0) };
}

export async function addStoryByUser(
  userId: string,
  story: Omit<Story, 'id' | 'createdAt'>,
): Promise<Story> {
  const [created] = await db
    .insert(stories)
    .values({
      id: uuidv4(),
      userId,
      content: story.content,
      translation: story.translation,
      words: story.words,
      language: story.language,
      translationLanguage: story.translationLanguage,
      audioPath: story.audioPath,
      createdAt: new Date(),
    })
    .returning();

  return mapRowToStory(created);
}

async function safeUnlink(filePath: string) {
  const fs = await import('fs/promises');
  try {
    await fs.unlink(filePath);
  } catch (err: unknown) {
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return;
    throw err;
  }
}

export async function getStoryById(id: string): Promise<Story | undefined> {
  const [story] = await db
    .select()
    .from(stories)
    .where(eq(stories.id, id))
    .limit(1);

  if (!story) return undefined;
  return mapRowToStory(story);
}

export async function deleteStoryByUser(userId: string, id: string): Promise<void> {
  const [existing] = await db
    .select()
    .from(stories)
    .where(and(eq(stories.id, id), eq(stories.userId, userId)))
    .limit(1);

  if (existing?.audioPath) {
    const rel = existing.audioPath.startsWith('/') ? existing.audioPath.slice(1) : existing.audioPath;
    if (rel.startsWith('uploads/')) {
      const full = path.join(process.cwd(), 'public', rel);
      await safeUnlink(full);
    }
  }

  await db
    .delete(stories)
    .where(and(eq(stories.id, id), eq(stories.userId, userId)));
}

export async function updateStoryByUser(
  userId: string,
  id: string,
  updates: Partial<Story>,
): Promise<Story | null> {
  const [prev] = await db
    .select()
    .from(stories)
    .where(and(eq(stories.id, id), eq(stories.userId, userId)))
    .limit(1);

  if (!prev) return null;

  if (updates.audioPath && prev.audioPath && updates.audioPath !== prev.audioPath) {
    const rel = prev.audioPath.startsWith('/') ? prev.audioPath.slice(1) : prev.audioPath;
    if (rel.startsWith('uploads/')) {
      const full = path.join(process.cwd(), 'public', rel);
      await safeUnlink(full);
    }
  }

  const [updated] = await db
    .update(stories)
    .set({
      content: updates.content ?? prev.content,
      translation: updates.translation ?? prev.translation,
      words: updates.words ?? prev.words,
      language: updates.language ?? prev.language,
      translationLanguage: updates.translationLanguage ?? prev.translationLanguage,
      audioPath: updates.audioPath ?? prev.audioPath,
    })
    .where(and(eq(stories.id, id), eq(stories.userId, userId)))
    .returning();

  return mapRowToStory(updated);
}
