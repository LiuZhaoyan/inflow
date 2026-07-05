import { initProgressDb } from './progress';
import { initVocabularyDb } from './vocabulary';
import { initUserDb } from './user';
import { initStoriesDb } from './stories';

export * from './vocabulary';
export * from './progress';
export * from './user';
export * from './stories';
export * from './chatHistory';

export async function initializeDatabase() {
  await Promise.all([
    initProgressDb(),
    initVocabularyDb(),
    initUserDb(),
    initStoriesDb()
  ]);
}
