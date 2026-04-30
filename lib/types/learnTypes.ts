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

// ── Difficulty & Personalization Types ──────────────────────────────────

export interface PerformanceMetrics {
    avgResponseTimeMs: number;
    explainRequests: number;
    translateRequests: number;
    totalRequests: number;
    totalSessions: number;
    totalSentencesMastered: number;
    lastSessionAt: number;
}

export interface LearningProfile {
    weakVocabulary: Record<string, number>;  // token → mistake count
    grammarStatus: Record<string, number>;    // grammar point -> mastery level
    learningPace: 'slow' | 'normal' | 'fast';
    totalStudyTimeMs: number;
}

export interface PlacementResult {
    level: number;                  // 1-10
    confidence: number;             // 0-1
    assessedAt: number;
}

export const DEFAULT_LEARNING_PROFILE: LearningProfile = {
    weakVocabulary: {},
    grammarStatus: {},
    learningPace: 'normal',
    totalStudyTimeMs: 0,
};

export const DEFAULT_PERFORMANCE_METRICS: PerformanceMetrics = {
    avgResponseTimeMs: 0,
    explainRequests: 0,
    translateRequests: 0,
    totalRequests: 0,
    totalSessions: 0,
    totalSentencesMastered: 0,
    lastSessionAt: 0,
};
