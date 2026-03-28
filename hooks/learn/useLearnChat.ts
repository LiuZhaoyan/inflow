import { useCallback, useEffect, useRef, useState } from 'react';
import type { MasteredSentence } from '@/lib/types/progress';
import type { Msg } from '@/lib/types/learnTypes';
import type { UserProfile } from '@/lib/types/user';
import type { ActionPayload, ChatHistoryRow, LearnAction } from '@/lib/types/learnChat';
import { normalizeLanguageCode, type LanguageCode } from '@/lib/language';
import { fetchWithRetry } from '@/lib/fetchWithRetry';
import { deriveCurrentSentence } from '@/hooks/learn/utils/chatHistory';
import { parseRetryAfterMs, computeCooldownAfter429, computeCooldownAfterSuccess } from '@/hooks/learn/utils/cooldownPolicy';
import { generateRequestId } from '@/hooks/learn/utils/requestId';

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
    const [cooldownRemainingMs, setCooldownRemainingMs] = useState(0);
    const [hasQueuedAction, setHasQueuedAction] = useState(false);

    const messagesEndRef = useRef<HTMLDivElement>(null);
    const messageRefs = useRef<Record<string, HTMLDivElement | null>>({});
    const languageInitializedRef = useRef(false);
    const loadingRef = useRef(false);
    const nextAllowedAtRef = useRef(0);
    const cooldownTimerRef = useRef<number | null>(null);
    const countdownTimerRef = useRef<number | null>(null);
    const pendingActionRef = useRef<ActionPayload | null>(null);
    const cooldownMsRef = useRef(BASE_COOLDOWN_MS);
    const successSince429Ref = useRef(0);
    const cooldownEnabledRef = useRef(true);
    const metricsRef = useRef({
        cooldown_blocked_count: 0,
        cooldown_wait_ms: 0,
        pending_action_replaced_count: 0,
        send_after_cooldown_count: 0,
        cooldown_429_event_count: 0,
    });

    const isCooldownActive = cooldownRemainingMs > 0;

    const logCooldownMetric = (event: string, value?: number) => {
        console.info('[learn-chat-cooldown]', event, value ?? '');
    };

    const clearCooldownTimers = () => {
        if (cooldownTimerRef.current !== null) {
            window.clearTimeout(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
        }
        if (countdownTimerRef.current !== null) {
            window.clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }
    };

    const clearCooldownGate = () => {
        clearCooldownTimers();
        pendingActionRef.current = null;
        nextAllowedAtRef.current = 0;
        setHasQueuedAction(false);
        setCooldownRemainingMs(0);
    };

    const startCountdownTicker = () => {
        if (countdownTimerRef.current !== null) {
            window.clearInterval(countdownTimerRef.current);
        }

        countdownTimerRef.current = window.setInterval(() => {
            const remaining = Math.max(0, nextAllowedAtRef.current - Date.now());
            setCooldownRemainingMs(remaining);
            if (remaining <= 0 && countdownTimerRef.current !== null) {
                window.clearInterval(countdownTimerRef.current);
                countdownTimerRef.current = null;
            }
        }, 100);
    };

    const applyAdaptiveCooldownOn429 = (retryAfterMs: number) => {
        successSince429Ref.current = 0;
        cooldownMsRef.current = computeCooldownAfter429(cooldownMsRef.current, retryAfterMs, {
            baseMs: BASE_COOLDOWN_MS,
            maxMs: MAX_COOLDOWN_MS,
        });
        metricsRef.current.cooldown_429_event_count += 1;
        logCooldownMetric('429_after_cooldown_count', metricsRef.current.cooldown_429_event_count);
    };

    const applyAdaptiveCooldownOnSuccess = () => {
        const nextState = computeCooldownAfterSuccess({
            cooldownMs: cooldownMsRef.current,
            successSince429: successSince429Ref.current,
            baseMs: BASE_COOLDOWN_MS,
            successWindowForDecay: SUCCESS_WINDOW_FOR_DECAY,
            decayStepMs: 1000,
        });
        cooldownMsRef.current = nextState.cooldownMs;
        successSince429Ref.current = nextState.successSince429;
    };

    const startCooldownWindow = (windowMs: number, onExpire: () => void) => {
        if (!cooldownEnabledRef.current) {
            return;
        }

        const waitMs = Math.max(0, Math.min(windowMs, MAX_COOLDOWN_MS));
        nextAllowedAtRef.current = Date.now() + waitMs;
        setCooldownRemainingMs(waitMs);
        metricsRef.current.cooldown_wait_ms = waitMs;
        logCooldownMetric('cooldown_wait_ms', waitMs);

        clearCooldownTimers();
        if (waitMs <= 0) {
            setCooldownRemainingMs(0);
            return;
        }

        cooldownTimerRef.current = window.setTimeout(onExpire, waitMs);
        startCountdownTicker();
    };

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
        cooldownEnabledRef.current = value !== 'false';
    }, []);

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
            const requestId = generateRequestId();
            const res = await fetchWithRetry('/api/learn-chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    action,
                    requestId,
                    currentSentence: sentenceInProgress,
                    context: effectiveContext,
                    messageId: currentSentenceMessageId,
                    languageCode: selectedLanguage,
                }),
            });

            if (!res.ok) {
                const retryAfterMs = parseRetryAfterMs(res.headers.get('Retry-After'), RETRY_AFTER_FALLBACK_MS);
                const apiError = new Error('API Error') as Error & { status?: number; retryAfterMs?: number };
                apiError.status = res.status;
                apiError.retryAfterMs = retryAfterMs;
                throw apiError;
            }

            const data = await res.json();

            const aiMessageId = typeof data.messageId === 'string' ? data.messageId : Date.now().toString() + 'ai';
            setMessages(prev => [...prev, {
                id: aiMessageId,
                role: 'ai',
                content: data.response,
            }]);

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

            applyAdaptiveCooldownOnSuccess();
        } catch (error) {
            const err = error as Error & { status?: number; retryAfterMs?: number };
            if (err?.status === 429) {
                applyAdaptiveCooldownOn429(err.retryAfterMs ?? RETRY_AFTER_FALLBACK_MS);
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

            startCooldownWindow(cooldownMsRef.current, () => {
                cooldownTimerRef.current = null;
                const now = Date.now();
                const remaining = nextAllowedAtRef.current - now;
                if (remaining > 0) {
                    cooldownTimerRef.current = window.setTimeout(() => {
                        cooldownTimerRef.current = null;
                        const next = pendingActionRef.current;
                        pendingActionRef.current = null;
                        setHasQueuedAction(false);
                        setCooldownRemainingMs(0);
                        if (next) {
                            metricsRef.current.send_after_cooldown_count += 1;
                            logCooldownMetric('send_after_cooldown_count', metricsRef.current.send_after_cooldown_count);
                            void runActionNow(next);
                        }
                    }, remaining);
                    startCountdownTicker();
                    return;
                }

                setCooldownRemainingMs(0);
                if (!pendingActionRef.current) {
                    setHasQueuedAction(false);
                    return;
                }

                const next = pendingActionRef.current;
                pendingActionRef.current = null;
                setHasQueuedAction(false);
                metricsRef.current.send_after_cooldown_count += 1;
                logCooldownMetric('send_after_cooldown_count', metricsRef.current.send_after_cooldown_count);
                void runActionNow(next);
            });
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

    const scheduleOrRunAction = useCallback((payload: ActionPayload) => {
        if (loadingRef.current) return;
        if (!userProfile?.isOnboarded) return;

        const now = Date.now();
        if (!cooldownEnabledRef.current || now >= nextAllowedAtRef.current) {
            void runActionNow(payload);
            return;
        }

        const hadPending = Boolean(pendingActionRef.current);
        pendingActionRef.current = {
            ...payload,
            queuedAt: now,
        };
        setHasQueuedAction(true);

        if (hadPending) {
            metricsRef.current.pending_action_replaced_count += 1;
            logCooldownMetric('pending_action_replaced_count', metricsRef.current.pending_action_replaced_count);
        }

        const waitMs = Math.max(0, nextAllowedAtRef.current - now);
        setCooldownRemainingMs(waitMs);
        metricsRef.current.cooldown_blocked_count += 1;
        logCooldownMetric('cooldown_blocked_count', metricsRef.current.cooldown_blocked_count);

        clearCooldownTimers();
        cooldownTimerRef.current = window.setTimeout(() => {
            cooldownTimerRef.current = null;
            const next = pendingActionRef.current;
            pendingActionRef.current = null;
            setHasQueuedAction(false);
            setCooldownRemainingMs(0);
            if (next) {
                metricsRef.current.send_after_cooldown_count += 1;
                logCooldownMetric('send_after_cooldown_count', metricsRef.current.send_after_cooldown_count);
                void runActionNow(next);
            }
        }, waitMs);
        startCountdownTicker();
    }, [runActionNow, userProfile?.isOnboarded]);

    const handleAction = useCallback((action: LearnAction, context?: string) => {
        scheduleOrRunAction({ action, context });
    }, [scheduleOrRunAction]);

    useEffect(() => {
        const onVisibility = () => {
            if (document.hidden) return;
            if (loadingRef.current) return;
            if (!pendingActionRef.current) return;
            if (Date.now() < nextAllowedAtRef.current) return;

            const next = pendingActionRef.current;
            pendingActionRef.current = null;
            setHasQueuedAction(false);
            setCooldownRemainingMs(0);
            if (next) {
                metricsRef.current.send_after_cooldown_count += 1;
                logCooldownMetric('send_after_cooldown_count', metricsRef.current.send_after_cooldown_count);
                void runActionNow(next);
            }
        };

        document.addEventListener('visibilitychange', onVisibility);
        return () => {
            document.removeEventListener('visibilitychange', onVisibility);
        };
    }, [runActionNow]);

    useEffect(() => {
        return () => {
            clearCooldownGate();
        };
    }, []);

    const switchContext = useCallback((context: string) => {
        if (!userProfile?.isOnboarded) {
            return;
        }
        clearCooldownGate();
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
        clearCooldownGate();
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
