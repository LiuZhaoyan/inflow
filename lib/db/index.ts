import { initBooksDb } from './books';
import { initProgressDb } from './progress';
import { initVocabularyDb } from './vocabulary';
import { initUserDb } from './user';
import { initStoriesDb } from './stories';

export * from './books';
export * from './vocabulary';
export * from './progress';
export * from './user';
export * from './stories';
export * from './chatHistory';

export async function initializeDatabase() {
  await Promise.all([
    initBooksDb(),
    initProgressDb(),
    initVocabularyDb(),
    initUserDb(),
    initStoriesDb()
  ]);
}
