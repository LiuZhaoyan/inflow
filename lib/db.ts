import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');
const BOOKS_DIR = path.join(process.cwd(), 'data', 'books');

export interface Chapter {
  title: string;
  // v2: paragraphs -> sentences
  paragraphs: string[][];
  // legacy (v1): flat sentence list (kept for back-compat when reading old content files)
  content?: string[];
}

// Lightweight metadata for lists
export interface BookMetadata {
  id: string;
  title: string;
  level: string;
  language?: string;
  metadata?: {
    wordCount: number;
    sentenceCount?: number;
    format: string;
    originalFilename?: string;
    language?: string;
    languageReason?: string;
  };
  contentPath?: string; // Path to the content file relative to data/books/
  // Optional: Preview sentences for the card
  preview?: string[];
  // Legacy support for migration
  chapters?: any;
}

// Full content structure
export interface BookContent {
  schemaVersion?: 2;
  id: string;
  chapters: Chapter[];
}

// Combined type for the Reader
export type Book = BookMetadata & { chapters?: Chapter[] };

async function ensureDb() {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, '[]', 'utf-8');
  }
  
  try {
    await fs.access(BOOKS_DIR);
  } catch {
    await fs.mkdir(BOOKS_DIR, { recursive: true });
  }
}

export async function getBooks(): Promise<BookMetadata[]> {
  await ensureDb();
  const data = await fs.readFile(DB_PATH, 'utf-8');
  return JSON.parse(data);
}

function normalizeChapter(input: any): Chapter {
  const title = String(input?.title ?? 'Untitled');
  const paragraphsRaw = input?.paragraphs;
  if (Array.isArray(paragraphsRaw)) {
    const paragraphs: string[][] = paragraphsRaw
      .filter((p: any) => Array.isArray(p))
      .map((p: any[]) => p.map(s => String(s ?? '')).filter(Boolean));

    // If paragraphs exist but are empty, fall back to legacy content if present.
    if (paragraphs.some(p => p.length > 0)) {
      return { title, paragraphs, content: Array.isArray(input?.content) ? input.content : undefined };
    }
  }

  const content: string[] = Array.isArray(input?.content)
    ? input.content.map((s: any) => String(s ?? '')).filter(Boolean)
    : [];

  return { title, paragraphs: [content], content };
}

function normalizeChapters(chaptersAny: any): Chapter[] {
  if (!Array.isArray(chaptersAny)) return [];
  return chaptersAny.map(normalizeChapter);
}

function flattenChapterSentences(chapter: Chapter): string[] {
  const paragraphs = Array.isArray(chapter?.paragraphs) ? chapter.paragraphs : [];
  return paragraphs.flatMap(p => (Array.isArray(p) ? p : [])).filter(Boolean);
}

export async function getBookById(id: string): Promise<Book | undefined> {
  const books = await getBooks();
  const bookMeta = books.find((book) => book.id === id);
  
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

export async function addBook(bookData: Omit<Book, 'id' | 'contentPath'> & { chapters: any[] }): Promise<BookMetadata> {
  const books = await getBooks();
  const id = Date.now().toString();

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
      ...(bookData.metadata || { wordCount: 0, format: 'text' }),
      sentenceCount: totalSentences,
      language: bookData.language || bookData.metadata?.language,
    },
    contentPath: contentFileName,
    preview
  };

  books.push(newBook);
  await fs.writeFile(DB_PATH, JSON.stringify(books, null, 2), 'utf-8');
  
  return newBook;
}

async function safeUnlink(filePath: string) {
  try {
    await fs.unlink(filePath);
  } catch (err: any) {
    // ignore missing file
    if (err?.code === 'ENOENT') return;
    throw err;
  }
}

export async function deleteBook(id: string): Promise<{ ok: boolean; deleted?: BookMetadata }> {
  await ensureDb();
  const books = await getBooks();
  const idx = books.findIndex(b => b.id === id);
  if (idx === -1) return { ok: false };

  const deleted = books[idx];
  const next = [...books.slice(0, idx), ...books.slice(idx + 1)];
  await fs.writeFile(DB_PATH, JSON.stringify(next, null, 2), 'utf-8');

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

export async function deleteAllBooks(): Promise<{ ok: true; deletedCount: number }> {
  await ensureDb();
  const books = await getBooks();

  // 1) Best-effort delete referenced content files
  for (const b of books) {
    if (b?.contentPath) {
      await safeUnlink(path.join(BOOKS_DIR, b.contentPath));
    } else if (b?.id) {
      await safeUnlink(path.join(BOOKS_DIR, `${b.id}.json`));
    }
  }

  // 2) Also delete any leftover json content files (orphans)
  try {
    const files = await fs.readdir(BOOKS_DIR);
    const jsonFiles = files.filter(f => f.toLowerCase().endsWith('.json'));
    for (const f of jsonFiles) {
      await safeUnlink(path.join(BOOKS_DIR, f));
    }
  } catch (err: any) {
    if (err?.code !== 'ENOENT') throw err;
  }

  // 3) Clear DB index
  await fs.writeFile(DB_PATH, '[]', 'utf-8');
  return { ok: true, deletedCount: books.length };
}
