import { initBooksDb } from './books';
import { initProgressDb } from './progress';
import { initVocabularyDb } from './vocabulary';

export * from './books';
export * from './vocabulary';
export * from './progress';

export async function initializeDatabase() {
  await Promise.all([
    initBooksDb(),
    initProgressDb(),
    initVocabularyDb()
  ]);
}
