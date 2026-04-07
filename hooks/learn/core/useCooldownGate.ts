import { useCallback, useEffect, useRef, useState } from 'react';
import { logger } from '@/lib/core/logger';
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

    const metricsRef = useRef({
        cooldown_blocked_count: 0,
        cooldown_wait_ms: 0,
        pending_action_replaced_count: 0,
        send_after_cooldown_count: 0,
        cooldown_429_event_count: 0,
    });

    useEffect(() => {
        enabledRef.current = input.enabled;
    }, [input.enabled]);

    useEffect(() => {
        onRunRef.current = input.onRun;
        isBlockedRef.current = input.isBlocked;
    }, [input.onRun, input.isBlocked]);

    const logCooldownMetric = (event: string, value?: number) => {
        logger.info('useCooldownGate: cooldown metric', { event, value });
    };

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
        metricsRef.current.cooldown_wait_ms = waitMs;
        logCooldownMetric('cooldown_wait_ms', waitMs);

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
            if (next) {
                metricsRef.current.send_after_cooldown_count += 1;
                logCooldownMetric('send_after_cooldown_count', metricsRef.current.send_after_cooldown_count);
                void runWithCooldown(next);
            }
        };

        cooldownTimerRef.current = window.setTimeout(onCooldownExpire, waitMs);
        startCountdownTicker();
    }, [clearTimers, input.maxMs, startCountdownTicker]);

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

        if (next) {
            metricsRef.current.send_after_cooldown_count += 1;
            logCooldownMetric('send_after_cooldown_count', metricsRef.current.send_after_cooldown_count);
            void runWithCooldown(next);
        }
    }, [input, runWithCooldown]);

    const scheduleOrRun = useCallback((payload: T) => {
        if (isBlockedRef.current?.()) {
            return;
        }

        const now = Date.now();
        if (!enabledRef.current || now >= nextAllowedAtRef.current) {
            void runWithCooldown(payload);
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

        clearTimers();
        cooldownTimerRef.current = window.setTimeout(() => {
            cooldownTimerRef.current = null;
            flushQueuedIfReady();
        }, waitMs);
        startCountdownTicker();
    }, [clearTimers, flushQueuedIfReady, runWithCooldown, startCountdownTicker]);

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
        metricsRef.current.cooldown_429_event_count += 1;
        logCooldownMetric('429_after_cooldown_count', metricsRef.current.cooldown_429_event_count);
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

    useEffect(() => {
        if (!enabledRef.current) {
            cooldownMsRef.current = input.baseMs;
            successSince429Ref.current = 0;
            clear();
        }
    }, [clear, input.baseMs, input.enabled]);

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
