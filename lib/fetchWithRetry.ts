/**
 * Shared fetch wrapper with automatic 429 retry + backoff.
 *
 * - Only retries on HTTP 429 (Too Many Requests).
 * - Respects the `Retry-After` response header (seconds) when present; otherwise
 *   falls back to `defaultDelayMs` (default 10 000 ms).
 * - Honours `AbortSignal` – if the caller's signal is aborted the retry loop
 *   stops immediately and re-throws the AbortError.
 * - All other status codes are returned as-is on the first attempt.
 */

export interface FetchRetryOptions {
    /** Maximum number of retry attempts (default: 3). */
    maxRetries?: number;
    /** Fallback delay in ms when no `Retry-After` header is present (default: 10 000). */
    defaultDelayMs?: number;
    /** Optional callback invoked before each retry wait. */
    onRetry?: (attempt: number, retryAfterMs: number) => void;
}

const DEFAULT_MAX_RETRIES = 3;
const DEFAULT_DELAY_MS = 15_000;

function parseRetryAfter(res: Response, fallback: number): number {
    const header = res.headers.get('Retry-After');
    if (!header) return fallback;
    const seconds = Number(header);
    if (Number.isFinite(seconds) && seconds > 0) return seconds * 1000;
    return fallback;
}

function delay(ms: number, signal?: AbortSignal | null): Promise<void> {
    return new Promise<void>((resolve, reject) => {
        if (signal?.aborted) {
            reject(signal.reason ?? new DOMException('Aborted', 'AbortError'));
            return;
        }
        const timer = setTimeout(resolve, ms);
        const onAbort = () => {
            clearTimeout(timer);
            reject(signal!.reason ?? new DOMException('Aborted', 'AbortError'));
        };
        signal?.addEventListener('abort', onAbort, { once: true });
    });
}

export async function fetchWithRetry(
    input: RequestInfo | URL,
    init?: RequestInit,
    options?: FetchRetryOptions,
): Promise<Response> {
    const maxRetries = options?.maxRetries ?? DEFAULT_MAX_RETRIES;
    const defaultDelayMs = options?.defaultDelayMs ?? DEFAULT_DELAY_MS;
    const signal = init?.signal ?? null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
        const res = await fetch(input, init);

        if (res.status !== 429) return res;

        // Last attempt exhausted — return the 429 as-is so caller can handle it.
        if (attempt === maxRetries) return res;

        const waitMs = parseRetryAfter(res, defaultDelayMs);
        options?.onRetry?.(attempt + 1, waitMs);
        console.warn(
            `[fetchWithRetry] 429 received – retrying in ${waitMs}ms (attempt ${attempt + 1}/${maxRetries})`,
        );
        await delay(waitMs, signal);
    }

    // Unreachable, but satisfies TS.
    return fetch(input, init);
}
