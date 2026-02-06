export const CONTEXT_OPTIONS = [
    'Daily Conversation',
    'Airport',
    'Restaurant & Food',
    'Shopping',
    'Travel',
    'Business',
    'Emergency'
] as const;

export type ContextOption = typeof CONTEXT_OPTIONS[number];

export interface Msg {
    id: string;
    role: 'user' | 'ai';
    content: string;
}

export interface StoredChat {
    messages: Msg[];
    currentSentence: string;
    updatedAt: number;
}

export interface UserProfile {
    username: string;
    nativeLanguage: string;
    targetLanguage: string;
    currentLanguageCode?: string;
    isOnboarded?: boolean;
}

// ── Difficulty & Personalization Types ──────────────────────────────────

export interface PerformanceMetrics {
    avgResponseTimeMs: number;
    explainRequestRate: number;
    translateRequestRate: number;
    masterySpeed: number;           // sentences mastered per session
    totalSessions: number;
    totalSentencesMastered: number;
    lastSessionAt: number;
}

export interface LearningProfile {
    knownVocabulary: string[];
    weakVocabulary: Record<string, number>;  // token → mistake count
    masteredGrammar: string[];
    strugglingGrammar: string[];
    preferredContexts: string[];
    learningPace: 'slow' | 'normal' | 'fast';
    totalSentencesMastered: number;
    totalStudyTimeMs: number;
    lastUpdated: number;
}

export interface PlacementResult {
    level: number;                  // 1-10
    confidence: number;             // 0-1
    assessedAt: number;
}

export const DEFAULT_LEARNING_PROFILE: LearningProfile = {
    knownVocabulary: [],
    weakVocabulary: {},
    masteredGrammar: [],
    strugglingGrammar: [],
    preferredContexts: [],
    learningPace: 'normal',
    totalSentencesMastered: 0,
    totalStudyTimeMs: 0,
    lastUpdated: Date.now(),
};

export const DEFAULT_PERFORMANCE_METRICS: PerformanceMetrics = {
    avgResponseTimeMs: 0,
    explainRequestRate: 0,
    translateRequestRate: 0,
    masterySpeed: 0,
    totalSessions: 0,
    totalSentencesMastered: 0,
    lastSessionAt: 0,
};
