import type { ActionPayload, ChatHistoryRow } from '@/lib/types/learnChat';
import type { MasteredSentence } from '@/lib/types/progress';
import type { UserProfile } from '@/lib/types/user';
import { fetchWithRetry } from '@/lib/http/fetch-with-retry';
import { parseRetryAfterMs } from '@/hooks/learn/utils/cooldownPolicy';

// ponytail: fallback for envs where crypto.randomUUID isn't available (non-HTTPS, old browsers)
function generateUUID(): string {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) return crypto.randomUUID();
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
        const r = (crypto.getRandomValues(new Uint8Array(1))[0] & 15) >> (c === 'x' ? 0 : 3);
        return (c === 'x' ? r : (r & 0x3) | 0x8).toString(16);
    });
}

const RETRY_AFTER_FALLBACK_MS = 10000;

export interface LearnChatApiError extends Error {
    status?: number;
    retryAfterMs?: number;
}

export interface PlacementStatus {
    completed: boolean;
    level: number;
}

export interface LearnChatActionRequest extends ActionPayload {
    currentSentence: string;
    messageId: string | null;
    languageCode: string;
}

export interface LearnChatActionResponse {
    messageId?: string;
    response?: string;
    type?: string;
    original?: string;
    iPlusOne?: {
        challengeType?: string;
        challengeLabel?: string;
        familiarAnchors?: string[];
    };
    difficulty?: {
        level?: number;
        direction?: 'decrease' | 'maintain' | 'increase';
        performance?: string;
    };
}

export type LearnFeedbackRating = 'too_hard' | 'just_right' | 'too_easy';

export interface LearnFeedbackRequest {
    messageId: string | null;
    sentence: string;
    languageCode: string;
    context?: string;
    rating: LearnFeedbackRating;
}

export interface LearnFeedbackResponse {
    learningProfileUpdated?: boolean;
    difficulty?: {
        level?: number;
        direction?: 'decrease' | 'maintain' | 'increase';
        performance?: string;
    };
}

function createApiError(message: string, status?: number, retryAfterMs?: number): LearnChatApiError {
    const err = new Error(message) as LearnChatApiError;
    err.status = status;
    err.retryAfterMs = retryAfterMs;
    return err;
}

export async function fetchProfile(): Promise<UserProfile | null> {
    const res = await fetch('/api/user');
    if (!res.ok) {
        return null;
    }

    const data = await res.json() as { profile?: UserProfile };
    return data.profile ?? null;
}

export async function updateCurrentLanguageCode(languageCode: string): Promise<void> {
    await fetch('/api/user', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentLanguageCode: languageCode }),
    });
}

export async function fetchPlacementStatus(): Promise<PlacementStatus> {
    const res = await fetch('/api/placement-test');
    if (!res.ok) {
        return {
            completed: false,
            level: 3,
        };
    }

    const data = await res.json() as { completed?: boolean; level?: number };
    return {
        completed: data.completed ?? false,
        level: data.level ?? 3,
    };
}

export async function fetchMasteredSentences(languageCode: string): Promise<MasteredSentence[]> {
    const res = await fetch(`/api/mastered-sentences?languageCode=${languageCode}`);
    if (!res.ok) {
        throw new Error('Failed to fetch mastered sentences');
    }

    const data = await res.json() as { sentences?: MasteredSentence[] };
    return Array.isArray(data.sentences) ? data.sentences : [];
}

export async function deleteMasteredSentence(id: string, languageCode: string): Promise<MasteredSentence[] | null> {
    const res = await fetch('/api/mastered-sentences', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, languageCode }),
    });

    if (!res.ok) {
        throw new Error('Delete failed');
    }

    const data = await res.json() as { sentences?: MasteredSentence[] };
    return Array.isArray(data.sentences) ? data.sentences : null;
}

export async function fetchChatHistory(language: string, context: string): Promise<ChatHistoryRow[] | null> {
    const params = new URLSearchParams({ lang: language, context });
    const res = await fetch(`/api/chat-history?${params.toString()}`);
    if (!res.ok) {
        return null;
    }

    const data = await res.json() as { messages?: ChatHistoryRow[] };
    return Array.isArray(data.messages) ? data.messages : [];
}

export async function postLearnChatAction(input: LearnChatActionRequest): Promise<LearnChatActionResponse> {
    const requestId = generateUUID();
    const res = await fetchWithRetry('/api/learn-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: input.action,
            requestId,
            currentSentence: input.currentSentence,
            context: input.context,
            messageId: input.messageId,
            languageCode: input.languageCode,
        }),
    });

    if (!res.ok) {
        const retryAfterMs = parseRetryAfterMs(res.headers.get('Retry-After'), RETRY_AFTER_FALLBACK_MS);
        throw createApiError('API Error', res.status, retryAfterMs);
    }

    return await res.json() as LearnChatActionResponse;
}

export async function postLearnFeedback(input: LearnFeedbackRequest): Promise<LearnFeedbackResponse> {
    const res = await fetch('/api/learn-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
    });

    if (!res.ok) {
        throw createApiError('Feedback API Error', res.status);
    }

    return await res.json() as LearnFeedbackResponse;
}
