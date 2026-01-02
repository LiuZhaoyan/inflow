import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');
const BOOKS_DIR = path.join(process.cwd(), 'data', 'books');

export interface Chapter {
  title: string;
  content: string[]; // sentences
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
  chapters?: Chapter[]; 
}

// Full content structure
export interface BookContent {
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

export async function getBookById(id: string): Promise<Book | undefined> {
  const books = await getBooks();
  const bookMeta = books.find((book) => book.id === id);
  
  if (!bookMeta) return undefined;

  let chapters: Chapter[] = [];
  
  // Backward compatibility: If chapters exist in DB, use them
  if (bookMeta.chapters && Array.isArray(bookMeta.chapters)) {
     chapters = bookMeta.chapters;
  } 
  // New way: Load from external file
  else if (bookMeta.contentPath) {
    try {
      const contentPath = path.join(BOOKS_DIR, bookMeta.contentPath);
      const contentData = await fs.readFile(contentPath, 'utf-8');
      const bookContent = JSON.parse(contentData) as BookContent;
      chapters = bookContent.chapters;
    } catch (err) {
      console.error(`Failed to load content for book ${id}:`, err);
    }
  }

  const language = bookMeta.language || bookMeta.metadata?.language;

  return { ...bookMeta, language, chapters };
}

export async function addBook(bookData: Omit<Book, 'id' | 'contentPath'> & { chapters: Chapter[] }): Promise<BookMetadata> {
  const books = await getBooks();
  const id = Date.now().toString();
  
  // 1. Calculate stats
  const totalSentences = bookData.chapters.reduce((acc, c) => acc + c.content.length, 0);
  const preview = bookData.chapters[0]?.content.slice(0, 2) || [];

  // 2. Save Content to separate file
  const contentFileName = `${id}.json`;
  const contentPath = path.join(BOOKS_DIR, contentFileName);
  
  const bookContent: BookContent = {
    id,
    chapters: bookData.chapters
  };
  
  await fs.writeFile(contentPath, JSON.stringify(bookContent, null, 2), 'utf-8');

  // 3. Save Metadata to DB
  const newBook: BookMetadata = {
    id,
    title: bookData.title,
    level: bookData.level,
    language: bookData.language || bookData.metadata?.language,
    metadata: {
      ...bookData.metadata!, // assert metadata exists or handle undefined
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
