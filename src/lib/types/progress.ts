import {
  DEFAULT_LEARNING_PROFILE,
  DEFAULT_PERFORMANCE_METRICS,
  type LearningProfile,
  type PerformanceMetrics,
} from './learnTypes';

export interface MasteredSentence {
  id: string;
  content: string;
  translation?: string;
  masteredAt: number;
  difficultyLevel: number;
  audioPath?: string;
  context?: string;
  messageId?: string;
  languageCode?: string;
  reviewCount?: number;
  lastReviewedAt?: number;
}

export interface UserProgress {
  targetLanguage: string;
  currentDifficultyLevel: number; // 1-10 adaptive difficulty
  initialDifficultyLevel: number; // set by placement test
  masteredSentences: MasteredSentence[];
  recentContext: string[];
  performanceMetrics: PerformanceMetrics;
  learningProfile: LearningProfile;
  placementCompleted: boolean;
  lastUpdated: number;
}

export const DEFAULT_PROGRESS: UserProgress = {
  targetLanguage: 'ko',
  currentDifficultyLevel: 3,
  initialDifficultyLevel: 3,
  masteredSentences: [],
  recentContext: [],
  performanceMetrics: {
    ...DEFAULT_PERFORMANCE_METRICS,
  },
  learningProfile: {
    ...DEFAULT_LEARNING_PROFILE,
  },
  placementCompleted: false,
  lastUpdated: Date.now(),
};
