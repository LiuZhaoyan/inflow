import fs from 'fs/promises';
import path from 'path';
import { and, eq, isNull, or } from 'drizzle-orm';
import { v4 as uuidv4 } from 'uuid';
import { db } from './connection';
import { books } from './schema';
import type { Book, BookContent, BookMetadata, Chapter } from '@/lib/types/books';

const BOOKS_DIR = path.join(process.cwd(), 'data', 'books');
const LEGACY_SINGLE_USER_ID = 'single-user';


export async function initBooksDb() {
  try {
    await fs.access(BOOKS_DIR);
  } catch {
    await fs.mkdir(BOOKS_DIR, { recursive: true });
  }
}

function mapRowToMetadata(row: typeof books.$inferSelect): BookMetadata {
  const metadata = row.metadata && typeof row.metadata === 'object'
    ? row.metadata as BookMetadata['metadata']
    : undefined;

  const preview = Array.isArray(row.preview) ? row.preview : [];

  return {
    id: row.id,
    title: row.title,
    level: row.level || '',
    language: row.language || metadata?.language,
    metadata,
    contentPath: row.contentPath || undefined,
    preview,
  };
}

export async function getBooksByUser(userId: string): Promise<BookMetadata[]> {
  await initBooksDb();
  const rows = await db
    .select()
    .from(books)
    .where(or(eq(books.userId, userId), isNull(books.userId)));

  return rows.map(mapRowToMetadata);
}

export async function getBooks(userId: string = LEGACY_SINGLE_USER_ID): Promise<BookMetadata[]> {
  return getBooksByUser(userId);
}

function normalizeChapter(input: unknown): Chapter {
  const safeInput = (input && typeof input === 'object' ? input : {}) as {
    title?: unknown;
    paragraphs?: unknown;
    content?: unknown;
  };

  const title = String(safeInput.title ?? 'Untitled');
  const paragraphsRaw = safeInput.paragraphs;
  if (Array.isArray(paragraphsRaw)) {
    const paragraphs: string[][] = paragraphsRaw
      .filter((p): p is unknown[] => Array.isArray(p))
      .map((p) => p.map(s => String(s ?? '')).filter(Boolean));

    // If paragraphs exist but are empty, fall back to legacy content if present.
    if (paragraphs.some(p => p.length > 0)) {
      const legacyContent = Array.isArray(safeInput.content)
        ? safeInput.content.map((s) => String(s ?? '')).filter(Boolean)
        : undefined;
      return { title, paragraphs, content: legacyContent };
    }
  }

  const content: string[] = Array.isArray(safeInput.content)
    ? safeInput.content.map((s) => String(s ?? '')).filter(Boolean)
    : [];

  return { title, paragraphs: [content], content };
}

function normalizeChapters(chaptersAny: unknown): Chapter[] {
  if (!Array.isArray(chaptersAny)) return [];
  return chaptersAny.map(normalizeChapter);
}

function flattenChapterSentences(chapter: Chapter): string[] {
  const paragraphs = Array.isArray(chapter?.paragraphs) ? chapter.paragraphs : [];
  return paragraphs.flatMap(p => (Array.isArray(p) ? p : [])).filter(Boolean);
}

export async function getBookById(id: string): Promise<Book | undefined> {
  const [bookRow] = await db
    .select()
    .from(books)
    .where(eq(books.id, id))
    .limit(1);
  const bookMeta = bookRow ? mapRowToMetadata(bookRow) : undefined;
  
  if (!bookMeta) return undefined;

  let chapters: Chapter[] = [];
  
  // Backward compatibility: If chapters exist in DB, use them
  if (bookMeta.chapters && Array.isArray(bookMeta.chapters)) {
     chapters = normalizeChapters(bookMeta.chapters);
  } 
  // New way: Load from external file
  else if (bookMeta.contentPath) {
    try {
      const contentPath = path.join(BOOKS_DIR, bookMeta.contentPath);
      const contentData = await fs.readFile(contentPath, 'utf-8');
      const bookContent = JSON.parse(contentData) as BookContent;
      chapters = normalizeChapters(bookContent?.chapters);
    } catch (err) {
      console.error(`Failed to load content for book ${id}:`, err);
    }
  }

  const language = bookMeta.language || bookMeta.metadata?.language;

  return { ...bookMeta, language, chapters };
}

