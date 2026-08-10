import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { computeCooldownAfter429, computeCooldownAfterSuccess } from '@/hooks/learn/utils/cooldownPolicy';

interface CooldownGateInput<T extends { queuedAt?: number }> {
    enabled: boolean;
    baseMs: number;
    maxMs: number;
    fallbackRetryAfterMs: number;
    successWindowForDecay: number;
    onRun: (payload: T) => Promise<void>;
    isBlocked?: () => boolean;
}

interface CooldownGateOutput<T extends { queuedAt?: number }> {
    isCooldownActive: boolean;
    cooldownRemainingMs: number;
    hasQueuedAction: boolean;
    scheduleOrRun: (payload: T) => void;
    notify429: (retryAfterMs?: number) => void;
    notifySuccess: () => void;
    flushQueuedIfReady: () => void;
    clear: () => void;
}

export function useCooldownGate<T extends { queuedAt?: number }>(
    input: CooldownGateInput<T>,
): CooldownGateOutput<T> {
    const [cooldownRemainingMs, setCooldownRemainingMs] = useState(0);
    const [hasQueuedAction, setHasQueuedAction] = useState(false);

    const nextAllowedAtRef = useRef(0);
    const cooldownTimerRef = useRef<number | null>(null);
    const countdownTimerRef = useRef<number | null>(null);
    const pendingActionRef = useRef<T | null>(null);
    const cooldownMsRef = useRef(input.baseMs);
    const successSince429Ref = useRef(0);
    const enabledRef = useRef(input.enabled);
    const onRunRef = useRef(input.onRun);
    const isBlockedRef = useRef(input.isBlocked);
    const runWithCooldownRef = useRef<((payload: T) => Promise<void>) | null>(null);

    useEffect(() => {
        enabledRef.current = input.enabled;
    }, [input.enabled]);

    useEffect(() => {
        onRunRef.current = input.onRun;
        isBlockedRef.current = input.isBlocked;
    }, [input.onRun, input.isBlocked]);

    const clearTimers = useCallback(() => {
        if (cooldownTimerRef.current !== null) {
            window.clearTimeout(cooldownTimerRef.current);
            cooldownTimerRef.current = null;
        }
        if (countdownTimerRef.current !== null) {
            window.clearInterval(countdownTimerRef.current);
            countdownTimerRef.current = null;
        }
    }, []);

    const startCountdownTicker = useCallback(() => {
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
    }, []);

    const runWithCooldown = useCallback(async (payload: T) => {
        if (isBlockedRef.current?.()) {
            return;
        }

        await onRunRef.current(payload);

        if (!enabledRef.current) {
            return;
        }

        const waitMs = Math.max(0, Math.min(cooldownMsRef.current, input.maxMs));
        nextAllowedAtRef.current = Date.now() + waitMs;
        setCooldownRemainingMs(waitMs);

        clearTimers();
        if (waitMs <= 0) {
            setCooldownRemainingMs(0);
            return;
        }

        const onCooldownExpire = () => {
            cooldownTimerRef.current = null;
            const remaining = nextAllowedAtRef.current - Date.now();
            if (remaining > 0) {
                cooldownTimerRef.current = window.setTimeout(onCooldownExpire, remaining);
                startCountdownTicker();
                return;
            }

            setCooldownRemainingMs(0);
            if (isBlockedRef.current?.()) {
                return;
            }

            const next = pendingActionRef.current;
            pendingActionRef.current = null;
            setHasQueuedAction(false);
            if (next && runWithCooldownRef.current) {
                void runWithCooldownRef.current(next);
            }
        };

        cooldownTimerRef.current = window.setTimeout(onCooldownExpire, waitMs);
        startCountdownTicker();
    }, [clearTimers, input.maxMs, startCountdownTicker]);

    useEffect(() => {
        runWithCooldownRef.current = runWithCooldown;
    }, [runWithCooldown]);

    const flushQueuedIfReady = useCallback(() => {
        if (isBlockedRef.current?.()) {
            return;
        }

        if (Date.now() < nextAllowedAtRef.current) {
            return;
        }

        const next = pendingActionRef.current;
        pendingActionRef.current = null;
        setHasQueuedAction(false);
        setCooldownRemainingMs(0);

        if (next && runWithCooldownRef.current) {
            void runWithCooldownRef.current(next);
        }
    }, []);

    const scheduleOrRun = useCallback((payload: T) => {
        if (isBlockedRef.current?.()) {
            return;
        }

        const now = Date.now();
        if (!enabledRef.current || now >= nextAllowedAtRef.current) {
            if (runWithCooldownRef.current) {
                void runWithCooldownRef.current(payload);
            }
            return;
        }

        pendingActionRef.current = {
            ...payload,
            queuedAt: now,
        };
        setHasQueuedAction(true);

        const waitMs = Math.max(0, nextAllowedAtRef.current - now);
        setCooldownRemainingMs(waitMs);

        clearTimers();
        cooldownTimerRef.current = window.setTimeout(() => {
            cooldownTimerRef.current = null;
            flushQueuedIfReady();
        }, waitMs);
        startCountdownTicker();
    }, [clearTimers, flushQueuedIfReady, startCountdownTicker]);

    const notify429 = useCallback((retryAfterMs?: number) => {
        successSince429Ref.current = 0;
        cooldownMsRef.current = computeCooldownAfter429(
            cooldownMsRef.current,
            retryAfterMs ?? input.fallbackRetryAfterMs,
            {
                baseMs: input.baseMs,
                maxMs: input.maxMs,
            },
        );
    }, [input.baseMs, input.fallbackRetryAfterMs, input.maxMs]);

    const notifySuccess = useCallback(() => {
        const nextState = computeCooldownAfterSuccess({
            cooldownMs: cooldownMsRef.current,
            successSince429: successSince429Ref.current,
            baseMs: input.baseMs,
            successWindowForDecay: input.successWindowForDecay,
            decayStepMs: 1000,
        });
        cooldownMsRef.current = nextState.cooldownMs;
        successSince429Ref.current = nextState.successSince429;
    }, [input.baseMs, input.successWindowForDecay]);

    const clear = useCallback(() => {
        clearTimers();
        pendingActionRef.current = null;
        nextAllowedAtRef.current = 0;
        setHasQueuedAction(false);
        setCooldownRemainingMs(0);
    }, [clearTimers]);

    const stateUpdateScheduledRef = useRef(false);

    useLayoutEffect(() => {
        if (!enabledRef.current && !stateUpdateScheduledRef.current) {
            stateUpdateScheduledRef.current = true;
            cooldownMsRef.current = input.baseMs;
            successSince429Ref.current = 0;
            clearTimers();
            pendingActionRef.current = null;
            nextAllowedAtRef.current = 0;
            // Schedule state updates in a separate microtask
            Promise.resolve().then(() => {
                setHasQueuedAction(false);
                setCooldownRemainingMs(0);
                stateUpdateScheduledRef.current = false;
            });
        }
    }, [clearTimers, input.baseMs, input.enabled]);

    useEffect(() => {
        return () => {
            clear();
        };
    }, [clear]);

    return {
        isCooldownActive: cooldownRemainingMs > 0,
        cooldownRemainingMs,
        hasQueuedAction,
        scheduleOrRun,
        notify429,
        notifySuccess,
        flushQueuedIfReady,
        clear,
    };
}
