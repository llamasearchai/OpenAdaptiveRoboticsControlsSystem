/**
 * API error classes for typed error handling.
 */

import type { ApiError as ApiErrorType } from '@/types';

/** Base API error class */
export class ApiError extends Error {
  public readonly statusCode: number;
  public readonly errorCode: string;
  public readonly detail: string | undefined;
  public readonly fieldErrors: Record<string, string[]> | undefined;

  /** Alias for errorCode to match ApiError interface */
  public get error(): string {
    return this.errorCode;
  }

  constructor(
    message: string,
    statusCode: number,
    errorCode: string = 'api_error',
    detail?: string,
    fieldErrors?: Record<string, string[]>
  ) {
    super(message);
    this.name = 'ApiError';
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.detail = detail;
    this.fieldErrors = fieldErrors;

    // Maintains proper stack trace for where our error was thrown
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, ApiError);
    }
  }

  /** Create from API error response */
  static fromResponse(response: ApiErrorType, statusCode: number): ApiError {
    return new ApiError(
      response.message,
      statusCode,
      response.error,
      response.detail,
      response.field_errors
    );
  }

  /** Check if error is a validation error */
  isValidationError(): boolean {
    return this.statusCode === 422 || this.statusCode === 400;
  }

  /** Check if error is an authentication error */
  isAuthError(): boolean {
    return this.statusCode === 401;
  }

  /** Check if error is a forbidden error */
  isForbiddenError(): boolean {
    return this.statusCode === 403;
  }

  /** Check if error is a not found error */
  isNotFoundError(): boolean {
    return this.statusCode === 404;
  }

  /** Check if error is a server error */
  isServerError(): boolean {
    return this.statusCode >= 500;
  }

  /** Check if error is retryable */
  isRetryable(): boolean {
    return (
      this.statusCode === 429 ||
      this.statusCode === 503 ||
      this.statusCode >= 500
    );
  }

  toJSON(): ApiErrorType {
    const result: ApiErrorType = {
      error: this.errorCode,
      message: this.message,
      status_code: this.statusCode,
    };
    if (this.detail !== undefined) result.detail = this.detail;
    if (this.fieldErrors !== undefined) result.field_errors = this.fieldErrors;
    return result;
  }
}

/** Network error - connection failed */
export class NetworkError extends Error {
  public readonly originalError: Error | undefined;

  constructor(message: string = 'Network request failed', originalError?: Error) {
    super(message);
    this.name = 'NetworkError';
    this.originalError = originalError;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, NetworkError);
    }
  }

  /** Check if error is likely due to being offline */
  isOffline(): boolean {
    return typeof navigator !== 'undefined' && !navigator.onLine;
  }
}

/** Timeout error - request took too long */
export class TimeoutError extends Error {
  public readonly timeoutMs: number;

  constructor(timeoutMs: number) {
    super(`Request timed out after ${timeoutMs}ms`);
    this.name = 'TimeoutError';
    this.timeoutMs = timeoutMs;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, TimeoutError);
    }
  }
}

/** Abort error - request was cancelled */
export class AbortError extends Error {
  constructor(message: string = 'Request was aborted') {
    super(message);
    this.name = 'AbortError';

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AbortError);
    }
  }
}

/** WebSocket error */
export class WebSocketError extends Error {
  public readonly code: number | undefined;
  public readonly reason: string | undefined;

  constructor(message: string, code?: number, reason?: string) {
    super(message);
    this.name = 'WebSocketError';
    this.code = code;
    this.reason = reason;

    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, WebSocketError);
    }
  }

  /** Check if error is due to normal closure */
  isNormalClosure(): boolean {
    return this.code === 1000;
  }

  /** Check if error is due to going away (page unload) */
  isGoingAway(): boolean {
    return this.code === 1001;
  }
}

/** Type guard for ApiError */
export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

/** Type guard for NetworkError */
export function isNetworkError(error: unknown): error is NetworkError {
  return error instanceof NetworkError;
}

/** Type guard for TimeoutError */
export function isTimeoutError(error: unknown): error is TimeoutError {
  return error instanceof TimeoutError;
}

/** Type guard for AbortError */
export function isAbortError(error: unknown): error is AbortError {
  return error instanceof AbortError || (error instanceof Error && error.name === 'AbortError');
}

/** Type guard for WebSocketError */
export function isWebSocketError(error: unknown): error is WebSocketError {
  return error instanceof WebSocketError;
}

/** Get user-friendly error message */
export function getErrorMessage(error: unknown): string {
  if (isApiError(error)) {
    return error.message;
  }
  if (isNetworkError(error)) {
    return error.isOffline()
      ? 'You appear to be offline. Please check your internet connection.'
      : 'Unable to connect to the server. Please try again.';
  }
  if (isTimeoutError(error)) {
    return 'The request took too long. Please try again.';
  }
  if (isAbortError(error)) {
    return 'The request was cancelled.';
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'An unexpected error occurred.';
}
