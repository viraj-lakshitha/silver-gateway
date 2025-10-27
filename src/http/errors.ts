export class HttpError extends Error {
  public readonly statusCode: number;
  public readonly details?: unknown;

  constructor(statusCode: number, message: string, details?: unknown) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
    this.details = details;
    Error.captureStackTrace?.(this, HttpError);
  }
}

export class NotFoundError extends HttpError {
  constructor(message = 'Resource not found', details?: unknown) {
    super(404, message, details);
    this.name = 'NotFoundError';
  }
}

export class ValidationError extends HttpError {
  constructor(message = 'Validation failed', details?: unknown) {
    super(400, message, details);
    this.name = 'ValidationError';
  }
}
