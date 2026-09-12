import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Response } from 'express';
import { failure } from './laravel';

/**
 * Guarantees every error leaves the API in the Laravel envelope, including
 * ones thrown by Nest itself (e.g. payload-too-large from multer) which would
 * otherwise use Nest's own `{statusCode, message}` shape and break the client's
 * error handling.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Http');

  catch(exception: unknown, host: ArgumentsHost) {
    const res = host.switchToHttp().getResponse<Response>();

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const body = exception.getResponse();

      // ApiException already carries the envelope; anything else is adapted.
      if (body && typeof body === 'object' && 'success' in body) {
        return res.status(status).json(body);
      }

      const message =
        typeof body === 'string'
          ? body
          : ((body as any)?.message ?? exception.message ?? 'Error');

      return res.status(status).json(failure(Array.isArray(message) ? message[0] : message));
    }

    this.logger.error(exception instanceof Error ? exception.stack : String(exception));

    return res
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json(failure('Server Error'));
  }
}
