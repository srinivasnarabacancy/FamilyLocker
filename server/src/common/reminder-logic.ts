/**
 * Direct port of the date arithmetic in App\Models\Reminder and
 * App\Models\Appointment. Kept in one place because the reminder emails and the
 * API both depend on it, and an off-by-one here silently sends mail on the
 * wrong day.
 *
 * All arithmetic is in UTC to match Carbon under `'timezone' => 'UTC'`.
 */

/** Carbon::today() — midnight UTC on the current day. */
export function today(now: Date = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

/** Whole days between two midnight-aligned UTC dates (signed, like diffInDays(..., false)). */
export function diffInDays(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / 86_400_000);
}

/**
 * Port of Reminder::getNextOccurrenceAttribute(). Returns `YYYY-MM-DD`.
 *
 * Note the leap-day behaviour is inherited deliberately: Carbon's `->year(Y)`
 * on 29 Feb rolls over to 1 March in a non-leap year, and `Date.UTC` overflows
 * the same way, so 29-Feb reminders keep firing on 1 March exactly as today.
 */
export function nextOccurrence(
  occasionDate: Date | null,
  recursYearly: boolean,
  now: Date = new Date(),
): string | null {
  if (!occasionDate) return null;

  const t = today(now);
  let next = new Date(occasionDate.getTime());

  if (recursYearly) {
    next = new Date(Date.UTC(t.getUTCFullYear(), next.getUTCMonth(), next.getUTCDate()));

    // This year's occurrence has already passed — roll forward to next year.
    if (next.getTime() < t.getTime()) {
      next = new Date(Date.UTC(t.getUTCFullYear() + 1, next.getUTCMonth(), next.getUTCDate()));
    }
  }

  return next.toISOString().slice(0, 10);
}

/** Port of Reminder::getDaysUntilAttribute(). */
export function daysUntil(
  occasionDate: Date | null,
  recursYearly: boolean,
  now: Date = new Date(),
): number | null {
  const next = nextOccurrence(occasionDate, recursYearly, now);
  if (!next) return null;

  return diffInDays(today(now), new Date(`${next}T00:00:00.000Z`));
}

/** Port of Reminder::shouldNotifyToday(). */
export function reminderShouldNotifyToday(
  r: {
    isActive: boolean;
    occasionDate: Date | null;
    recursYearly: boolean;
    remindDaysBefore: number;
    notificationSentAt: Date | null;
  },
  now: Date = new Date(),
): boolean {
  if (!r.isActive) return false;

  const days = daysUntil(r.occasionDate, r.recursYearly, now);
  if (days === null || days < 0 || days > r.remindDaysBefore) return false;

  if (r.notificationSentAt === null) return true;

  // Yearly reminders may notify again once the occurrence year advances.
  if (r.recursYearly) {
    const next = nextOccurrence(r.occasionDate, r.recursYearly, now)!;
    return r.notificationSentAt.getUTCFullYear() < Number(next.slice(0, 4));
  }

  // One-time reminders never notify twice.
  return false;
}

/** Port of Appointment::shouldNotifyToday(). */
export function appointmentShouldNotifyToday(
  a: {
    status: string;
    date: Date;
    remindDaysBefore: number;
    notificationSentAt: Date | null;
  },
  now: Date = new Date(),
): boolean {
  if (a.status === 'cancelled') return false;

  const t = today(now);
  const days = diffInDays(t, a.date);
  if (days < 0 || days > a.remindDaysBefore) return false;

  // Already notified today.
  if (a.notificationSentAt && a.notificationSentAt.getTime() === t.getTime()) return false;

  return true;
}
