import * as cheerio from 'cheerio';
import EPub from 'epub2';

export interface ProcessedBook {
  title: string;
  author?: string;
  chapters: { title: string; content: string[] }[];
  metadata: {
    wordCount: number;
    sentenceCount: number;
    difficultyScore?: number;
    format: string;
  };
}

// Helper: Split text into sentences (using Intl.Segmenter if available, or regex fallback)
function splitIntoSentences(text: string): string[] {
  // Simple fallback for cleanup
  const cleanText = text.replace(/\r\n/g, '\n').trim();
  if (!cleanText) return [];

  try {
    const segmenter = new Intl.Segmenter('en', { granularity: 'sentence' });
    return Array.from(segmenter.segment(cleanText)).map(s => s.segment.trim()).filter(s => s.length > 0);
  } catch (e) {
    // Fallback regex for environments without Intl.Segmenter
    return cleanText.match(/[^.!?]+[.!?]+(?=\s|$)/g)?.map(s => s.trim()) || [cleanText];
  }
}

// Helper: Basic difficulty analysis (Average Word Length + Sentence Length)
function analyzeDifficulty(sentences: string[]): number {
  if (sentences.length === 0) return 0;
  
  const totalWords = sentences.reduce((acc, s) => acc + s.split(/\s+/).length, 0);
  const avgSentenceLength = totalWords / sentences.length;
  
  // Heuristic score (0-100)
  // Avg sentence length > 20 is "hard", < 10 is "easy"
  return Math.min(100, Math.max(0, (avgSentenceLength - 5) * 4));
}

// --- Format Parsers ---

async function parsePdf(buffer: Buffer): Promise<string> {
  try {
    // Lazy-load pdf parsing deps so EPUB/TXT uploads don't crash at module load time.
    // `pdf-parse` (and its pdfjs/canvas deps) can throw during import in some runtimes.
    const mod: any = await import('pdf-parse');
    const pdfParse: any = mod?.default ?? mod;

    const data = await pdfParse(buffer);
    return data.text;
  } catch (error) {
    console.error('PDF Parse Error:', error);
    // Keep this message user-friendly; the raw error still logs server-side.
    throw new Error('Failed to parse PDF');
  }
}

async function parseEpub(filePath: string): Promise<{ title: string; chapters: { title: string; content: string[] }[] }> {
  // @ts-ignore - EPub types are sometimes tricky
  const epub = await EPub.createAsync(filePath);
  const chapters = [];

  const isHtmlLike = (mime?: string) => {
    const m = (mime || '').toLowerCase().trim();
    return m === 'application/xhtml+xml' || m === 'text/html' || m.endsWith('+xml') || m.includes('html');
  };
  
  // @ts-ignore
  for (const chapter of epub.flow) {
    let html: string | null = null;
    try {
      // @ts-ignore
      html = await epub.getChapterAsync(chapter.id);
    } catch (err) {
      // Some EPUBs mark chapters as `text/html`, but epub2's getChapterRaw() only accepts
      // `application/xhtml+xml` (and svg). Fallback to reading the raw file contents.
      // @ts-ignore
      const meta = (epub as any).manifest?.[chapter.id];
      const declaredMime = meta?.['media-type'] as string | undefined;

      if (isHtmlLike(declaredMime)) {
        try {
          // Returns [Buffer, mimeType]
          const [buf] = await (epub as any).getFileAsync(chapter.id);
          html = buf?.toString('utf-8') ?? null;
        } catch (err2) {
          console.warn('EPUB chapter fallback read failed:', chapter?.id, err2);
          html = null;
        }
      } else {
        console.warn('Skipping non-HTML EPUB item in flow:', chapter?.id, declaredMime);
      }
    }

    if (!html) continue;
    const $ = cheerio.load(html);
    const text = $('body').text().trim();
    if (text) {
      chapters.push({
        title: chapter.title || chapter.id,
        content: splitIntoSentences(text)
      });
    }
  }
  
  return {
    title: epub.metadata.title || 'Untitled EPUB',
    chapters
  };
}

function parseSRT(content: string): string[] {
  // Remove timestamps and numbers, keep text
  const lines = content.split(/\r?\n/);
  const textLines = lines.filter(line => {
    // Filter out timestamps like 00:00:10,500 --> 00:00:13,000
    if (line.includes('-->')) return false;
    // Filter out pure numbers (indices)
    if (/^\d+$/.test(line.trim())) return false;
    return line.trim().length > 0;
  });
  
  // Join lines that are part of the same sentence (heuristic)
  return splitIntoSentences(textLines.join(" "));
}

export async function processDocument(
  fileBuffer: Buffer, 
  fileName: string, 
  mimeType: string,
  filePath?: string // Needed for EPUB
): Promise<ProcessedBook> {
  let rawText = '';
  let chapters: { title: string; content: string[] }[] = [];
  let title = fileName.replace(/\.[^/.]+$/, "");
  let format = 'text';

  const ext = fileName.split('.').pop()?.toLowerCase();

  if (ext === 'pdf') {
    format = 'pdf';
    rawText = await parsePdf(fileBuffer);
    // Naive chapter detection for PDF (can be improved)
    chapters = [{ title: 'Full Text', content: splitIntoSentences(rawText) }];
  } 
  else if (ext === 'epub' && filePath) {
    format = 'epub';
    const epubData = await parseEpub(filePath);
    title = epubData.title || title;
    chapters = epubData.chapters;
  } 
  else if (ext === 'srt' || ext === 'vtt') {
    format = 'subtitle';
    const content = fileBuffer.toString('utf-8');
    const sentences = parseSRT(content);
    chapters = [{ title: 'Subtitles', content: sentences }];
  }
  else {
    // Default Text
    rawText = fileBuffer.toString('utf-8');
    chapters = [{ title: 'Content', content: splitIntoSentences(rawText) }];
  }

  // Aggregate stats
  let totalSentences = 0;
  let totalWords = 0;
  
  chapters.forEach(c => {
    totalSentences += c.content.length;
    totalWords += c.content.reduce((acc, s) => acc + s.split(/\s+/).length, 0);
  });

  // Calculate generic difficulty if not set
  const difficultyScore = analyzeDifficulty(chapters.flatMap(c => c.content));

  return {
    title,
    chapters,
    metadata: {
      wordCount: totalWords,
      sentenceCount: totalSentences,
      difficultyScore,
      format
    }
  };
}