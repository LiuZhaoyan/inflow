export const CONTEXT_OPTIONS = [
    'Daily Conversation',
    'Airport',
    'Restaurant & Food',
    'Shopping',
    'Travel',
    'Business',
    'Emergency'
] as const;

export interface Msg {
    id: string;
    role: 'user' | 'ai';
    content: string;
    userAction?: LearnAction;
    messageType?: string;
}

export interface PerformanceMetrics {
    avgResponseTimeMs: number;
    explainRequests: number;
    translateRequests: number;
    totalRequests: number;
    totalSessions: number;
    totalSentencesMastered: number;
    lastSessionAt: number;
}

export type LearningPace = 'slow' | 'normal' | 'fast';
export type SupportTermSource = 'explain' | 'too_hard' | 'legacy';
export type ComprehensionRating = 'too_hard' | 'just_right' | 'too_easy';

export interface SupportTerm {
    term: string;
    score: number;
    lastSeenAt: number;
    source: SupportTermSource;
}

export interface ComprehensionSignal {
    rating: ComprehensionRating;
    at: number;
}

export interface RecentComprehension {
    window: ComprehensionSignal[];
    tooHardStreak: number;
    tooEasyStreak: number;
    justRightStreak: number;
}

export interface LearningProfile {
    schemaVersion: 2;
    supportTerms: SupportTerm[];
    recentComprehension: RecentComprehension;
    learningPace: LearningPace;
}

export const DEFAULT_LEARNING_PROFILE: LearningProfile = {
    schemaVersion: 2,
    supportTerms: [],
    recentComprehension: {
        window: [],
        tooHardStreak: 0,
        tooEasyStreak: 0,
        justRightStreak: 0,
    },
    learningPace: 'normal',
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

const MAX_SUPPORT_TERMS = 24;
const MAX_COMPREHENSION_WINDOW = 12;

function isRecord(value: unknown): value is Record<string, unknown> {
    return Boolean(value && typeof value === 'object' && !Array.isArray(value));
}

function normalizeLearningPace(value: unknown): LearningPace {
    return value === 'slow' || value === 'fast' ? value : 'normal';
}

function normalizeSupportTermSource(value: unknown): SupportTermSource {
    if (value === 'explain' || value === 'too_hard' || value === 'legacy') return value;
    return 'legacy';
}

function normalizeSupportTerms(raw: unknown): SupportTerm[] {
    const now = Date.now();
    const terms: SupportTerm[] = [];

    if (Array.isArray(raw)) {
        for (const item of raw) {
            if (!isRecord(item)) continue;
            const term = typeof item.term === 'string' ? item.term.trim() : '';
            if (!term) continue;
            const score = typeof item.score === 'number' && Number.isFinite(item.score) ? item.score : 1;
            const lastSeenAt = typeof item.lastSeenAt === 'number' && Number.isFinite(item.lastSeenAt)
                ? item.lastSeenAt
                : now;
            terms.push({
                term,
                score,
                lastSeenAt,
                source: normalizeSupportTermSource(item.source),
            });
        }
    } else if (isRecord(raw)) {
        for (const [term, score] of Object.entries(raw)) {
            const cleanTerm = term.trim();
            if (!cleanTerm) continue;
            terms.push({
                term: cleanTerm,
                score: typeof score === 'number' && Number.isFinite(score) ? score : 1,
                lastSeenAt: now,
                source: 'legacy',
            });
        }
    }

    const merged = new Map<string, SupportTerm>();
    for (const item of terms) {
        const key = item.term.toLowerCase();
        const existing = merged.get(key);
        if (!existing) {
            merged.set(key, item);
            continue;
        }
        merged.set(key, {
            term: existing.term,
            score: existing.score + item.score,
            lastSeenAt: Math.max(existing.lastSeenAt, item.lastSeenAt),
            source: existing.source === 'legacy' ? item.source : existing.source,
        });
    }

    return Array.from(merged.values())
        .sort((a, b) => b.score - a.score || b.lastSeenAt - a.lastSeenAt)
        .slice(0, MAX_SUPPORT_TERMS);
}

function normalizeRecentComprehension(raw: unknown): RecentComprehension {
    const source = isRecord(raw) ? raw : {};
    const window: ComprehensionSignal[] = [];
    if (Array.isArray(source.window)) {
        for (const item of source.window) {
            if (!isRecord(item)) continue;
            const rating = item.rating;
            if (rating !== 'too_hard' && rating !== 'just_right' && rating !== 'too_easy') continue;
            window.push({
                rating,
                at: typeof item.at === 'number' && Number.isFinite(item.at) ? item.at : Date.now(),
            });
        }
    }

    return {
        window: window.slice(-MAX_COMPREHENSION_WINDOW),
        tooHardStreak: typeof source.tooHardStreak === 'number' ? Math.max(0, source.tooHardStreak) : 0,
        tooEasyStreak: typeof source.tooEasyStreak === 'number' ? Math.max(0, source.tooEasyStreak) : 0,
        justRightStreak: typeof source.justRightStreak === 'number' ? Math.max(0, source.justRightStreak) : 0,
    };
}

export function normalizeLearningProfile(raw: unknown): LearningProfile {
    const source = isRecord(raw) ? raw : {};

    return {
        schemaVersion: 2,
        supportTerms: normalizeSupportTerms(source.supportTerms ?? source.weakVocabulary),
        recentComprehension: normalizeRecentComprehension(source.recentComprehension),
        learningPace: normalizeLearningPace(source.learningPace),
    };
}
import type { LearnAction } from '@/lib/types/learnChat';
