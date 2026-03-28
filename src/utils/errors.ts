import type { ApiError } from '../types/api';

export class AppError extends Error {
  code: string;
  details?: unknown;

  constructor(message: string, code = 'APP_ERROR', details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
  }
}

export function normalizeApiError(error: unknown): ApiError {
  if (error instanceof AppError) {
    return {
      code: error.code,
      details: error.details,
      message: error.message,
    };
  }

  if (error instanceof Error) {
    return {
      code: 'UNKNOWN_ERROR',
      message: error.message,
    };
  }

  if (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof error.message === 'string'
  ) {
    return {
      code:
        'code' in error && typeof error.code === 'string' ? error.code : 'UNKNOWN_ERROR',
      details: 'details' in error ? error.details : undefined,
      message: error.message,
    };
  }

  return {
    code: 'UNKNOWN_ERROR',
    message: 'Unexpected error',
  };
}