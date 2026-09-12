import { INestApplication } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { AllExceptionsFilter } from './common/all-exceptions.filter';

/**
 * Everything the app needs regardless of how it is hosted.
 *
 * Shared by `main.ts` (long-running server, used locally) and `serverless.ts`
 * (Vercel). Keeping it in one place means the two entry points cannot drift —
 * a route prefix or filter configured in only one of them would produce a bug
 * that reproduces in exactly one environment.
 */
export function configureApp(app: INestApplication): void {
  app.use(json({ limit: '25mb' }));
  app.use(urlencoded({ extended: true, limit: '25mb' }));

  // Matches Laravel's `api` route group prefix.
  app.setGlobalPrefix('api');

  app.useGlobalFilters(new AllExceptionsFilter());

  // Only needed when the SPA is served from a different origin, i.e. the Vite
  // dev server. In production Vercel serves both from one domain.
  app.enableCors({
    origin: (process.env.CORS_ORIGINS ?? 'http://localhost:5173,http://localhost:8000').split(','),
    credentials: true,
  });
}

/**
 * Prisma returns every id as a BigInt, which has no JSON representation.
 * Presenters convert the ones they know about; this is the backstop so an
 * unconverted value degrades to a number instead of throwing deep inside
 * response serialization.
 */
export function enableBigIntSerialization(): void {
  (BigInt.prototype as any).toJSON = function () {
    return Number(this);
  };
}
