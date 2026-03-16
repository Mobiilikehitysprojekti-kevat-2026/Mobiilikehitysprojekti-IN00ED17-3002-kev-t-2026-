import type { NextFunction, Request, Response } from 'express';
import { ZodError } from 'zod';

export class HttpError extends Error {
  code: string;
  details?: unknown;
  status: number;

  constructor(status: number, code: string, message: string, details?: unknown) {
    super(message);
    this.code = code;
    this.details = details;
    this.status = status;
  }
}

export function errorHandler(
  error: unknown,
  _request: Request,
  response: Response,
  _next: NextFunction,
) {
  if (error instanceof HttpError) {
    response.status(error.status).json({
      code: error.code,
      details: error.details,
      message: error.message,
    });
    return;
  }

  if (error instanceof ZodError) {
    response.status(400).json({
      code: 'VALIDATION_ERROR',
      details: error.flatten(),
      message: 'Request validation failed.',
    });
    return;
  }

  if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'LIMIT_FILE_SIZE') {
    response.status(413).json({
      code: 'IMAGE_TOO_LARGE',
      message: 'The uploaded image exceeds the allowed size.',
    });
    return;
  }

  const message = error instanceof Error ? error.message : 'Unexpected server error.';
  response.status(500).json({
    code: 'INTERNAL_SERVER_ERROR',
    message,
  });
}
