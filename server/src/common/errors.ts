import { HttpException } from '@nestjs/common';
import { failure } from './laravel';

/**
 * Mirrors BaseApiController::errorResponse — the frontend reads
 * `{ success, message, errors }`, so every failure path must produce it.
 */
export class ApiException extends HttpException {
  constructor(message: string, status = 400, errors: unknown = null) {
    super(failure(message, errors), status);
  }
}

/** 422 in the shape Laravel's Validator produces: `{ field: [messages] }`. */
export class ValidationException extends ApiException {
  constructor(errors: Record<string, string[]>, message = 'Validation failed') {
    super(message, 422, errors);
  }
}

export class NotFoundException extends ApiException {
  constructor(message: string) {
    super(message, 404);
  }
}

export class ForbiddenException extends ApiException {
  constructor(message: string) {
    super(message, 403);
  }
}

export class UnauthorizedException extends ApiException {
  constructor(message = 'Unauthenticated.') {
    super(message, 401);
  }
}

/**
 * Storage misconfiguration or an upstream failure from Supabase. A 500, but
 * with the reason attached: these are almost always a wrong env var, and the
 * generic "Server Error" gives the operator nothing to act on. The text is
 * safe to expose — it names buckets and status codes, never credentials.
 */
export class StorageException extends ApiException {
  constructor(message: string) {
    super(message, 500);
  }
}
