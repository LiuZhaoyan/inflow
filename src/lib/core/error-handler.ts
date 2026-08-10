import { NextResponse } from 'next/server';
import { v4 as uuidv4 } from 'uuid';
import { logger } from './logger';

/**
 * Standardized error codes for API responses
 */
export enum ErrorCode {
  // Client errors (4xx)
  INVALID_REQUEST = 'INVALID_REQUEST',
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',
  NOT_FOUND = 'NOT_FOUND',
  CONFLICT = 'CONFLICT',
  RATE_LIMITED = 'RATE_LIMITED',
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // Server errors (5xx)
  INTERNAL_ERROR = 'INTERNAL_ERROR',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  TIMEOUT = 'TIMEOUT',
  EXTERNAL_API_ERROR = 'EXTERNAL_API_ERROR',

  // Domain-specific errors
  AI_SERVICE_ERROR = 'AI_SERVICE_ERROR',
  DATABASE_ERROR = 'DATABASE_ERROR',
  STORAGE_ERROR = 'STORAGE_ERROR',
  AUTH_ERROR = 'AUTH_ERROR',
}

/**
 * Standardized API error response structure
 */
export interface ApiErrorResponse {
  error: {
    code: ErrorCode;
    message: string;
    traceId: string;
  };
}

/**
 * Error metadata for structured logging and handling
 */
export interface ErrorMetadata {
  endpoint: string;
  userId?: string;
  requestId?: string;
  statusCode: number;
  durationMs: number;
  originalError?: Error;
  context?: Record<string, unknown>;
}

/**
 * Map error code to HTTP status
 */
const ERROR_STATUS_MAP: Record<ErrorCode, number> = {
  [ErrorCode.INVALID_REQUEST]: 400,
  [ErrorCode.UNAUTHORIZED]: 401,
  [ErrorCode.FORBIDDEN]: 403,
  [ErrorCode.NOT_FOUND]: 404,
  [ErrorCode.CONFLICT]: 409,
  [ErrorCode.RATE_LIMITED]: 429,
  [ErrorCode.VALIDATION_ERROR]: 400,
  [ErrorCode.INTERNAL_ERROR]: 500,
  [ErrorCode.SERVICE_UNAVAILABLE]: 503,
  [ErrorCode.TIMEOUT]: 504,
  [ErrorCode.EXTERNAL_API_ERROR]: 503,
  [ErrorCode.AI_SERVICE_ERROR]: 503,
  [ErrorCode.DATABASE_ERROR]: 500,
  [ErrorCode.STORAGE_ERROR]: 500,
  [ErrorCode.AUTH_ERROR]: 401,
};

/**
 * User-friendly error messages
 */
const ERROR_MESSAGES: Record<ErrorCode, string> = {
  [ErrorCode.INVALID_REQUEST]: 'Invalid request. Please check your input.',
  [ErrorCode.UNAUTHORIZED]: 'Authentication required.',
  [ErrorCode.FORBIDDEN]: 'Access denied.',
  [ErrorCode.NOT_FOUND]: 'Resource not found.',
  [ErrorCode.CONFLICT]: 'Resource conflict.',
  [ErrorCode.RATE_LIMITED]: 'Too many requests. Please try again in a moment.',
  [ErrorCode.VALIDATION_ERROR]: 'Validation failed.',
  [ErrorCode.INTERNAL_ERROR]: 'An unexpected error occurred.',
  [ErrorCode.SERVICE_UNAVAILABLE]: 'Service temporarily unavailable.',
  [ErrorCode.TIMEOUT]: 'Request timeout. Please try again.',
  [ErrorCode.EXTERNAL_API_ERROR]: 'External service error. Please try again later.',
  [ErrorCode.AI_SERVICE_ERROR]: 'AI service temporarily unavailable. Please try again.',
  [ErrorCode.DATABASE_ERROR]: 'Database error occurred.',
  [ErrorCode.STORAGE_ERROR]: 'Storage error occurred.',
  [ErrorCode.AUTH_ERROR]: 'Authentication error.',
};

/**
 * Create standardized error response
 */
export function createErrorResponse(
  code: ErrorCode,
  customMessage?: string
): ApiErrorResponse {
  return {
    error: {
      code,
      message: customMessage || ERROR_MESSAGES[code],
      traceId: uuidv4(),
    },
  };
}

/**
 * Create NextResponse with standardized error format
 */
export function createErrorNextResponse(
  code: ErrorCode,
  customMessage?: string,
  headers?: Record<string, string>
): NextResponse {
  const status = ERROR_STATUS_MAP[code];
  const body = createErrorResponse(code, customMessage);

  const responseHeaders = new Headers(headers);

  if (code === ErrorCode.RATE_LIMITED) {
    responseHeaders.set('Retry-After', '10');
  }

  return NextResponse.json(body, { status, headers: responseHeaders });
}

/**
 * Classify error and return appropriate error code
 */
export function classifyError(error: unknown): ErrorCode {
  if (error instanceof Error) {
    const message = error.message.toLowerCase();

    if (message.includes('rate limit') || message.includes('429')) {
      return ErrorCode.RATE_LIMITED;
    }
    if (message.includes('timeout')) {
      return ErrorCode.TIMEOUT;
    }
    if (message.includes('unauthorized') || message.includes('401')) {
      return ErrorCode.UNAUTHORIZED;
    }
    if (message.includes('forbidden') || message.includes('403')) {
      return ErrorCode.FORBIDDEN;
    }
    if (message.includes('not found') || message.includes('404')) {
      return ErrorCode.NOT_FOUND;
    }
    if (message.includes('conflict') || message.includes('409')) {
      return ErrorCode.CONFLICT;
    }
    if (message.includes('validation')) {
      return ErrorCode.VALIDATION_ERROR;
    }
  }

  const err = error as {
    status?: number;
    code?: string;
    response?: { status?: number; data?: { error?: { code?: string } } };
    cause?: { status?: number; response?: { status?: number } };
  };

  const status =
    err?.status ||
    err?.response?.status ||
    err?.cause?.status ||
    err?.cause?.response?.status;

  const code = err?.code || err?.response?.data?.error?.code;

  if (status === 429 || code === 'rate_limit' || code === 'rate_limited') {
    return ErrorCode.RATE_LIMITED;
  }
  if (status === 401) {
    return ErrorCode.UNAUTHORIZED;
  }
  if (status === 403) {
    return ErrorCode.FORBIDDEN;
  }
  if (status === 404) {
    return ErrorCode.NOT_FOUND;
  }
  if (status === 409) {
    return ErrorCode.CONFLICT;
  }
  if (status === 503) {
    return ErrorCode.SERVICE_UNAVAILABLE;
  }

  return ErrorCode.INTERNAL_ERROR;
}

/**
 * Handle API error with structured logging and response
 */
export function handleApiError(
  error: unknown,
  metadata: ErrorMetadata
): NextResponse {
  const errorCode = classifyError(error);
  const status = ERROR_STATUS_MAP[errorCode];

  logger.error('API error', {
    endpoint: metadata.endpoint,
    userId: metadata.userId,
    requestId: metadata.requestId,
    statusCode: status,
    durationMs: metadata.durationMs,
    errorCode,
    error: error instanceof Error ? error : undefined,
    context: metadata.context,
  });

  return createErrorNextResponse(errorCode);
}
