import { useCallback, useEffect, useRef, useState } from 'react';
import type { MasteredSentence } from '@/lib/types/progress';
import type { Msg } from '@/lib/types/learnTypes';
import type { UserProfile } from '@/lib/types/user';
import { normalizeLanguageCode, type LanguageCode } from '@/lib/language';
import { fetchWithRetry } from '@/lib/fetchWithRetry';

interface ChatHistoryRow {
    id: string;
    role: 'user' | 'ai';
    content: string;
    messageType?: string;
    originalSentence?: string;
}

function deriveCurrentSentence(rows: ChatHistoryRow[]) {
    for (let i = rows.length - 1; i >= 0; i -= 1) {
        const row = rows[i];
        if (row.role !== 'ai') continue;
        if (row.messageType === 'sentence' && row.content.trim()) {
            return { sentence: row.content, messageId: row.id };
        }
        if (row.originalSentence && row.originalSentence.trim()) {
            return { sentence: row.originalSentence, messageId: null as string | null };
        }
    }
    return { sentence: '', messageId: null as string | null };
}

export default function useLearnChat() {
    const [messages, setMessages] = useState<Msg[]>([]);
    const [currentSentence, setCurrentSentence] = useState('');
    const [currentSentenceMessageId, setCurrentSentenceMessageId] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [selectedContext, setSelectedContext] = useState<string | null>(null);
    const [selectedLanguage, setSelectedLanguage] = useState<LanguageCode>('en');
    const [showContextMenu, setShowContextMenu] = useState(false);
    const [masteredSentences, setMasteredSentences] = useState<MasteredSentence[]>([]);
    const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
    const [profileLoading, setProfileLoading] = useState(true);

    // Difficulty & placement state
    const [difficultyLevel, setDifficultyLevel] = useState(3);
    const [difficultyDirection, setDifficultyDirection] = useState<'decrease' | 'maintain' | 'increase'>('maintain');
    const [difficultyPerformance, setDifficultyPerformance] = useState<string>('learning');
    const [placementCompleted, setPlacementCompleted] = useState(false);
    const [placementLoading, setPlacementLoading] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const languageInitializedRef = useRef(false);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const loadMasteredSentences = useCallback(async (language: string) => {
        try {
            const res = await fetch(`/api/mastered-sentences?languageCode=${language}`);
            const data = await res.json();
            if (data.sentences) setMasteredSentences(data.sentences);
        } catch (err) {
            console.error('Failed to load mastered sentences', err);
        }
    }, []);

    const loadStoredChat = useCallback(async (language: string, context: string) => {
        try {
            const params = new URLSearchParams({ lang: language, context });
            const res = await fetch(`/api/chat-history?${params.toString()}`);
            if (!res.ok) return null;
            const data = await res.json();
            const rows = Array.isArray(data?.messages) ? data.messages as ChatHistoryRow[] : [];
            const mappedMessages: Msg[] = rows.map((row) => ({
                id: row.id,
                role: row.role,
                content: row.content,
            }));
            const sentenceState = deriveCurrentSentence(rows);
            return {
                messages: mappedMessages,
                currentSentence: sentenceState.sentence,
                currentSentenceMessageId: sentenceState.messageId,
            };
        } catch (err) {
            console.error('Failed to load chat history', err);
            return null;
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            try {
                const res = await fetch('/api/user');
                if (res.ok) {
                    const data = await res.json();
                    const profile = data?.profile as UserProfile | undefined;
                    if (profile) {
                        setUserProfile(profile);
                    } else {
                        setUserProfile(null);
                    }
                } else {
                    setUserProfile(null);
                }
            } catch (err) {
                console.error('Failed to load user profile', err);
                setUserProfile(null);
            } finally {
                setProfileLoading(false);
            }

            // Load placement test / difficulty status
            try {
                const res = await fetch('/api/placement-test');
                if (res.ok) {
                    const data = await res.json();
                    setPlacementCompleted(data.completed ?? false);
                    setDifficultyLevel(data.level ?? 3);
                }
            } catch (err) {
                console.error('Failed to load placement status', err);
            } finally {
                setPlacementLoading(false);
            }
        };

        init();
    }, []);

    useEffect(() => {
        if (profileLoading) return;
        const savedLanguage = localStorage.getItem('learn-chat:last-language');
        const fallbackLanguage = userProfile?.currentLanguageCode || userProfile?.targetLanguage || 'en';
        const normalizedSaved = normalizeLanguageCode(savedLanguage || fallbackLanguage);
        setSelectedLanguage(normalizedSaved === 'auto' ? normalizeLanguageCode(fallbackLanguage) : normalizedSaved);
        languageInitializedRef.current = true;
    }, [profileLoading, userProfile?.currentLanguageCode, userProfile?.targetLanguage]);

    useEffect(() => {
        if (!selectedLanguage || !languageInitializedRef.current) return;
        localStorage.setItem('learn-chat:last-language', selectedLanguage);

        void loadMasteredSentences(selectedLanguage);

        const lastContext = localStorage.getItem(`learn-chat:last-context:${selectedLanguage}`);
        if (lastContext) {
            setSelectedContext(lastContext);
            void loadStoredChat(selectedLanguage, lastContext).then((stored) => {
                if (!stored) {
                    setMessages([]);
                    setCurrentSentence('');
                    setCurrentSentenceMessageId(null);
                    return;
                }
                setMessages(stored.messages);
                setCurrentSentence(stored.currentSentence);
                setCurrentSentenceMessageId(stored.currentSentenceMessageId);
            });
            return;
        }

        setSelectedContext(null);
        setMessages([]);
        setCurrentSentence('');
        setCurrentSentenceMessageId(null);
    }, [loadMasteredSentences, loadStoredChat, selectedLanguage]);

    const handleDeleteMasteredSentence = useCallback(async (id: string) => {
        const previous = masteredSentences;
        setMasteredSentences(prev => prev.filter(s => s.id !== id));

        try {
            const res = await fetch('/api/mastered-sentences', {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ id, languageCode: selectedLanguage })
            });
            if (!res.ok) throw new Error('Delete failed');
            const data = await res.json();
            if (data.sentences) setMasteredSentences(data.sentences);
        } catch (error) {
            console.error(error);
            setMasteredSentences(previous);
        }
    }, [masteredSentences, selectedLanguage]);

    const handleAction = useCallback(async (action: 'init' | 'explain' | 'translate' | 'understand', context?: string) => {
        if (loading) return;
        if (!userProfile?.isOnboarded) {
            return;
        }
        setLoading(true);

        const effectiveContext = context ?? selectedContext ?? undefined;

        if (action === 'init' && effectiveContext) {
            setSelectedContext(effectiveContext);
            localStorage.setItem(`learn-chat:last-context:${selectedLanguage}`, effectiveContext);
        }

        const sentenceInProgress = currentSentence;

        if (action !== 'init') {
            let text = '';
            if (action === 'explain') text = 'Explain please';
            if (action === 'translate') text = 'Translate please';
            if (action === 'understand') text = 'I got it!';

            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: text }]);
        }

        try {
            const res = await fetchWithRetry('/api/learn-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    currentSentence: sentenceInProgress,
                    context: effectiveContext,
                        messageId: currentSentenceMessageId,
                        languageCode: selectedLanguage
                })
            });

            if (!res.ok) throw new Error('API Error');

            const data = await res.json();

            const aiMessageId = typeof data.messageId === 'string' ? data.messageId : Date.now().toString() + 'ai';
            setMessages(prev => [...prev, {
                id: aiMessageId,
                role: 'ai',
                content: data.response
            }]);

            // Update difficulty state from response
            if (data.difficulty) {
                setDifficultyLevel(data.difficulty.level ?? difficultyLevel);
                setDifficultyDirection(data.difficulty.direction ?? 'maintain');
                setDifficultyPerformance(data.difficulty.performance ?? 'learning');
            }

            const normalizedType = typeof data.type === 'string' ? data.type.toLowerCase() : '';

            if (normalizedType === 'sentence' || action === 'init' || action === 'understand') {
                if (typeof data.response === 'string' && data.response.trim()) {
                    setCurrentSentence(data.response);
                    setCurrentSentenceMessageId(aiMessageId);
                }

                if (action === 'understand') {
                    void loadMasteredSentences(selectedLanguage);
                }

            } else if (data.original && normalizedType !== 'sentence') {
                setCurrentSentence(data.original);
            }

        } catch (error) {
            console.error(error);
            setMessages(prev => [...prev, {
                id: Date.now().toString() + 'err',
                role: 'ai',
                content: 'Sorry, I encountered an error. Please try again.'
            }]);
        } finally {
            setLoading(false);
        }
    }, [
        currentSentence,
        currentSentenceMessageId,
        difficultyLevel,
        loadMasteredSentences,
        loading,
        selectedContext,
        selectedLanguage,
        userProfile?.isOnboarded,
    ]);

    const switchContext = useCallback((context: string) => {
        if (!userProfile?.isOnboarded) {
            return;
        }
        setSelectedContext(context);
        setShowContextMenu(false);
        localStorage.setItem(`learn-chat:last-context:${selectedLanguage}`, context);
        void loadStoredChat(selectedLanguage, context).then((stored) => {
            if (stored && stored.messages.length > 0) {
                setMessages(stored.messages);
                setCurrentSentence(stored.currentSentence);
                setCurrentSentenceMessageId(stored.currentSentenceMessageId);
                return;
            }
            setMessages([]);
            setCurrentSentence('');
            setCurrentSentenceMessageId(null);
            void handleAction('init', context);
        });
    }, [handleAction, loadStoredChat, selectedLanguage, userProfile?.isOnboarded]);

    const switchLanguage = useCallback((language: LanguageCode) => {
        const normalized = normalizeLanguageCode(language);
        const fallback = normalizeLanguageCode(userProfile?.targetLanguage || 'en');
        const resolved = normalized === 'auto' ? (fallback === 'auto' ? 'en' : fallback) : normalized;
        setSelectedLanguage(resolved);
        localStorage.setItem('learn-chat:last-language', resolved);
        if (userProfile?.isOnboarded) {
            fetch('/api/user', {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ currentLanguageCode: resolved })
            }).catch(() => {});
        }
    }, [userProfile?.isOnboarded, userProfile?.targetLanguage]);

    return {
        messages,
        currentSentence,
        currentSentenceMessageId,
        loading,
        selectedContext,
        selectedLanguage,
        showContextMenu,
        masteredSentences,
        userProfile,
        profileLoading,
        messagesEndRef,
        messageRefs,
        difficultyLevel,
        difficultyDirection,
        difficultyPerformance,
        placementCompleted,
        placementLoading,
        setPlacementCompleted,
        setDifficultyLevel,
        setShowContextMenu,
        handleAction,
        switchContext,
        switchLanguage,
        handleDeleteMasteredSentence,
    };
}