export async function addBook(bookData: Omit<Book, 'id' | 'contentPath'> & { chapters: unknown[] }): Promise<BookMetadata> {
  const id = uuidv4();

  const normalizedChapters = normalizeChapters(bookData.chapters);
  
  // 1. Calculate stats
  const totalSentences = normalizedChapters.reduce((acc, c) => acc + flattenChapterSentences(c).length, 0);
  const preview = flattenChapterSentences(normalizedChapters[0]).slice(0, 2) || [];

  // 2. Save Content to separate file
  const contentFileName = `${id}.json`;
  const contentPath = path.join(BOOKS_DIR, contentFileName);
  
  const bookContent: BookContent = {
    schemaVersion: 2,
    id,
    chapters: normalizedChapters
  };
  
  await fs.writeFile(contentPath, JSON.stringify(bookContent, null, 2), 'utf-8');

  // 3. Save Metadata to DB
  const newBook: BookMetadata = {
    id,
    title: bookData.title,
    level: bookData.level,
    language: bookData.language || bookData.metadata?.language,
    metadata: {
      wordCount: bookData.metadata?.wordCount ?? 0,
      format: bookData.metadata?.format ?? 'text',
      ...(bookData.metadata || {}),
      sentenceCount: totalSentences,
      language: bookData.language || bookData.metadata?.language,
    },
    contentPath: contentFileName,
    preview
  };

  await db.insert(books).values({
    id,
    userId: LEGACY_SINGLE_USER_ID,
    title: newBook.title,
    level: newBook.level,
    language: newBook.language,
    metadata: newBook.metadata,
    contentPath: newBook.contentPath,
    preview: newBook.preview || [],
    createdAt: new Date(),
  });
  
  return newBook;
}

export async function addBookByUser(
  userId: string,
  bookData: Omit<Book, 'id' | 'contentPath'> & { chapters: unknown[] },
): Promise<BookMetadata> {
  const id = uuidv4();
  const normalizedChapters = normalizeChapters(bookData.chapters);
  const totalSentences = normalizedChapters.reduce((acc, c) => acc + flattenChapterSentences(c).length, 0);
  const preview = flattenChapterSentences(normalizedChapters[0]).slice(0, 2) || [];

  const contentFileName = `${id}.json`;
  const contentPath = path.join(BOOKS_DIR, contentFileName);

  const bookContent: BookContent = {
    schemaVersion: 2,
    id,
    chapters: normalizedChapters,
  };

  await fs.writeFile(contentPath, JSON.stringify(bookContent, null, 2), 'utf-8');

  const newBook: BookMetadata = {
    id,
    title: bookData.title,
    level: bookData.level,
    language: bookData.language || bookData.metadata?.language,
    metadata: {
      wordCount: bookData.metadata?.wordCount ?? 0,
      format: bookData.metadata?.format ?? 'text',
      ...(bookData.metadata || {}),
      sentenceCount: totalSentences,
      language: bookData.language || bookData.metadata?.language,
    },
    contentPath: contentFileName,
    preview,
  };

  await db.insert(books).values({
    id,
    userId,
    title: newBook.title,
    level: newBook.level,
    language: newBook.language,
    metadata: newBook.metadata,
    contentPath: newBook.contentPath,
    preview: newBook.preview || [],
    createdAt: new Date(),
  });

  return newBook;
}

export async function updateBook(id: string, updates: Partial<Book>): Promise<BookMetadata | undefined> {
  const [bookRow] = await db
    .select()
    .from(books)
    .where(and(eq(books.id, id), eq(books.userId, LEGACY_SINGLE_USER_ID)))
    .limit(1);

  if (!bookRow) return undefined;

  const oldBook = mapRowToMetadata(bookRow);
  
  // Update Content if chapters are provided
  if (updates.chapters) {
    const normalizedChapters = normalizeChapters(updates.chapters);
    
    // Recalculate stats if needed
    const totalSentences = normalizedChapters.reduce((acc, c) => acc + flattenChapterSentences(c).length, 0);
    const preview = flattenChapterSentences(normalizedChapters[0]).slice(0, 2) || [];
    
    // Update content file
    const contentFileName = oldBook.contentPath || `${id}.json`;
    const contentPath = path.join(BOOKS_DIR, contentFileName);
    
    const bookContent: BookContent = {
       schemaVersion: 2,
       id,
       chapters: normalizedChapters
    };
    
    await fs.writeFile(contentPath, JSON.stringify(bookContent, null, 2), 'utf-8');
    
    // Update metadata derived from content
    updates.metadata = {
        ...oldBook.metadata,
        ...updates.metadata,
        sentenceCount: totalSentences
    } as BookMetadata['metadata'];
    updates.preview = preview;
    updates.contentPath = contentFileName;
  }

  // Update Metadata
  // We need to be careful not to merge `chapters` into the metadata object in the array
  const safeUpdates: Partial<Book> = { ...updates };
  delete safeUpdates.chapters;

  const newBook: BookMetadata = {
    ...oldBook,
    ...safeUpdates,
    metadata: {
        wordCount: oldBook.metadata?.wordCount ?? 0,
        format: oldBook.metadata?.format ?? 'text',
        ...oldBook.metadata,
        ...(safeUpdates.metadata || {})
    },
    id: oldBook.id, // Ensure ID doesn't change
  };
  
  await db
    .update(books)
    .set({
      title: newBook.title,
      level: newBook.level,
      language: newBook.language,
      metadata: newBook.metadata,
      contentPath: newBook.contentPath,
      preview: newBook.preview || [],
    })
    .where(and(eq(books.id, id), eq(books.userId, LEGACY_SINGLE_USER_ID)));
  
  return newBook;
}

