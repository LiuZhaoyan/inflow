// Utility functions for Reader components

export interface Chapter {
  title: string;
  paragraphs: string[][];
}

export function getImageKey(text: string): string | null {
  const match = text.match(/<<<IMAGE:([^>]+)>>>/);
  return match ? match[1] : null;
}

export function sanitizeParagraphs(paragraphs: string[][], chapterTitle?: string): string[][] {
  const titleLower = (chapterTitle || '').trim().toLowerCase();
  const cleaned = (paragraphs || [])
    .map(p =>
      (p || [])
        .map(s => (s ?? '').trim())
        .filter(Boolean)
        // common separators / markers from some EPUBs
        .filter(s => s !== '***' && s !== '* END *' && s !== 'END' && s !== '*** * END * ***')
    )
    .filter(p => p.length > 0);

  // If the chapter repeats its title as the first sentence, drop it to reduce noise.
  if (cleaned.length > 0 && cleaned[0].length > 0 && titleLower && cleaned[0][0].toLowerCase() === titleLower) {
    cleaned[0] = cleaned[0].slice(1);
    if (cleaned[0].length === 0) return cleaned.slice(1);
  }

  return cleaned;
}

export function normalizeChapters(chapters: { title: string; paragraphs?: string[][]; content?: string[] }[]): Chapter[] {
  return (chapters || []).map(c => {
    const title = c.title?.trim() || 'Untitled';
    const paragraphs =
      Array.isArray(c.paragraphs) && c.paragraphs.length > 0
        ? c.paragraphs
        : [Array.isArray(c.content) ? c.content : []];
    return {
      title,
      paragraphs: sanitizeParagraphs(paragraphs, title),
    };
  });
}

export function flattenChapterSentences(chapter: Chapter): string[] {
  return (chapter.paragraphs || []).flatMap(p => (Array.isArray(p) ? p : [])).filter(Boolean);
}

export function pickBodyChapters(chapters: Chapter[]): Chapter[] {
  const normalized = chapters.map(c => ({
    title: c.title?.trim() || 'Untitled',
    paragraphs: sanitizeParagraphs(c.paragraphs || [], c.title),
  }));

  // Heuristic 1 (strong): If the book has explicit "Chapter N" chapters, treat only those as正文.
  const chapterNumberRe = /^\s*chapter\s+\d+\s*$/i;
  const numbered = normalized.filter(c => chapterNumberRe.test(c.title));
  if (numbered.length >= 3) return numbered; // avoid false positives on random headings

  // Heuristic 2 (fallback): filter out common front-matter/metadata sections
  const noiseTitleRe = /(contents|table of contents|copyright|isbn|publisher|preface|foreword|about|introduction|title page)/i;
  return normalized.filter(c => {
    const sentenceCount = flattenChapterSentences(c).length;
    if (sentenceCount === 0) return false;
    if (noiseTitleRe.test(c.title)) return false;
    // very short sections are usually not body
    if (sentenceCount < 10) return false;
    return true;
  });
}

export function flatIndexToPosition(
  flatIndex: number,
  chapters: Chapter[]
): { chapterIndex: number; paragraphIndex: number; sentenceIndex: number } {
  let idx = Math.max(0, flatIndex);
  for (let c = 0; c < chapters.length; c++) {
    const paragraphs = chapters[c].paragraphs || [];
    for (let p = 0; p < paragraphs.length; p++) {
      const len = paragraphs[p]?.length || 0;
      if (idx < len) return { chapterIndex: c, paragraphIndex: p, sentenceIndex: idx };
      idx -= len;
    }
  }
  // fallback to last sentence of last chapter
  const lastChapterIndex = Math.max(0, chapters.length - 1);
  const lastParagraphIndex = Math.max(0, (chapters[lastChapterIndex]?.paragraphs?.length || 1) - 1);
  const lastSentenceIndex = Math.max(0, (chapters[lastChapterIndex]?.paragraphs?.[lastParagraphIndex]?.length || 1) - 1);
  return { chapterIndex: lastChapterIndex, paragraphIndex: lastParagraphIndex, sentenceIndex: lastSentenceIndex };
}

export function paragraphSentenceToFlatIndex(
  chapter: Chapter,
  paragraphIndex: number,
  sentenceIndex: number
): number {
  let flat = 0;
  for (let p = 0; p < (chapter.paragraphs || []).length; p++) {
    if (p === paragraphIndex) return flat + sentenceIndex;
    flat += chapter.paragraphs[p]?.length || 0;
  }
  return Math.max(0, flat - 1);
}

export function flatIndexToParagraphSentence(
  flatIndex: number,
  paragraphs: string[][]
): { paragraphIndex: number; sentenceIndex: number } {
  let idx = Math.max(0, flatIndex);
  for (let p = 0; p < (paragraphs || []).length; p++) {
    const len = paragraphs[p]?.length || 0;
    if (idx < len) return { paragraphIndex: p, sentenceIndex: idx };
    idx -= len;
  }
  const lastParagraphIndex = Math.max(0, (paragraphs?.length || 1) - 1);
  const lastSentenceIndex = Math.max(0, (paragraphs?.[lastParagraphIndex]?.length || 1) - 1);
  return { paragraphIndex: lastParagraphIndex, sentenceIndex: lastSentenceIndex };
}
