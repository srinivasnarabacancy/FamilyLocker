/**
 * Helpers for translating request payloads into Prisma data objects.
 *
 * The important semantic to preserve is `$request->only([...])`: Laravel copies
 * ONLY the keys actually present in the request, so `$model->update($data)`
 * leaves unmentioned columns untouched. A naive `{ title: body.title }` would
 * instead write `undefined`/null over existing values on a partial update.
 *
 * Multipart bodies deliver every field as a string, so casts are explicit.
 */

export type Cast = 'string' | 'date' | 'time' | 'bool' | 'int' | 'decimal';

/** Parses `YYYY-MM-DD` (or a full ISO string) into a UTC-midnight Date. */
export function toDate(value: any): Date | null {
  if (value === null || value === undefined || value === '') return null;
  if (value instanceof Date) return value;

  const s = String(value);
  const d = new Date(s.length <= 10 ? `${s}T00:00:00Z` : s);
  return Number.isNaN(d.getTime()) ? null : d;
}

/** Parses `HH:MM` or `HH:MM:SS` into the epoch-day Date a `time` column needs. */
export function toTime(value: any): Date | null {
  if (value === null || value === undefined || value === '') return null;

  const parts = String(value).split(':').map(Number);
  if (parts.some(Number.isNaN)) return null;

  const [h, m, s = 0] = parts;
  return new Date(Date.UTC(1970, 0, 1, h, m, s));
}

/** Laravel's `$request->boolean()` truthiness. */
export function toBool(value: any): boolean {
  return value === true || value === 1 || value === '1' || value === 'true' || value === 'on';
}

export function toInt(value: any): number | null {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

export function toBigInt(value: any): bigint | null {
  const n = toInt(value);
  return n === null ? null : BigInt(n);
}

function apply(cast: Cast, value: any): any {
  switch (cast) {
    case 'date':
      return toDate(value);
    case 'time':
      return toTime(value);
    case 'bool':
      return toBool(value);
    case 'int':
      return toInt(value);
    case 'decimal':
      return value === '' || value === null || value === undefined ? null : String(value);
    default:
      return value;
  }
}

/**
 * `$request->only([...])` plus casting and snake_case → camelCase mapping.
 *
 * `spec` maps the REQUEST key to `[prismaField, cast]`. Keys absent from the
 * body are omitted from the result entirely.
 */
export function pick(
  body: Record<string, any>,
  spec: Record<string, [string, Cast?]>,
): Record<string, any> {
  const out: Record<string, any> = {};

  for (const [requestKey, [field, cast = 'string']] of Object.entries(spec)) {
    if (!(requestKey in body) || body[requestKey] === undefined) continue;
    out[field] = apply(cast, body[requestKey]);
  }

  return out;
}

/**
 * Laravel's `where('col', 'like', "%value%")`. Postgres `LIKE` is
 * case-SENSITIVE, and Prisma's `contains` without `mode` matches that, so the
 * search behaviour is identical (including its shortcomings).
 */
export function like(value: string) {
  return { contains: value };
}

/** True when a query-string filter was supplied and non-empty, as `$request->x` tests. */
export function filled(value: any): boolean {
  return value !== undefined && value !== null && value !== '';
}