export async function updateBookByUser(
  userId: string,
  id: string,
  updates: Partial<Book>,
): Promise<BookMetadata | undefined> {
  const [bookRow] = await db
    .select()
    .from(books)
    .where(and(eq(books.id, id), eq(books.userId, userId)))
    .limit(1);

  if (!bookRow) return undefined;

  const oldBook = mapRowToMetadata(bookRow);

  if (updates.chapters) {
    const normalizedChapters = normalizeChapters(updates.chapters);
    const totalSentences = normalizedChapters.reduce((acc, c) => acc + flattenChapterSentences(c).length, 0);
    const preview = flattenChapterSentences(normalizedChapters[0]).slice(0, 2) || [];

    const contentFileName = oldBook.contentPath || `${id}.json`;
    const contentPath = path.join(BOOKS_DIR, contentFileName);

    const bookContent: BookContent = {
      schemaVersion: 2,
      id,
      chapters: normalizedChapters,
    };

    await fs.writeFile(contentPath, JSON.stringify(bookContent, null, 2), 'utf-8');

    updates.metadata = {
      ...oldBook.metadata,
      ...updates.metadata,
      sentenceCount: totalSentences,
    } as BookMetadata['metadata'];
    updates.preview = preview;
    updates.contentPath = contentFileName;
  }

  const safeUpdates: Partial<Book> = { ...updates };
  delete safeUpdates.chapters;
  const newBook: BookMetadata = {
    ...oldBook,
    ...safeUpdates,
    metadata: {
      wordCount: oldBook.metadata?.wordCount ?? 0,
      format: oldBook.metadata?.format ?? 'text',
      ...oldBook.metadata,
      ...(safeUpdates.metadata || {}),
    },
    id: oldBook.id,
  };

  await db
    .update(books)
    .set({
      title: newBook.title,
      level: newBook.level,
      language: newBook.language,
      metadata: newBook.metadata,
      contentPath: newBook.contentPath,
      preview: newBook.preview || [],
    })
    .where(and(eq(books.id, id), eq(books.userId, userId)));

  return newBook;
}

async function safeUnlink(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch (err: unknown) {
    // ignore missing file
    if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') return;
    throw err;
  }
}

export async function deleteBook(id: string): Promise<{ ok: boolean; deleted?: BookMetadata }> {
  await initBooksDb();
  const [bookRow] = await db
    .select()
    .from(books)
    .where(and(eq(books.id, id), eq(books.userId, LEGACY_SINGLE_USER_ID)))
    .limit(1);

  if (!bookRow) return { ok: false };
  const deleted = mapRowToMetadata(bookRow);

  await db
    .delete(books)
    .where(and(eq(books.id, id), eq(books.userId, LEGACY_SINGLE_USER_ID)));

  // Remove external content file if present
  if (deleted?.contentPath) {
    const contentPath = path.join(BOOKS_DIR, deleted.contentPath);
    await safeUnlink(contentPath);
  } else {
    // Legacy fallback: some older setups used id.json even without contentPath
    const legacyPath = path.join(BOOKS_DIR, `${id}.json`);
    await safeUnlink(legacyPath);
  }

  return { ok: true, deleted };
}

export async function deleteBookByUser(userId: string, id: string): Promise<{ ok: boolean; deleted?: BookMetadata }> {
  await initBooksDb();
  const [bookRow] = await db
    .select()
    .from(books)
    .where(and(eq(books.id, id), eq(books.userId, userId)))
    .limit(1);

  if (!bookRow) return { ok: false };
  const deleted = mapRowToMetadata(bookRow);

  await db
    .delete(books)
    .where(and(eq(books.id, id), eq(books.userId, userId)));

  if (deleted?.contentPath) {
    const contentPath = path.join(BOOKS_DIR, deleted.contentPath);
    await safeUnlink(contentPath);
  } else {
    const legacyPath = path.join(BOOKS_DIR, `${id}.json`);
    await safeUnlink(legacyPath);
  }

  return { ok: true, deleted };
}

export async function deleteAllBooksByUser(userId: string): Promise<{ ok: true; deletedCount: number }> {
  await initBooksDb();
  const userBooks = await db
    .select()
    .from(books)
    .where(eq(books.userId, userId));

  // 1) Best-effort delete referenced content files
  for (const b of userBooks) {
    if (b?.contentPath) {
      await safeUnlink(path.join(BOOKS_DIR, b.contentPath));
    } else if (b?.id) {
      await safeUnlink(path.join(BOOKS_DIR, `${b.id}.json`));
    }
  }

  await db
    .delete(books)
    .where(eq(books.userId, userId));

  return { ok: true, deletedCount: userBooks.length };
}

export async function deleteAllBooks(): Promise<{ ok: true; deletedCount: number }> {
  return deleteAllBooksByUser(LEGACY_SINGLE_USER_ID);
}
