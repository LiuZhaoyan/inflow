import { NextResponse } from 'next/server';
import { addBook } from '@/lib/db';
import fs from 'fs';
import path from 'path';
import { processDocument } from '@/lib/textProcessor';
import { detectLanguageFromSentences, normalizeLanguageCode } from '@/lib/language';

export const runtime = 'nodejs';

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
    const uploadedFilenames: string[] = [];
    for (const file of files) {
      uploadedFilenames.push(file.name);
      const buffer = Buffer.from(await file.arrayBuffer());
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const filePath = path.join(uploadsDir, safeName);
      
      // Save file physically (useful for EPUBs or caching)
      await fs.promises.writeFile(filePath, buffer);

      // Process content
      const processed = await processDocument(buffer, file.name, file.type, filePath);
      const sampleSentences = processed.chapters
        .flatMap(c => c.paragraphs.flatMap(p => p))
        .slice(0, 120);
      const languageGuess = detectLanguageFromSentences(sampleSentences);
      const normalizedLanguage = normalizeLanguageCode(languageGuess.code);

      // Determine Level based on score
      let level = 'Intermediate';
      const score = processed.metadata.difficultyScore || 50;
      if (score < 30) level = 'Beginner';
      if (score > 70) level = 'Advanced';

      const newBook = await addBook({
        title: processed.title,
        level,
        language: normalizedLanguage !== 'auto' ? normalizedLanguage : undefined,
        chapters: processed.chapters,
        metadata: {
          wordCount: processed.metadata.wordCount,
          format: processed.metadata.format,
          originalFilename: file.name,
          language: normalizedLanguage !== 'auto' ? normalizedLanguage : undefined,
          languageReason: languageGuess.reason,
        }
      });
      
      savedBooks.push(newBook);
    }

    return NextResponse.json({ ok: true, books: savedBooks, files: uploadedFilenames });
  } catch (err) {
    console.error("Upload error:", err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}