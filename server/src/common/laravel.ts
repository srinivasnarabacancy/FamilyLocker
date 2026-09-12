/**
 * Laravel/Eloquent JSON-compatibility primitives.
 *
 * The Vue frontend is unchanged, so every response this service produces has to
 * look byte-for-byte like the one Laravel produced. The three things that
 * silently differ between Eloquent and Prisma are dates, decimals and bigints —
 * all of them are funnelled through here.
 */

import { Prisma } from '@prisma/client';

/**
 * Eloquent serializes every Carbon instance with `Carbon::toJSON()`, which is
 * ISO-8601 in UTC with SIX fractional digits and a literal `Z`:
 *
 *     2026-03-14T09:15:30.000000Z
 *
 * `Date.prototype.toISOString()` emits only three, so it is NOT interchangeable.
 * The app timezone is UTC (config/app.php), and the underlying columns are
 * `timestamp without time zone`, so no offset conversion is needed.
 */
export function dateTime(value: Date | null | undefined): string | null {
  if (!value) return null;

  const pad = (n: number, width = 2) => String(n).padStart(width, '0');

  const y = value.getUTCFullYear();
  const mo = pad(value.getUTCMonth() + 1);
  const d = pad(value.getUTCDate());
  const h = pad(value.getUTCHours());
  const mi = pad(value.getUTCMinutes());
  const s = pad(value.getUTCSeconds());
  // JS only carries millisecond precision; pad to Carbon's microseconds.
  const micro = pad(value.getUTCMilliseconds(), 3) + '000';

  return `${y}-${mo}-${d}T${h}:${mi}:${s}.${micro}Z`;
}

/**
 * A `'date'` cast is still a Carbon instance under the hood, so Eloquent
 * serializes it as a full timestamp at midnight — NOT as `YYYY-MM-DD`.
 * Aliased separately so the intent is readable at each call site.
 */
export const dateCast = dateTime;

/** `YYYY-MM-DD`, used where Laravel called `->toDateString()` explicitly. */
export function dateString(value: Date | null | undefined): string | null {
  if (!value) return null;
  return value.toISOString().slice(0, 10);
}

/**
 * Postgres `time` columns have no Eloquent cast, so Laravel hands back the raw
 * driver string (`14:30:00`). Prisma hydrates them into a Date on 1970-01-01.
 */
export function timeString(value: Date | null | undefined): string | null {
  if (!value) return null;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${pad(value.getUTCHours())}:${pad(value.getUTCMinutes())}:${pad(value.getUTCSeconds())}`;
}

/**
 * `'decimal:2'` casts render as STRINGS in Laravel (`number_format`), e.g.
 * `"1250.00"`. Returning a JS number here would change the response type.
 */
export function decimal2(value: Prisma.Decimal | number | string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  return new Prisma.Decimal(value).toFixed(2);
}

/** Eloquent emits integer ids as JSON numbers, not strings. */
export function int(value: bigint | number | null | undefined): number | null {
  if (value === null || value === undefined) return null;
  return Number(value);
}

/** Aggregates (`SUM`) come back from Postgres as strings in Laravel too. */
export function sumString(value: Prisma.Decimal | number | null | undefined): string {
  if (value === null || value === undefined) return '0';
  return new Prisma.Decimal(value).toString();
}

// ─── Response envelope (mirrors BaseApiController) ──────────────────────────

export interface ApiEnvelope<T> {
  success: boolean;
  message: string;
  data?: T;
  errors?: unknown;
}

export function success<T>(data: T, message = 'Success') {
  return { success: true, message, data };
}

export function failure(message = 'Error', errors: unknown = null) {
  return { success: false, message, errors };
}

// ─── Paginator (mirrors LengthAwarePaginator's JSON shape) ──────────────────

export interface Paginated<T> {
  current_page: number;
  data: T[];
  first_page_url: string;
  from: number | null;
  last_page: number;
  last_page_url: string;
  links: Array<{ url: string | null; label: string; active: boolean }>;
  next_page_url: string | null;
  path: string;
  per_page: number;
  prev_page_url: string | null;
  to: number | null;
  total: number;
}

/**
 * Rebuilds `LengthAwarePaginator::toArray()`, including the `links` array that
 * Laravel renders for pagination controls (previous, one entry per page, next).
 */
export function paginate<T>(
  items: T[],
  total: number,
  page: number,
  perPage: number,
  path: string,
): Paginated<T> {
  const lastPage = Math.max(1, Math.ceil(total / perPage));
  const url = (p: number) => `${path}?page=${p}`;

  const links: Paginated<T>['links'] = [
    { url: page > 1 ? url(page - 1) : null, label: '&laquo; Previous', active: false },
  ];
  for (let p = 1; p <= lastPage; p++) {
    links.push({ url: url(p), label: String(p), active: p === page });
  }
  links.push({ url: page < lastPage ? url(page + 1) : null, label: 'Next &raquo;', active: false });

  return {
    current_page: page,
    data: items,
    first_page_url: url(1),
    from: items.length ? (page - 1) * perPage + 1 : null,
    last_page: lastPage,
    last_page_url: url(lastPage),
    links,
    next_page_url: page < lastPage ? url(page + 1) : null,
    path,
    per_page: perPage,
    prev_page_url: page > 1 ? url(page - 1) : null,
    to: items.length ? (page - 1) * perPage + items.length : null,
    total,
  };
}

/** Laravel treats a missing/!=1 `page` query param as page 1. */
export function pageFrom(query: Record<string, any>): number {
  const p = parseInt(query?.page, 10);
  return Number.isFinite(p) && p > 0 ? p : 1;
}
