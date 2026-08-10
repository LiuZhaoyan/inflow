import { useCallback, useEffect, useRef, useState } from 'react';
import type { MasteredSentence } from '@/lib/types/progress';
import type { Msg } from '@/lib/types/learnTypes';
import type { UserProfile } from '@/lib/types/user';
import type { ActionPayload, LearnAction } from '@/lib/types/learnChat';
import { normalizeLanguageCode, type LanguageCode } from '@/lib/core/language';
import { mapActionTexts } from '@/lib/domain/learn/message-protocol';
import { logger } from '@/lib/core/logger';
import { useLearnChatBootstrap } from '@/hooks/learn/core/useLearnChatBootstrap';
import { useCooldownGate } from '@/hooks/learn/core/useCooldownGate';
import { useLearnChatPersistence } from '@/hooks/learn/core/useLearnChatPersistence';
import {
    deleteMasteredSentence,
    fetchChatHistory,
    fetchMasteredSentences,
    postLearnChatAction,
    postLearnFeedback,
    updateCurrentLanguageCode,
    type LearnFeedbackRating,
    type LearnChatApiError,
} from '@/hooks/learn/services/learnChatApi';
import {
    mapChatHistoryRowsToViewModel,
    mapLearnChatActionResponseToViewModel,
} from '@/hooks/learn/services/learnChatMapper';

