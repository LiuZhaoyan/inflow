import { readFileSync } from 'node:fs';
import path from 'node:path';

let entries: Record<string, string[]> | undefined;

export function dictionaryMeanings(lemma: string): string[] {
  entries ??= JSON.parse(readFileSync(path.join(__dirname, '../resources/dictionaries/krdict-zh.json'), 'utf8')).entries;
  const word = lemma.normalize('NFC');
  return entries && Object.hasOwn(entries, word) ? entries[word] : [];
}
