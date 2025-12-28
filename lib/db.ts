import fs from 'fs/promises';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');

export interface Book {
  id: string;
  title: string;
  level: string;
  content: string[];
}

async function ensureDb() {
  try {
    await fs.access(DB_PATH);
  } catch {
    await fs.writeFile(DB_PATH, '[]', 'utf-8');
  }
}

export async function getBooks(): Promise<Book[]> {
  await ensureDb();
  const data = await fs.readFile(DB_PATH, 'utf-8');
  return JSON.parse(data);
}

export async function getBookById(id: string): Promise<Book | undefined> {
  const books = await getBooks();
  return books.find((book) => book.id === id);
}

export async function addBook(book: Omit<Book, 'id'>): Promise<Book> {
  const books = await getBooks();
  const newBook = { ...book, id: Date.now().toString() };
  books.push(newBook);
  await fs.writeFile(DB_PATH, JSON.stringify(books, null, 2), 'utf-8');
  return newBook;
}

