import { NextResponse } from 'next/server';
import { addBook } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import EPub from 'epub2';
import * as cheerio from 'cheerio';
// pdf-parse doesn't have a default export compatible with some ESM setups easily
// eslint-disable-next-line @typescript-eslint/no-require-imports
const pdf = require('pdf-parse');

export const runtime = 'nodejs';

async function parsePdf(buffer: Buffer): Promise<string[]> {
  try {
    const data = await pdf(buffer);
    // Explicitly cast or ensure data.text is string
    const text = data.text as string;
    
    return text
      .split(/\r?\n/)
      .map((line: string) => line.trim())
      .filter((line: string) => line.length > 0);
  } catch (error) {
    console.error('Error parsing PDF:', error);
    throw new Error('Failed to parse PDF file');
  }
}

async function parseEpub(filePath: string): Promise<string[]> {
  try {
    // @ts-ignore - epub2 static createAsync might not be in the type definition
    const epub = await EPub.createAsync(filePath);
    const content: string[] = [];
    
    // epub.flow is an array of chapter objects
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const chapter of (epub.flow as any[])) {
      // @ts-ignore - getChapterAsync might not be in types
      const html = await epub.getChapterAsync(chapter.id);
      const $ = cheerio.load(html);
      
      const text = $('body').text();
      
      const lines = text
        .split(/\r?\n/)
        .map((line: string) => line.trim())
        .filter((line: string) => line.length > 0);
        
      content.push(...lines);
    }
    return content;
  } catch (error) {
    console.error('Error parsing EPUB:', error);
    throw error;
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files: File[] = [];
    for (const entry of formData.entries()) {
      const [, value] = entry;
      if ((value as File).name) files.push(value as File);
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    const uploadsDir = path.join(process.cwd(), 'uploads');
    await fs.promises.mkdir(uploadsDir, { recursive: true });

    const savedBooks = [];
    for (const file of files) {
      const buffer = Buffer.from(await file.arrayBuffer());
      const ext = path.extname(file.name).toLowerCase();
      
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = path.join(uploadsDir, safeName);
      await fs.promises.writeFile(filePath, buffer);

      let content: string[] = [];
      
      if (ext === '.pdf') {
        content = await parsePdf(buffer);
      } else if (ext === '.epub') {
        content = await parseEpub(filePath);
      } else {
        // Default to text parsing
        const text = buffer.toString('utf-8');
        content = text
          .split(/\r?\n/)
          .map((line: string) => line.trim())
          .filter((line: string) => line.length > 0);
      }

      const title = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
      
      const newBook = await addBook({
        title,
        level: 'Imported', 
        content
      });
      
      savedBooks.push(newBook);
    }

    return NextResponse.json({ ok: true, files: savedBooks.map(b => b.title), books: savedBooks });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
