import type { Msg } from '@/lib/types/learnTypes';
import type { ChatHistoryRow } from '@/lib/types/learnChat';
import { deriveCurrentSentence } from '@/hooks/learn/utils/chatHistory';

export interface StoredChatViewModel {
    messages: Msg[];
    currentSentence: string;
    currentSentenceMessageId: string | null;
}

export interface LearnChatActionViewModel {
    aiMessageId: string;
    response: string;
    normalizedType: string;
    originalSentence?: string;
    difficulty?: {
        level?: number;
        direction?: 'decrease' | 'maintain' | 'increase';
        performance?: string;
    };
}

export function mapChatHistoryRowsToViewModel(rows: ChatHistoryRow[]): StoredChatViewModel {
    const messages: Msg[] = rows.map((row, index) => {
        const action = row.userAction ?? (row.role === 'ai' ? rows[index - 1]?.userAction : undefined);
        return {
            id: row.id,
            role: row.role,
            content: row.content,
            ...(action ? { userAction: action } : {}),
            ...(row.messageType ? { messageType: row.messageType } : {}),
        };
    });

    const sentenceState = deriveCurrentSentence(rows);

    return {
        messages,
        currentSentence: sentenceState.sentence,
        currentSentenceMessageId: sentenceState.messageId,
    };
}

export function mapLearnChatActionResponseToViewModel(data: unknown): LearnChatActionViewModel {
    const payload = (data ?? {}) as {
        messageId?: unknown;
        response?: unknown;
        type?: unknown;
        original?: unknown;
        difficulty?: {
            level?: unknown;
            direction?: unknown;
            performance?: unknown;
        };
    };

    const response = typeof payload.response === 'string' ? payload.response : '';

    return {
        aiMessageId: typeof payload.messageId === 'string' ? payload.messageId : `${Date.now()}ai`,
        response,
        normalizedType: typeof payload.type === 'string' ? payload.type.toLowerCase() : '',
        originalSentence: typeof payload.original === 'string' ? payload.original : undefined,
        difficulty: payload.difficulty
            ? {
                level: typeof payload.difficulty.level === 'number' ? payload.difficulty.level : undefined,
                direction: payload.difficulty.direction === 'decrease' || payload.difficulty.direction === 'maintain' || payload.difficulty.direction === 'increase'
                    ? payload.difficulty.direction
                    : undefined,
                performance: typeof payload.difficulty.performance === 'string' ? payload.difficulty.performance : undefined,
            }
            : undefined,
    };
}
