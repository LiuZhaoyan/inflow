import { NextResponse } from 'next/server';
import { addBook } from '@/lib/db';

export const runtime = 'nodejs';

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const files: File[] = [];
    // collect all file fields
    for (const entry of formData.entries()) {
      const [, value] = entry;
      if ((value as File).name) files.push(value as File);
    }

    if (files.length === 0) {
      return NextResponse.json({ error: 'No files uploaded' }, { status: 400 });
    }

    const savedBooks = [];
    for (const file of files) {
      // Read file content as text
      const text = await file.text();
      
      // Simple parsing: split by newlines or periods followed by space?
      // For now, let's split by non-empty lines to preserve some structure
      const content = text
        .split(/\r?\n/)
        .map(line => line.trim())
        .filter(line => line.length > 0);

      const title = file.name.replace(/\.[^/.]+$/, ""); // Remove extension
      
      const newBook = await addBook({
        title,
        level: 'Imported', // Default level for uploads
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
