import fs from 'fs/promises';
import path from 'path';

const PROGRESS_FILE = path.join(process.cwd(), 'data', 'learn_progress.json');

export interface MasteredSentence {
  id: string;
  content: string;
  translation?: string;
  masteredAt: number;
  difficultyLevel: number;
  audioPath?: string;
}

export interface UserProgress {
  targetLanguage: string;
  userLevel: 'beginner' | 'intermediate' | 'advanced';
  masteredSentences: MasteredSentence[];
  recentContext: string[]; 
}

const DEFAULT_PROGRESS: UserProgress = {
  targetLanguage: 'ko', // Defaulting to Korean as seen in vocabulary examples
  userLevel: 'beginner',
  masteredSentences: [],
  recentContext: [],
};

export async function initProgressDb() {
  try {
    await fs.access(PROGRESS_FILE);
  } catch {
    // Ensure data directory exists
    const dataDir = path.dirname(PROGRESS_FILE);
    try {
       await fs.access(dataDir);
    } catch {
       await fs.mkdir(dataDir, { recursive: true });
    }
    await fs.writeFile(PROGRESS_FILE, JSON.stringify(DEFAULT_PROGRESS, null, 2), 'utf-8');
  }
}

export async function getProgress(): Promise<UserProgress> {
  await initProgressDb();
  const data = await fs.readFile(PROGRESS_FILE, 'utf-8');
  try {
    return JSON.parse(data);
  } catch (e) {
    return DEFAULT_PROGRESS;
  }
}

export async function updateProgress(newProgress: Partial<UserProgress>) {
  const current = await getProgress();
  const updated = { ...current, ...newProgress };
  await fs.writeFile(PROGRESS_FILE, JSON.stringify(updated, null, 2), 'utf-8');
  return updated;
}

export async function saveMasteredSentence(sentence: MasteredSentence) {
  const progress = await getProgress();
  
  // Create a new array if it doesn't exist
  if (!progress.masteredSentences) progress.masteredSentences = [];
  if (!progress.recentContext) progress.recentContext = [];

  progress.masteredSentences.push(sentence);
  
  // Update recent context
  progress.recentContext.push(sentence.content);
  if (progress.recentContext.length > 10) {
    progress.recentContext.shift();
  }
  
  await updateProgress(progress);
}

export async function resetProgress() {
    await fs.writeFile(PROGRESS_FILE, JSON.stringify(DEFAULT_PROGRESS, null, 2), 'utf-8');
    return DEFAULT_PROGRESS;
}
