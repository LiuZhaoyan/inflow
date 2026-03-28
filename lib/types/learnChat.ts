export type LearnAction = 'init' | 'explain' | 'translate' | 'understand';

export interface ActionPayload {
    action: LearnAction;
    context?: string;
    queuedAt?: number;
}

export interface ChatHistoryRow {
    id: string;
    role: 'user' | 'ai';
    content: string;
    messageType?: string;
    originalSentence?: string;
}

export interface DerivedSentenceState {
    sentence: string;
    messageId: string | null;
}