const UNDERSTAND_BASE_COOLDOWN_MS = 2000;
const UNDERSTAND_MAX_COOLDOWN_MS = 6000;
const AUX_BASE_COOLDOWN_MS = 6000;
const AUX_MAX_COOLDOWN_MS = 15000;
const RETRY_AFTER_FALLBACK_MS = 10000;
const SUCCESS_WINDOW_FOR_DECAY = 3;

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
    const [feedbackLoading, setFeedbackLoading] = useState(false);
    const [feedbackSubmittedFor, setFeedbackSubmittedFor] = useState<string | null>(null);

    // Difficulty & placement state
    const [difficultyLevel, setDifficultyLevel] = useState(3);
    const [difficultyDirection, setDifficultyDirection] = useState<'decrease' | 'maintain' | 'increase'>('maintain');
    const [difficultyPerformance, setDifficultyPerformance] = useState<string>('learning');
    const [placementCompleted, setPlacementCompleted] = useState(false);
    const [placementLoading, setPlacementLoading] = useState(true);
    const persistence = useLearnChatPersistence();

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const loadingRef = useRef(false);
    const runActionNowRef = useRef<(payload: ActionPayload) => Promise<void>>(async () => {});
    const notify429UnderstandRef = useRef<(retryAfterMs?: number) => void>(() => {});
    const notifySuccessUnderstandRef = useRef<() => void>(() => {});
    const notify429AuxRef = useRef<(retryAfterMs?: number) => void>(() => {});
    const notifySuccessAuxRef = useRef<() => void>(() => {});

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        loadingRef.current = loading;
    }, [loading]);

    const {
        isCooldownActive: isUnderstandCooldownActive,
        cooldownRemainingMs: cooldownUnderstandRemainingMs,
        hasQueuedAction: hasQueuedUnderstand,
        scheduleOrRun: scheduleOrRunUnderstand,
        notify429: notify429Understand,
        notifySuccess: notifySuccessUnderstand,
        flushQueuedIfReady: flushUnderstandIfReady,
        clear: clearUnderstand,
    } = useCooldownGate<ActionPayload>({
        enabled: true,
        baseMs: UNDERSTAND_BASE_COOLDOWN_MS,
        maxMs: UNDERSTAND_MAX_COOLDOWN_MS,
        fallbackRetryAfterMs: RETRY_AFTER_FALLBACK_MS,
        successWindowForDecay: SUCCESS_WINDOW_FOR_DECAY,
        onRun: (payload) => runActionNowRef.current(payload),
        isBlocked: () => loadingRef.current,
    });

    const {
        isCooldownActive: isAuxCooldownActive,
        cooldownRemainingMs: cooldownAuxRemainingMs,
        hasQueuedAction: hasQueuedAux,
        scheduleOrRun: scheduleOrRunAux,
        notify429: notify429Aux,
        notifySuccess: notifySuccessAux,
        flushQueuedIfReady: flushAuxIfReady,
        clear: clearAux,
    } = useCooldownGate<ActionPayload>({
        enabled: true,
        baseMs: AUX_BASE_COOLDOWN_MS,
        maxMs: AUX_MAX_COOLDOWN_MS,
        fallbackRetryAfterMs: RETRY_AFTER_FALLBACK_MS,
        successWindowForDecay: SUCCESS_WINDOW_FOR_DECAY,
        onRun: (payload) => runActionNowRef.current(payload),
        isBlocked: () => loadingRef.current,
    });

    useEffect(() => {
        notify429UnderstandRef.current = notify429Understand;
        notifySuccessUnderstandRef.current = notifySuccessUnderstand;
        notify429AuxRef.current = notify429Aux;
        notifySuccessAuxRef.current = notifySuccessAux;
    }, [notify429Understand, notifySuccessUnderstand, notify429Aux, notifySuccessAux]);

    const loadMasteredSentences = useCallback(async (language: LanguageCode) => {
        try {
            const sentences = await fetchMasteredSentences(language);
            setMasteredSentences(sentences);
        } catch (err) {
            logger.error('useLearnChat: Failed to load mastered sentences', err);
        }
    }, []);

    const loadStoredChat = useCallback(async (language: LanguageCode, context: string) => {
        try {
            const rows = await fetchChatHistory(language, context);
            if (!rows) return null;
            return mapChatHistoryRowsToViewModel(rows);
        } catch (err) {
            logger.error('useLearnChat: Failed to load chat history', err);
            return null;
        }
    }, []);

    useLearnChatBootstrap({
        getLastLanguage: persistence.getLastLanguage,
        setUserProfile,
        setProfileLoading,
        setPlacementCompleted,
        setDifficultyLevel,
        setPlacementLoading,
        setSelectedLanguage,
    });

    useEffect(() => {
        if (profileLoading || !selectedLanguage) return;
        persistence.setLastLanguage(selectedLanguage);

        void loadMasteredSentences(selectedLanguage);

        const lastContext = persistence.getLastContext(selectedLanguage);
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
    }, [
        loadMasteredSentences,
        loadStoredChat,
        persistence,
        profileLoading,
        selectedLanguage,
    ]);

    const handleDeleteMasteredSentence = useCallback(async (id: string) => {
        const previous = masteredSentences;
        setMasteredSentences(prev => prev.filter(s => s.id !== id));

        try {
            const nextSentences = await deleteMasteredSentence(id, selectedLanguage);
            if (nextSentences) {
                setMasteredSentences(nextSentences);
            }
        } catch (error) {
            logger.error('useLearnChat: Failed to delete mastered sentence', error);
            setMasteredSentences(previous);
        }
    }, [masteredSentences, selectedLanguage]);

    const handleFeedback = useCallback(async (rating: LearnFeedbackRating) => {
        const feedbackKey = currentSentenceMessageId ?? currentSentence;
        if (!currentSentence || feedbackLoading || feedbackSubmittedFor === feedbackKey || !userProfile?.isOnboarded) return;

        setFeedbackLoading(true);
        try {
            const result = await postLearnFeedback({
                messageId: currentSentenceMessageId,
                sentence: currentSentence,
                languageCode: selectedLanguage,
                context: selectedContext ?? undefined,
                rating,
            });

            if (result.difficulty) {
                setDifficultyLevel(result.difficulty.level ?? difficultyLevel);
                setDifficultyDirection(result.difficulty.direction ?? 'maintain');
                setDifficultyPerformance(result.difficulty.performance ?? 'learning');
            }
            setFeedbackSubmittedFor(feedbackKey);
        } catch (error) {
            logger.error('useLearnChat: Failed to submit comprehension feedback', error);
        } finally {
            setFeedbackLoading(false);
        }
    }, [
        currentSentence,
        currentSentenceMessageId,
        difficultyLevel,
        feedbackLoading,
        feedbackSubmittedFor,
        selectedContext,
        selectedLanguage,
        userProfile?.isOnboarded,
    ]);

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
            persistence.setLastContext(selectedLanguage, effectiveContext);
        }

        const sentenceInProgress = currentSentence;

        if (action !== 'init') {
            const text = mapActionTexts(action, sentenceInProgress, effectiveContext, difficultyLevel).displayText;

            setMessages(prev => [...prev, { id: Date.now().toString(), role: 'user', content: text, userAction: action }]);
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
                userAction: action,
                ...(viewModel.normalizedType ? { messageType: viewModel.normalizedType } : {}),
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

            if (action === 'understand') {
                notifySuccessUnderstandRef.current();
            } else {
                notifySuccessAuxRef.current();
            }
        } catch (error) {
            const err = error as LearnChatApiError;
            if (err?.status === 429) {
                if (action === 'understand') {
                    notify429UnderstandRef.current(err.retryAfterMs ?? RETRY_AFTER_FALLBACK_MS);
                } else {
                    notify429AuxRef.current(err.retryAfterMs ?? RETRY_AFTER_FALLBACK_MS);
                }
            }

            logger.error('useLearnChat: Failed to execute chat action', error);
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
        persistence,
        userProfile?.isOnboarded,
    ]);

    useEffect(() => {
        runActionNowRef.current = runActionNow;
    }, [runActionNow]);

    const scheduleOrRunAction = useCallback((payload: ActionPayload) => {
        if (!userProfile?.isOnboarded) return;
        if (payload.action === 'understand') {
            scheduleOrRunUnderstand(payload);
        } else {
            scheduleOrRunAux(payload);
        }
    }, [scheduleOrRunUnderstand, scheduleOrRunAux, userProfile?.isOnboarded]);

    const handleAction = useCallback((action: LearnAction, context?: string) => {
        scheduleOrRunAction({ action, context });
    }, [scheduleOrRunAction]);

    useEffect(() => {
        const onVisibility = () => {
            if (document.hidden) return;
            flushUnderstandIfReady();
            flushAuxIfReady();
        };

        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [flushUnderstandIfReady, flushAuxIfReady]);

    useEffect(() => {
        return () => {
            clearUnderstand();
            clearAux();
        };
    }, [clearUnderstand, clearAux]);

    const switchContext = useCallback((context: string) => {
        if (!userProfile?.isOnboarded) {
            return;
        }
        clearUnderstand();
        clearAux();
        setSelectedContext(context);
        setShowContextMenu(false);
        persistence.setLastContext(selectedLanguage, context);
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
    }, [
        clearUnderstand,
        clearAux,
        handleAction,
        loadStoredChat,
        persistence,
        selectedLanguage,
        userProfile?.isOnboarded,
    ]);

    const switchLanguage = useCallback((language: LanguageCode) => {
        clearUnderstand();
        clearAux();
        const normalized = normalizeLanguageCode(language);
        const fallback = normalizeLanguageCode(userProfile?.targetLanguage || 'en');
        const resolved = normalized === 'auto' ? (fallback === 'auto' ? 'en' : fallback) : normalized;
        setSelectedLanguage(resolved);
        persistence.setLastLanguage(resolved);
        if (userProfile?.isOnboarded) {
            updateCurrentLanguageCode(resolved).catch(() => {});
        }
    }, [clearUnderstand, clearAux, persistence, userProfile?.isOnboarded, userProfile?.targetLanguage]);

    return {
        messages,
        currentSentence,
        currentSentenceMessageId,
        loading,
        feedbackLoading: feedbackLoading || feedbackSubmittedFor === (currentSentenceMessageId ?? currentSentence),
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
        isUnderstandCooldownActive,
        cooldownUnderstandRemainingMs,
        hasQueuedUnderstand,
        isAuxCooldownActive,
        cooldownAuxRemainingMs,
        hasQueuedAux,
        placementCompleted,
        placementLoading,
        setPlacementCompleted,
        setDifficultyLevel,
        setShowContextMenu,
        handleAction,
        switchContext,
        switchLanguage,
        handleDeleteMasteredSentence,
        handleFeedback,
    };
}
