import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { SourceLanguage } from '../src/listening/desktop';

let koreanEntries: Record<string, string[]> | undefined;
let englishEntries: Record<string, string[]> | undefined;

export function dictionaryMeanings(lemma: string, language: SourceLanguage = 'ko'): string[] {
  const entries = language === 'en'
    ? (englishEntries ??= JSON.parse(readFileSync(path.join(__dirname, '../resources/dictionaries/english-zh.json'), 'utf8')).entries)
    : (koreanEntries ??= JSON.parse(readFileSync(path.join(__dirname, '../resources/dictionaries/krdict-zh.json'), 'utf8')).entries);
  const word = lemma.normalize('NFC');
  return entries && Object.hasOwn(entries, word) ? entries[word] : [];
}
