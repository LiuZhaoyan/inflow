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
  chapters?: unknown;
}

// Full content structure
export interface BookContent {
  schemaVersion?: 2;
  id: string;
  chapters: Chapter[];
}

// Combined type for the Reader
export type Book = BookMetadata & { chapters?: Chapter[] };
