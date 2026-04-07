/**
 * Standardized logger utility for the application
 * Supports three levels: info, warn, error
 * Error logs include: request ID, user ID (anonymized), endpoint name, duration, status code
 */

type LogLevel = 'info' | 'warn' | 'error';

interface LogContext {
  requestId?: string;
  userId?: string;
  endpoint?: string;
  durationMs?: number;
  statusCode?: number;
  [key: string]: unknown;
}

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  message: string;
  context?: LogContext;
  error?: {
    message: string;
    stack?: string;
  };
}

/**
 * Anonymize user ID by showing only first 4 and last 4 characters
 */
function anonymizeUserId(userId: string): string {
  if (!userId || userId.length <= 8) {
    return '****';
  }
  return `${userId.slice(0, 4)}****${userId.slice(-4)}`;
}

/**
 * Format log entry for output
 */
function formatLogEntry(entry: LogEntry): string {
  const contextStr = entry.context
    ? ` | ${JSON.stringify(entry.context)}`
    : '';

  const errorStr = entry.error
    ? ` | Error: ${entry.error.message}`
    : '';

  return `[${entry.timestamp}] [${entry.level.toUpperCase()}] ${entry.message}${contextStr}${errorStr}`;
}

/**
 * Core logger function
 */
function log(
  level: LogLevel,
  message: string,
  contextOrError?: LogContext | Error | unknown,
): void {
  let context: LogContext | undefined;
  let error: LogEntry['error'] | undefined;

  if (contextOrError instanceof Error) {
    error = {
      message: contextOrError.message,
      stack: contextOrError.stack,
    };
  } else if (typeof contextOrError === 'object' && contextOrError !== null) {
    context = contextOrError as LogContext;
  }

  // Anonymize userId if present
  if (context?.userId && typeof context.userId === 'string') {
    context.userId = anonymizeUserId(context.userId);
  }

  const entry: LogEntry = {
    timestamp: new Date().toISOString(),
    level,
    message,
    ...(context && { context }),
    ...(error && { error }),
  };

  const formatted = formatLogEntry(entry);

  // Send to console with appropriate level
  switch (level) {
    case 'error':
      console.error(formatted);
      break;
    case 'warn':
      console.warn(formatted);
      break;
    case 'info':
    default:
      console.log(formatted);
  }

  // In production, you might want to send logs to an external service
  // e.g., via a logging service like Sentry, DataDog, etc.
}

/**
 * Public logger API
 */
export const logger = {
  /**
   * Log informational messages
   */
  info(message: string, context?: LogContext): void {
    log('info', message, context);
  },

  /**
   * Log warning messages
   */
  warn(message: string, context?: LogContext | Error): void {
    log('warn', message, context);
  },

  /**
   * Log error messages with optional context
   * Best for API errors, missing data, exceptions
   */
  error(message: string, contextOrError?: LogContext | Error): void {
    log('error', message, contextOrError);
  },

  /**
   * Helper to log API errors with standard context
   */
  errorWithRequest(
    message: string,
    {
      requestId,
      userId,
      endpoint,
      statusCode,
      durationMs,
      error,
    }: {
      requestId?: string;
      userId?: string;
      endpoint?: string;
      statusCode?: number;
      durationMs?: number;
      error?: Error | unknown;
    },
  ): void {
    const context: LogContext = {
      ...(requestId && { requestId }),
      ...(userId && { userId }),
      ...(endpoint && { endpoint }),
      ...(statusCode !== undefined && { statusCode }),
      ...(durationMs !== undefined && { durationMs }),
    };

    log('error', message, error instanceof Error ? error : context);
  },
};
