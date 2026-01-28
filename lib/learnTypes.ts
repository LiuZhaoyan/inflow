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
