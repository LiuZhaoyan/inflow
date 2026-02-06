import fs from 'fs/promises';
import path from 'path';
import { DEFAULT_PROGRESS, type MasteredSentence, type UserProgress } from '@/lib/types/progress';

const PROGRESS_FILE = path.join(process.cwd(), 'data', 'learn_progress.json');


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
    const parsed = JSON.parse(data);
    // Migrate old data: fill in new fields with defaults if missing
    return {
      ...DEFAULT_PROGRESS,
      ...parsed,
      performanceMetrics: {
        ...DEFAULT_PROGRESS.performanceMetrics,
        ...(parsed.performanceMetrics || {}),
      },
      learningProfile: {
        ...DEFAULT_PROGRESS.learningProfile,
        ...(parsed.learningProfile || {}),
      },
    };
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

  // Check if sentence already exists
  const exists = progress.masteredSentences.some(s =>
    s.content === sentence.content &&
    s.context === sentence.context &&
    (s.languageCode || '') === (sentence.languageCode || '')
  );
  if (!exists) {
    progress.masteredSentences.push(sentence);
  }
  
  // Update recent context
  const recentKey = `${sentence.languageCode || 'default'}:${sentence.content}`;
  if (!progress.recentContext.includes(recentKey)) {
    progress.recentContext.push(recentKey);
    if (progress.recentContext.length > 10) {
      progress.recentContext.shift();
    }
  }
  
  await updateProgress(progress);
}

export async function deleteMasteredSentence(id: string) {
  const progress = await getProgress();
  const existing = progress.masteredSentences || [];
  const toDelete = existing.find(s => s.id === id);

  progress.masteredSentences = existing.filter(s => s.id !== id);

  if (toDelete?.content && progress.recentContext) {
    const recentKey = `${toDelete.languageCode || 'default'}:${toDelete.content}`;
    progress.recentContext = progress.recentContext.filter(c => c !== recentKey);
  }

  await updateProgress(progress);
  return progress;
}

export async function resetProgress() {
    await fs.writeFile(PROGRESS_FILE, JSON.stringify(DEFAULT_PROGRESS, null, 2), 'utf-8');
    return DEFAULT_PROGRESS;
}

// ── Learning Profile helpers ────────────────────────────────────────────

export async function getLearningProfile() {
  const progress = await getProgress();
  return progress.learningProfile ?? DEFAULT_PROGRESS.learningProfile;
}

export async function updateLearningProfile(profile: UserProgress['learningProfile']) {
  const progress = await getProgress();
  progress.learningProfile = profile;
  progress.lastUpdated = Date.now();
  await updateProgress(progress);
  return profile;
}

export async function getDifficultyLevel(): Promise<number> {
  const progress = await getProgress();
  return progress.currentDifficultyLevel ?? DEFAULT_PROGRESS.currentDifficultyLevel;
}

export async function setDifficultyLevel(level: number) {
  const progress = await getProgress();
  progress.currentDifficultyLevel = Math.max(1, Math.min(10, level));
  progress.lastUpdated = Date.now();
  await updateProgress(progress);
  return progress.currentDifficultyLevel;
}

export async function setPlacementResult(level: number) {
  const clamped = Math.max(1, Math.min(10, level));
  const progress = await getProgress();
  progress.currentDifficultyLevel = clamped;
  progress.initialDifficultyLevel = clamped;
  progress.placementCompleted = true;
  progress.lastUpdated = Date.now();
  await updateProgress(progress);
  return progress;
}

export async function updatePerformanceMetrics(metrics: Partial<UserProgress['performanceMetrics']>) {
  const progress = await getProgress();
  progress.performanceMetrics = {
    ...(progress.performanceMetrics ?? DEFAULT_PROGRESS.performanceMetrics),
    ...metrics,
  };
  progress.lastUpdated = Date.now();
  await updateProgress(progress);
  return progress.performanceMetrics;
}
