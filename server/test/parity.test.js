/**
 * Serialization parity tests.
 *
 * Every expected value here was captured from the running Laravel app (via
 * `php artisan tinker` against the real models), not written from memory. These
 * are the assertions that catch the silent-breakage class of migration bug:
 * dates that look right but aren't, decimals that turn into numbers, computed
 * attributes that go missing.
 *
 *   npm run build && node --test test/
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { dateTime, dateCast, decimal2, timeString, int, paginate } = require('../dist/common/laravel');
const { presentBill, presentReminder, presentUser } = require('../dist/common/presenters');
const {
  nextOccurrence, daysUntil, reminderShouldNotifyToday, appointmentShouldNotifyToday,
} = require('../dist/common/reminder-logic');
const { Validator } = require('../dist/common/validator');

const d = (s) => new Date(s);

test('datetime uses Carbon toJSON format with six fractional digits', () => {
  // Laravel: "2026-03-14T09:15:30.000000Z"
  assert.equal(dateTime(d('2026-03-14T09:15:30Z')), '2026-03-14T09:15:30.000000Z');
  assert.equal(dateTime(null), null);
});

test("a 'date' cast still serializes as a full midnight timestamp", () => {
  // The classic trap: Eloquent's date cast is a Carbon instance, so it is NOT "1990-12-25".
  assert.equal(dateCast(d('1990-12-25T00:00:00Z')), '1990-12-25T00:00:00.000000Z');
});

test("'decimal:2' renders as a string, not a number", () => {
  assert.equal(decimal2('1250.5'), '1250.50');
  assert.equal(decimal2(0), '0.00');
  assert.strictEqual(typeof decimal2(10), 'string');
});

test('time columns return the raw HH:MM:SS string', () => {
  assert.equal(timeString(d('1970-01-01T14:30:00Z')), '14:30:00');
  assert.equal(timeString(null), null);
});

test('bigint ids serialize as JSON numbers', () => {
  assert.strictEqual(int(42n), 42);
  assert.strictEqual(int(null), null);
});

test('presentBill matches the captured Laravel payload', () => {
  const out = presentBill({
    id: 1n, familyId: 2n, userId: 3n, name: 'Power', category: 'electricity',
    amount: '1250.5', dueDate: d('2026-03-14T00:00:00Z'), paidDate: null,
    status: 'pending', isRecurring: true, recurringPeriod: null, provider: null,
    notes: null, receiptPath: null,
    createdAt: d('2026-03-14T09:15:30Z'), updatedAt: null,
  });

  assert.equal(out.amount, '1250.50');
  assert.equal(out.due_date, '2026-03-14T00:00:00.000000Z');
  assert.equal(out.created_at, '2026-03-14T09:15:30.000000Z');
  assert.equal(out.is_recurring, true);
  assert.equal(out.id, 1);
});

test('presentReminder appends next_occurrence and an INTEGER days_until', () => {
  // Captured from Laravel on 2026-09-12: next_occurrence "2026-12-25", days_until 104.
  const now = d('2026-09-12T00:00:00Z');
  const out = presentReminder({
    id: 1n, familyId: 1n, createdBy: 1n, title: 'Bday', type: 'birthday',
    occasionDate: d('1990-12-25T00:00:00Z'), recursYearly: true, remindDaysBefore: 7,
    description: null, isActive: true, notificationSentAt: null,
    createdAt: null, updatedAt: null,
  }, now);

  assert.equal(out.occasion_date, '1990-12-25T00:00:00.000000Z');
  assert.equal(out.next_occurrence, '2026-12-25');
  assert.strictEqual(out.days_until, 104);
  // RemindersPage.vue compares with ===, so the type matters as much as the value.
  assert.strictEqual(typeof out.days_until, 'number');
});

test('presentUser never leaks credentials or the live OTP', () => {
  const out = presentUser({
    id: 1n, familyId: 1n, role: 'owner', avatar: null, phone: null,
    dateOfBirth: null, relation: null, name: 'A', email: 'a@b.c',
    emailVerifiedAt: null, otpCode: '123456', otpExpiresAt: d('2026-09-12T00:10:00Z'),
    password: '$2y$12$hash', rememberToken: 'tok', createdAt: null, updatedAt: null,
  });

  assert.equal(out.password, undefined);
  assert.equal(out.remember_token, undefined);
  // Deliberate hardening beyond Laravel, which exposed both of these.
  assert.equal(out.otp_code, undefined);
  assert.equal(out.otp_expires_at, undefined);
});

test('a yearly occurrence already past rolls into next year', () => {
  const now = d('2026-09-12T00:00:00Z');
  assert.equal(nextOccurrence(d('1990-03-01T00:00:00Z'), true, now), '2027-03-01');
  assert.equal(daysUntil(d('2026-09-12T00:00:00Z'), true, now), 0);
  assert.equal(daysUntil(d('2026-09-13T00:00:00Z'), true, now), 1);
});

test('a non-recurring reminder in the past reports negative days', () => {
  const now = d('2026-09-12T00:00:00Z');
  assert.equal(nextOccurrence(d('2026-09-01T00:00:00Z'), false, now), '2026-09-01');
  assert.equal(daysUntil(d('2026-09-01T00:00:00Z'), false, now), -11);
});

test('reminderShouldNotifyToday honours the window and the sent marker', () => {
  const now = d('2026-09-12T00:00:00Z');
  const base = {
    isActive: true, occasionDate: d('2026-09-15T00:00:00Z'),
    recursYearly: true, remindDaysBefore: 7, notificationSentAt: null,
  };

  assert.equal(reminderShouldNotifyToday(base, now), true);
  assert.equal(reminderShouldNotifyToday({ ...base, isActive: false }, now), false);
  // Three days out is outside a two-day window.
  assert.equal(reminderShouldNotifyToday({ ...base, remindDaysBefore: 2 }, now), false);
  // Already notified for this year's occurrence.
  assert.equal(
    reminderShouldNotifyToday({ ...base, notificationSentAt: d('2026-09-11T00:00:00Z') }, now),
    false,
  );
  // Last sent for the previous cycle, so this year fires again.
  assert.equal(
    reminderShouldNotifyToday({ ...base, notificationSentAt: d('2025-09-11T00:00:00Z') }, now),
    true,
  );
  // One-time reminders never repeat.
  assert.equal(
    reminderShouldNotifyToday(
      { ...base, recursYearly: false, notificationSentAt: d('2025-09-11T00:00:00Z') },
      now,
    ),
    false,
  );
});

test('appointmentShouldNotifyToday skips cancelled and same-day repeats', () => {
  const now = d('2026-09-12T00:00:00Z');
  const base = {
    status: 'scheduled', date: d('2026-09-13T00:00:00Z'),
    remindDaysBefore: 1, notificationSentAt: null,
  };

  assert.equal(appointmentShouldNotifyToday(base, now), true);
  assert.equal(appointmentShouldNotifyToday({ ...base, status: 'cancelled' }, now), false);
  assert.equal(appointmentShouldNotifyToday({ ...base, date: d('2026-09-20T00:00:00Z') }, now), false);
  assert.equal(
    appointmentShouldNotifyToday({ ...base, notificationSentAt: d('2026-09-12T00:00:00Z') }, now),
    false,
  );
});

test('paginator reproduces LengthAwarePaginator::toArray()', () => {
  const p = paginate([{ id: 1 }, { id: 2 }], 25, 2, 2, 'http://x/api/documents');

  assert.equal(p.current_page, 2);
  assert.equal(p.last_page, 13);
  assert.equal(p.per_page, 2);
  assert.equal(p.total, 25);
  assert.equal(p.from, 3);
  assert.equal(p.to, 4);
  assert.equal(p.prev_page_url, 'http://x/api/documents?page=1');
  assert.equal(p.next_page_url, 'http://x/api/documents?page=3');
  assert.equal(p.links[0].label, '&laquo; Previous');
  assert.equal(p.links.at(-1).label, 'Next &raquo;');
  // The frontend reads `.data.data`, so the key must be exactly `data`.
  assert.deepEqual(p.data, [{ id: 1 }, { id: 2 }]);
});

test('validator reproduces Laravel messages and rule semantics', async () => {
  const run = async (data, rules) => {
    try {
      await new Validator(data, rules).validate();
      return null;
    } catch (e) {
      return e.getResponse().errors;
    }
  };

  assert.deepEqual(await run({}, { email: 'required|email' }), {
    email: ['The email field is required.'],
  });

  assert.deepEqual(await run({ family_name: '' }, { family_name: 'required|string' }), {
    family_name: ['The family name field is required.'],
  });

  // `sometimes` skips an absent key entirely.
  assert.equal(await run({}, { title: 'sometimes|string|max:5' }), null);

  // `nullable` skips an explicit null.
  assert.equal(await run({ notes: null }, { notes: 'nullable|string' }), null);

  assert.deepEqual(await run({ type: 'bogus' }, { type: 'in:a,b' }), {
    type: ['The selected type is invalid.'],
  });

  assert.deepEqual(
    await run({ password: 'abcdefgh', password_confirmation: 'x' }, { password: 'confirmed' }),
    { password: ['The password field confirmation does not match.'] },
  );

  // required_without: neither supplied.
  assert.deepEqual(
    await run({}, { email: 'nullable|required_without:phone|email' }),
    { email: ['The email field is required when phone is not present.'] },
  );
  // required_without satisfied by the sibling.
  assert.equal(await run({ phone: '123' }, { email: 'nullable|required_without:phone|email' }), null);

  // after_or_equal compares against another field.
  assert.deepEqual(
    await run({ start_date: '2026-05-01', end_date: '2026-04-01' }, { end_date: 'date|after_or_equal:start_date' }),
    { end_date: ['The end date field must be a date after or equal to start date.'] },
  );
});
