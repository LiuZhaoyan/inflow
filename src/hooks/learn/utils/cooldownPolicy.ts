interface CooldownBounds {
    baseMs: number;
    maxMs: number;
}

interface CooldownDecayInput {
    cooldownMs: number;
    successSince429: number;
    baseMs: number;
    successWindowForDecay: number;
    decayStepMs?: number;
}

export function parseRetryAfterMs(headerValue: string | null, fallbackMs: number): number {
    const seconds = Number(headerValue);
    if (Number.isFinite(seconds) && seconds > 0) {
        return seconds * 1000;
    }
    return fallbackMs;
}

export function computeCooldownAfter429(
    currentCooldownMs: number,
    retryAfterMs: number,
    bounds: CooldownBounds,
): number {
    return Math.min(
        bounds.maxMs,
        Math.max(currentCooldownMs, retryAfterMs, bounds.baseMs),
    );
}

export function computeCooldownAfterSuccess(input: CooldownDecayInput): {
    cooldownMs: number;
    successSince429: number;
} {
    const nextSuccessCount = input.successSince429 + 1;
    if (nextSuccessCount < input.successWindowForDecay) {
        return {
            cooldownMs: input.cooldownMs,
            successSince429: nextSuccessCount,
        };
    }

    return {
        cooldownMs: Math.max(input.baseMs, input.cooldownMs - (input.decayStepMs ?? 1000)),
        successSince429: 0,
    };
}
