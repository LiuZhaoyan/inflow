import { logger } from '@/lib/core/logger';

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  delayMs: number;
  backoffMultiplier: number;
  timeoutMs: number;
}

/**
 * Default retry configuration
 */
export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 3,
  delayMs: 1000,
  backoffMultiplier: 2,
  timeoutMs: 30000,
};

/**
 * Reduced retry for rate-limited endpoints
 */
export const RATE_LIMIT_RETRY_CONFIG: RetryConfig = {
  maxAttempts: 2,
  delayMs: 5000,
  backoffMultiplier: 1,
  timeoutMs: 30000,
};

/**
 * Custom timeout error
 */
export class TimeoutError extends Error {
  constructor(operationName: string, timeoutMs: number) {
    super(`${operationName} timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
  }
}

/**
 * Execute async function with timeout
 */
async function withTimeout<T>(
  operation: () => Promise<T>,
  timeoutMs: number,
  operationName: string = 'Operation'
): Promise<T> {
  return Promise.race([
    operation(),
    new Promise<T>((_, reject) =>
      setTimeout(
        () => reject(new TimeoutError(operationName, timeoutMs)),
        timeoutMs
      )
    ),
  ]);
}

/**
 * Determine if error is retryable
 */
function isRetryableError(error: unknown): boolean {
  if (error instanceof TimeoutError) return true;

  const err = error as {
    status?: number;
    code?: string;
    response?: { status?: number };
  };

  const status = err?.status || err?.response?.status;

  // Retry on 5xx and specific 4xx errors
  if (status && (status >= 500 || status === 408 || status === 429)) {
    return true;
  }

  // Retry on network errors
  if (err?.code === 'ECONNREFUSED' || err?.code === 'ENOTFOUND') {
    return true;
  }

  return false;
}

/**
 * Execute async function with retry and timeout
 * Falls back to fallbackValue if all retries fail
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  config: RetryConfig = DEFAULT_RETRY_CONFIG,
  fallbackValue?: T
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      logger.info(`${operationName} attempt ${attempt}/${config.maxAttempts}`, {
        attempt,
      });

      const result = await withTimeout(
        operation,
        config.timeoutMs,
        operationName
      );

      logger.info(`${operationName} succeeded on attempt ${attempt}`, {
        attempt,
      });

      return result;
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (!isRetryableError(error)) {
        logger.warn(`${operationName} failed with non-retryable error`, {
          attempt,
          error: lastError,
        });
        throw error;
      }

      if (attempt < config.maxAttempts) {
        const delayMs = config.delayMs * Math.pow(config.backoffMultiplier, attempt - 1);
        logger.warn(`${operationName} failed, retrying in ${delayMs}ms`, {
          attempt,
          error: lastError,
          nextRetryMs: delayMs,
        });
        await new Promise((resolve) => setTimeout(resolve, delayMs));
      }
    }
  }

  // All retries exhausted
  if (fallbackValue !== undefined) {
    logger.warn(
      `${operationName} failed after ${config.maxAttempts} attempts, using fallback`,
      {
        error: lastError,
      }
    );
    return fallbackValue;
  }

  logger.error(
    `${operationName} failed after ${config.maxAttempts} attempts`,
    {
      error: lastError,
    }
  );

  throw lastError || new Error(`${operationName} failed`);
}

/**
 * Promisified version of setTimeout for cleaner async/await
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
