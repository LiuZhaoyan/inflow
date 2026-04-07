/**
 * API Logging utilities for Next.js route handlers
 * Provides helpers for logging with request context
 */

import { logger } from '@/lib/core/logger';

interface RequestLogContext {
  requestId?: string;
  userId?: string;
  endpoint: string;
  statusCode?: number;
  durationMs?: number;
}

/**
 * Extract request ID from headers (or generate one)
 */
export function getRequestId(req: NextRequest): string {
  // Check for existing request ID in headers
  const existing = req.headers.get('x-request-id');
  if (existing) return existing;

  // Generate a new request ID
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

/**
 * Log successful API response
 */
export function logApiSuccess(
  endpoint: string,
  context?: Omit<RequestLogContext, 'endpoint'>,
): void {
  logger.info(`API successful: ${endpoint}`, {
    endpoint,
    ...context,
  });
}

/**
 * Log API error with full context
 */
export function logApiError(
  endpoint: string,
  error: Error | unknown,
  context?: Omit<RequestLogContext, 'endpoint'>,
): void {
  const errorMessage = error instanceof Error ? error.message : String(error);
  logger.error(`API error: ${endpoint} - ${errorMessage}`, {
    endpoint,
    ...context,
    ...(error instanceof Error && { error }),
  });
}

/**
 * Create a wrapper function for measuring duration and extracting request context
 * Usage: const { userId, requestId, endpoint } = createRequestContext(req, 'POST /api/learn-chat');
 */
export async function createRequestContext(
  req: NextRequest,
  endpoint: string,
  userId?: string,
) {
  const requestId = getRequestId(req);
  const startTime = Date.now();

  return {
    requestId,
    userId,
    endpoint,
    getDurationMs: () => Date.now() - startTime,
  };
}

/**
 * Wrap async API handler to measure duration and log errors
 * Note: This is a utility helper available for future use
 */
export function withApiLogging(
  handler: (...args: unknown[]) => Promise<{ status: number }>,
  endpoint: string,
) {
  return async (...args: unknown[]) => {
    const requestId = typeof (args[0] as { headers?: { get: (key: string) => string | null } })?.headers?.get === 'function'
      ? ((args[0] as { headers: { get: (key: string) => string | null } }).headers.get('x-request-id') || `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`)
      : `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

    try {
      const startTime = Date.now();
      const response = await handler(...args);
      const durationMs = Date.now() - startTime;

      logApiSuccess(endpoint, {
        requestId,
        durationMs,
        statusCode: response.status,
      });

      return response;
    } catch (error) {
      const durationMs = Date.now() - ((args[1] instanceof Date) ? args[1].getTime() : 0);
      logApiError(endpoint, error, {
        requestId,
        durationMs: durationMs > 0 ? durationMs : undefined,
      });
      throw error;
    }
  };
}
