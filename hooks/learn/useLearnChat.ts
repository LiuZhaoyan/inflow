import { useCallback, useEffect, useRef, useState } from 'react';
import type { MasteredSentence } from '@/components/learn/MasteredSentencesSidebar';
import type { Msg, StoredChat, UserProfile } from '@/lib/learnTypes';
import { normalizeLanguageCode, type LanguageCode } from '@/lib/language';

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

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const languageInitializedRef = useRef(false);

    const getStorageKey = (language: string, context: string) => `learn-chat:${language}:${context}`;

    const loadStoredChat = (language: string, context: string) => {
        try {
            const raw = localStorage.getItem(getStorageKey(language, context));
            if (!raw) return null;
            return JSON.parse(raw) as StoredChat;
        } catch (err) {
            console.error('Failed to load stored chat', err);
            return null;
        }
    };

    const saveStoredChat = (language: string, context: string, data: StoredChat) => {
        try {
            localStorage.setItem(getStorageKey(language, context), JSON.stringify(data));
        } catch (err) {
            console.error('Failed to save stored chat', err);
        }
    };

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        if (!selectedContext || !selectedLanguage) return;
        saveStoredChat(selectedLanguage, selectedContext, {
            messages,
            currentSentence,
            updatedAt: Date.now()
        });
    }, [messages, currentSentence, selectedContext, selectedLanguage]);

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

        fetch(`/api/mastered-sentences?languageCode=${selectedLanguage}`)
            .then(res => res.json())
            .then(data => {
                if (data.sentences) setMasteredSentences(data.sentences);
            })
            .catch(err => console.error('Failed to load history', err));

        const lastContext = localStorage.getItem(`learn-chat:last-context:${selectedLanguage}`);
        if (lastContext) {
            setSelectedContext(lastContext);
            const stored = loadStoredChat(selectedLanguage, lastContext);
            if (stored) {
                setMessages(stored.messages);
                setCurrentSentence(stored.currentSentence);
                setCurrentSentenceMessageId(null);
                return;
            }
        }

        setSelectedContext(null);
        setMessages([]);
        setCurrentSentence('');
        setCurrentSentenceMessageId(null);
    }, [selectedLanguage]);

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
            localStorage.setItem('learn-chat:last-context', effectiveContext);
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
            const res = await fetch('/api/learn-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    currentSentence: sentenceInProgress,
                    history: messages.map(m => ({ role: m.role, content: m.content })),
                    context: effectiveContext,
                        messageId: currentSentenceMessageId,
                        languageCode: selectedLanguage
                })
            });

            if (!res.ok) throw new Error('API Error');

            const data = await res.json();

            const aiMessageId = Date.now().toString() + 'ai';
            setMessages(prev => [...prev, {
                id: aiMessageId,
                role: 'ai',
                content: data.response
            }]);

            const normalizedType = typeof data.type === 'string' ? data.type.toLowerCase() : '';

            if (normalizedType === 'sentence' || action === 'init' || action === 'understand') {
                if (typeof data.response === 'string' && data.response.trim()) {
                    setCurrentSentence(data.response);
                    setCurrentSentenceMessageId(aiMessageId);
                }

                if (action === 'understand' && sentenceInProgress) {
                    setMasteredSentences(prev => [...prev, {
                        id: Date.now().toString(),
                        content: sentenceInProgress,
                        masteredAt: Date.now(),
                        context: effectiveContext ?? undefined,
                        messageId: currentSentenceMessageId ?? undefined,
                        languageCode: selectedLanguage
                    }]);
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
    }, [currentSentence, currentSentenceMessageId, loading, messages, selectedContext, selectedLanguage, userProfile?.isOnboarded]);

    const switchContext = useCallback((context: string) => {
        if (!userProfile?.isOnboarded) {
            return;
        }
        setSelectedContext(context);
        setShowContextMenu(false);
        localStorage.setItem(`learn-chat:last-context:${selectedLanguage}`, context);
        const stored = loadStoredChat(selectedLanguage, context);
        if (stored) {
            setMessages(stored.messages);
            setCurrentSentence(stored.currentSentence);
            return;
        }
        setMessages([]);
        setCurrentSentence('');
        handleAction('init', context);
    }, [handleAction, selectedLanguage, userProfile?.isOnboarded]);

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
        setShowContextMenu,
        handleAction,
        switchContext,
        switchLanguage,
        handleDeleteMasteredSentence,
    };
}
