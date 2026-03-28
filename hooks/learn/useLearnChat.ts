import { useCallback, useEffect, useRef, useState } from 'react';
import type { MasteredSentence } from '@/lib/types/progress';
import type { Msg } from '@/lib/types/learnTypes';
import type { UserProfile } from '@/lib/types/user';
import type { ActionPayload, LearnAction } from '@/lib/types/learnChat';
import { normalizeLanguageCode, type LanguageCode } from '@/lib/language';
import { useCooldownGate } from '@/hooks/learn/core/useCooldownGate';
import {
    deleteMasteredSentence,
    fetchChatHistory,
    fetchMasteredSentences,
    fetchPlacementStatus,
    fetchProfile,
    postLearnChatAction,
    updateCurrentLanguageCode,
    type LearnChatApiError,
} from '@/hooks/learn/services/learnChatApi';
import {
    mapChatHistoryRowsToViewModel,
    mapLearnChatActionResponseToViewModel,
} from '@/hooks/learn/services/learnChatMapper';

const BASE_COOLDOWN_MS = 4000;
const MAX_COOLDOWN_MS = 12000;
const RETRY_AFTER_FALLBACK_MS = 10000;
const SUCCESS_WINDOW_FOR_DECAY = 3;
const COOLDOWN_FEATURE_FLAG_KEY = 'learnChatCooldownEnabled';

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
    const [cooldownEnabled, setCooldownEnabled] = useState(true);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const languageInitializedRef = useRef(false);
    const loadingRef = useRef(false);
    const runActionNowRef = useRef<(payload: ActionPayload) => Promise<void>>(async () => {});
    const notify429Ref = useRef<(retryAfterMs?: number) => void>(() => {});
    const notifySuccessRef = useRef<() => void>(() => {});

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        loadingRef.current = loading;
    }, [loading]);

    useEffect(() => {
        if (typeof window === 'undefined') return;
        const value = localStorage.getItem(COOLDOWN_FEATURE_FLAG_KEY);
        setCooldownEnabled(value !== 'false');
    }, []);

    const {
        isCooldownActive,
        cooldownRemainingMs,
        hasQueuedAction,
        scheduleOrRun,
        notify429,
        notifySuccess,
        flushQueuedIfReady,
        clear,
    } = useCooldownGate<ActionPayload>({
        enabled: cooldownEnabled,
        baseMs: BASE_COOLDOWN_MS,
        maxMs: MAX_COOLDOWN_MS,
        fallbackRetryAfterMs: RETRY_AFTER_FALLBACK_MS,
        successWindowForDecay: SUCCESS_WINDOW_FOR_DECAY,
        onRun: (payload) => runActionNowRef.current(payload),
        isBlocked: () => loadingRef.current,
    });

    useEffect(() => {
        notify429Ref.current = notify429;
        notifySuccessRef.current = notifySuccess;
    }, [notify429, notifySuccess]);

    const loadMasteredSentences = useCallback(async (language: LanguageCode) => {
        try {
            const sentences = await fetchMasteredSentences(language);
            setMasteredSentences(sentences);
        } catch (err) {
            console.error('Failed to load mastered sentences', err);
        }
    }, []);

    const loadStoredChat = useCallback(async (language: LanguageCode, context: string) => {
        try {
            const rows = await fetchChatHistory(language, context);
            if (!rows) return null;
            return mapChatHistoryRowsToViewModel(rows);
        } catch (err) {
            console.error('Failed to load chat history', err);
            return null;
        }
    }, []);

    useEffect(() => {
        const init = async () => {
            try {
                const profile = await fetchProfile();
                setUserProfile(profile);
            } catch (err) {
                console.error('Failed to load user profile', err);
                setUserProfile(null);
            } finally {
                setProfileLoading(false);
            }

            // Load placement test / difficulty status
            try {
                const placement = await fetchPlacementStatus();
                setPlacementCompleted(placement.completed);
                setDifficultyLevel(placement.level);
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
            const nextSentences = await deleteMasteredSentence(id, selectedLanguage);
            if (nextSentences) {
                setMasteredSentences(nextSentences);
            }
        } catch (error) {
            console.error(error);
            setMasteredSentences(previous);
        }
    }, [masteredSentences, selectedLanguage]);

    const runActionNow = useCallback(async (payload: ActionPayload) => {
        const { action, context } = payload;

        if (loadingRef.current) return;
        if (!userProfile?.isOnboarded) {
            return;
        }

        setLoading(true);
        loadingRef.current = true;

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
            const apiData = await postLearnChatAction({
                action,
                context: effectiveContext,
                currentSentence: sentenceInProgress,
                messageId: currentSentenceMessageId,
                languageCode: selectedLanguage,
            });

            const viewModel = mapLearnChatActionResponseToViewModel(apiData);
            const aiMessageId = viewModel.aiMessageId;
            setMessages(prev => [...prev, {
                id: aiMessageId,
                role: 'ai',
                content: viewModel.response,
            }]);

            if (viewModel.difficulty) {
                setDifficultyLevel(viewModel.difficulty.level ?? difficultyLevel);
                setDifficultyDirection(viewModel.difficulty.direction ?? 'maintain');
                setDifficultyPerformance(viewModel.difficulty.performance ?? 'learning');
            }

            const normalizedType = viewModel.normalizedType;

            if (normalizedType === 'sentence' || action === 'init' || action === 'understand') {
                if (viewModel.response.trim()) {
                    setCurrentSentence(viewModel.response);
                    setCurrentSentenceMessageId(aiMessageId);
                }

                if (action === 'understand') {
                    void loadMasteredSentences(selectedLanguage);
                }

            } else if (viewModel.originalSentence && normalizedType !== 'sentence') {
                setCurrentSentence(viewModel.originalSentence);
            }

            notifySuccessRef.current();
        } catch (error) {
            const err = error as LearnChatApiError;
            if (err?.status === 429) {
                notify429Ref.current(err.retryAfterMs ?? RETRY_AFTER_FALLBACK_MS);
            }

            console.error(error);
            setMessages(prev => [...prev, {
                id: Date.now().toString() + 'err',
                role: 'ai',
                content: 'Sorry, I encountered an error. Please try again.',
            }]);
        } finally {
            setLoading(false);
            loadingRef.current = false;
        }
    }, [
        currentSentence,
        currentSentenceMessageId,
        difficultyLevel,
        loadMasteredSentences,
        selectedContext,
        selectedLanguage,
        userProfile?.isOnboarded,
    ]);

    useEffect(() => {
        runActionNowRef.current = runActionNow;
    }, [runActionNow]);

    const scheduleOrRunAction = useCallback((payload: ActionPayload) => {
        if (!userProfile?.isOnboarded) return;
        scheduleOrRun(payload);
    }, [scheduleOrRun, userProfile?.isOnboarded]);

    const handleAction = useCallback((action: LearnAction, context?: string) => {
        scheduleOrRunAction({ action, context });
    }, [scheduleOrRunAction]);

    useEffect(() => {
        const onVisibility = () => {
            if (document.hidden) return;
            flushQueuedIfReady();
        };

        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [flushQueuedIfReady]);

    useEffect(() => {
        return () => {
            clear();
        };
    }, [clear]);

    const switchContext = useCallback((context: string) => {
        if (!userProfile?.isOnboarded) {
            return;
        }
        clear();
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
    }, [clear, handleAction, loadStoredChat, selectedLanguage, userProfile?.isOnboarded]);

    const switchLanguage = useCallback((language: LanguageCode) => {
        clear();
        const normalized = normalizeLanguageCode(language);
        const fallback = normalizeLanguageCode(userProfile?.targetLanguage || 'en');
        const resolved = normalized === 'auto' ? (fallback === 'auto' ? 'en' : fallback) : normalized;
        setSelectedLanguage(resolved);
        localStorage.setItem('learn-chat:last-language', resolved);
        if (userProfile?.isOnboarded) {
            updateCurrentLanguageCode(resolved).catch(() => {});
        }
    }, [clear, userProfile?.isOnboarded, userProfile?.targetLanguage]);

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
        isCooldownActive,
        cooldownRemainingMs,
        hasQueuedAction,
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
