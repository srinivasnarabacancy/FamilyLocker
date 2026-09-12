import { CanActivate, ExecutionContext, Injectable, SetMetadata } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ApiException } from './errors';

interface ThrottleConfig {
  max: number;
  perMinutes: number;
}

export const THROTTLE_KEY = 'throttle';

/** Equivalent of Laravel's `throttle:max,minutes` middleware. */
export const Throttle = (max: number, perMinutes: number) =>
  SetMetadata(THROTTLE_KEY, { max, perMinutes } satisfies ThrottleConfig);

/**
 * In-memory fixed-window rate limiter.
 *
 * CAVEAT: the counter lives in the process, so on a multi-instance or
 * serverless deployment each instance enforces its own budget. Laravel used the
 * shared `cache` table, which did not have this problem. Before scaling past
 * one instance this must move to Redis or the database — tracked in
 * MIGRATION.md.
 */
@Injectable()
export class ThrottleGuard implements CanActivate {
  private readonly hits = new Map<string, { count: number; expiresAt: number }>();

  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const config = this.reflector.get<ThrottleConfig | undefined>(
      THROTTLE_KEY,
      context.getHandler(),
    );
    if (!config) return true;

    const req = context.switchToHttp().getRequest<Request>();
    const identity = (req as any).user?.id ?? req.ip ?? 'anonymous';
    const key = `${context.getClass().name}:${context.getHandler().name}:${identity}`;
    const now = Date.now();

    this.sweep(now);

    const entry = this.hits.get(key);

    if (!entry || entry.expiresAt <= now) {
      this.hits.set(key, { count: 1, expiresAt: now + config.perMinutes * 60_000 });
      return true;
    }

    if (entry.count >= config.max) {
      throw new ApiException('Too Many Attempts.', 429);
    }

    entry.count += 1;
    return true;
  }

  /** Keeps the map from growing without bound in a long-lived process. */
  private sweep(now: number) {
    if (this.hits.size < 1000) return;
    for (const [key, entry] of this.hits) {
      if (entry.expiresAt <= now) this.hits.delete(key);
    }
  }
}
