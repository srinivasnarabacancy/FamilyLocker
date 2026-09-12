/**
 * One presenter per Eloquent model. Each encodes that model's `$casts`,
 * `$hidden` and `$appends` explicitly, so the JSON matches the Laravel API.
 *
 * Presenters are deliberately hand-written rather than reflected from the
 * Prisma schema: the cast list is the contract with the frontend, and making it
 * visible is what lets it be reviewed and diffed.
 */

import { dateTime, dateCast, timeString, decimal2, int } from './laravel';
import { nextOccurrence, daysUntil } from './reminder-logic';

type Row = Record<string, any>;

/** Applies a presenter to a value that may be null or an array. */
function maybe<T>(value: any, fn: (v: any) => T): T | null {
  return value === null || value === undefined ? null : fn(value);
}

/**
 * SECURITY DEVIATION FROM LARAVEL — intentional.
 *
 * The Eloquent model hides only `password` and `remember_token`, so the live
 * API leaks `otp_code` / `otp_expires_at` on `GET /auth/me` and, worse, on
 * `GET /family/members` — where any member can read another member's live
 * e-mail-verification code. They are dropped here. No frontend code reads them
 * (verified against resources/js), so this is invisible to the client.
 */
export function presentUser(u: Row | null): Row | null {
  if (!u) return null;

  const out: Row = {
    id: int(u.id),
    family_id: int(u.familyId),
    role: u.role,
    avatar: u.avatar ?? null,
    phone: u.phone ?? null,
    date_of_birth: dateCast(u.dateOfBirth),
    relation: u.relation ?? null,
    name: u.name,
    email: u.email ?? null,
    email_verified_at: dateTime(u.emailVerifiedAt),
    created_at: dateTime(u.createdAt),
    updated_at: dateTime(u.updatedAt),
  };

  if (u.family !== undefined) out.family = maybe(u.family, presentFamily);

  return out;
}

export function presentFamily(f: Row | null): Row | null {
  if (!f) return null;

  const out: Row = {
    id: int(f.id),
    name: f.name,
    description: f.description ?? null,
    avatar: f.avatar ?? null,
    created_by: int(f.createdBy),
    created_at: dateTime(f.createdAt),
    updated_at: dateTime(f.updatedAt),
  };

  if (f.members !== undefined) out.members = (f.members ?? []).map(presentUser);
  if (f.creator !== undefined) out.creator = maybe(f.creator, presentUser);

  return out;
}

export function presentDocument(d: Row | null): Row | null {
  if (!d) return null;

  const out: Row = {
    id: int(d.id),
    family_id: int(d.familyId),
    uploaded_by: int(d.uploadedBy),
    title: d.title,
    type: d.type,
    document_number: d.documentNumber ?? null,
    member_name: d.memberName,
    issue_date: dateCast(d.issueDate),
    expiry_date: dateCast(d.expiryDate),
    file_path: d.filePath ?? null,
    file_name: d.fileName ?? null,
    notes: d.notes ?? null,
    is_reminder_enabled: d.isReminderEnabled,
    reminder_days_before: d.reminderDaysBefore,
    created_at: dateTime(d.createdAt),
    updated_at: dateTime(d.updatedAt),
  };

  if (d.uploader !== undefined) out.uploader = maybe(d.uploader, presentUser);

  return out;
}

export function presentExpenseCategory(c: Row | null): Row | null {
  if (!c) return null;

  return {
    id: int(c.id),
    family_id: int(c.familyId),
    name: c.name,
    icon: c.icon ?? null,
    color: c.color ?? null,
    created_at: dateTime(c.createdAt),
    updated_at: dateTime(c.updatedAt),
  };
}

export function presentExpense(e: Row | null): Row | null {
  if (!e) return null;

  const out: Row = {
    id: int(e.id),
    family_id: int(e.familyId),
    user_id: int(e.userId),
    category_id: int(e.categoryId),
    title: e.title,
    // 'decimal:2' renders as a string in Eloquent.
    amount: decimal2(e.amount),
    date: dateCast(e.date),
    description: e.description ?? null,
    payment_method: e.paymentMethod,
    receipt_path: e.receiptPath ?? null,
    created_at: dateTime(e.createdAt),
    updated_at: dateTime(e.updatedAt),
  };

  if (e.user !== undefined) out.user = maybe(e.user, presentUser);
  if (e.category !== undefined) out.category = maybe(e.category, presentExpenseCategory);

  return out;
}

export function presentMedicalRecord(r: Row | null): Row | null {
  if (!r) return null;

  const out: Row = {
    id: int(r.id),
    family_id: int(r.familyId),
    user_id: int(r.userId),
    member_name: r.memberName,
    type: r.type,
    title: r.title,
    doctor_name: r.doctorName ?? null,
    hospital_name: r.hospitalName ?? null,
    date: dateCast(r.date),
    diagnosis: r.diagnosis ?? null,
    notes: r.notes ?? null,
    file_path: r.filePath ?? null,
    file_name: r.fileName ?? null,
    created_at: dateTime(r.createdAt),
    updated_at: dateTime(r.updatedAt),
  };

  if (r.user !== undefined) out.user = maybe(r.user, presentUser);
  if (r.medicines !== undefined) out.medicines = (r.medicines ?? []).map(presentMedicine);

  return out;
}

export function presentMedicine(m: Row | null): Row | null {
  if (!m) return null;

  return {
    id: int(m.id),
    medical_record_id: int(m.medicalRecordId),
    family_id: int(m.familyId),
    member_name: m.memberName,
    name: m.name,
    dosage: m.dosage ?? null,
    frequency: m.frequency ?? null,
    start_date: dateCast(m.startDate),
    end_date: dateCast(m.endDate),
    is_active: m.isActive,
    notes: m.notes ?? null,
    image_path: m.imagePath ?? null,
    notify_on_completion: m.notifyOnCompletion,
    created_at: dateTime(m.createdAt),
    updated_at: dateTime(m.updatedAt),
  };
}

export function presentAppointment(a: Row | null): Row | null {
  if (!a) return null;

  const out: Row = {
    id: int(a.id),
    family_id: int(a.familyId),
    user_id: int(a.userId),
    member_name: a.memberName,
    doctor_name: a.doctorName,
    specialty: a.specialty ?? null,
    date: dateCast(a.date),
    // `time` has no Eloquent cast, so Laravel returns the raw "HH:MM:SS" string.
    time: timeString(a.time),
    location: a.location ?? null,
    notes: a.notes ?? null,
    status: a.status,
    remind_days_before: a.remindDaysBefore,
    notification_sent_at: dateCast(a.notificationSentAt),
    created_at: dateTime(a.createdAt),
    updated_at: dateTime(a.updatedAt),
  };

  if (a.user !== undefined) out.user = maybe(a.user, presentUser);

  return out;
}

export function presentPhoto(p: Row | null): Row | null {
  if (!p) return null;

  return {
    id: int(p.id),
    album_id: int(p.albumId),
    user_id: int(p.userId),
    title: p.title ?? null,
    file_path: p.filePath,
    file_name: p.fileName,
    // Stored in a varchar column, so Laravel echoes it back as a string.
    file_size: p.fileSize ?? null,
    caption: p.caption ?? null,
    taken_at: dateCast(p.takenAt),
    created_at: dateTime(p.createdAt),
    updated_at: dateTime(p.updatedAt),
  };
}

export function presentAlbum(a: Row | null): Row | null {
  if (!a) return null;

  const out: Row = {
    id: int(a.id),
    family_id: int(a.familyId),
    user_id: int(a.userId),
    name: a.name,
    description: a.description ?? null,
    cover_photo: a.coverPhoto ?? null,
    created_at: dateTime(a.createdAt),
    updated_at: dateTime(a.updatedAt),
  };

  if (a.user !== undefined) out.user = maybe(a.user, presentUser);
  if (a.photos !== undefined) out.photos = (a.photos ?? []).map(presentPhoto);
  // withCount('photos') surfaces as `photos_count` in Eloquent.
  if (a._count?.photos !== undefined) out.photos_count = a._count.photos;

  return out;
}

export function presentBill(b: Row | null): Row | null {
  if (!b) return null;

  const out: Row = {
    id: int(b.id),
    family_id: int(b.familyId),
    user_id: int(b.userId),
    name: b.name,
    category: b.category,
    amount: decimal2(b.amount),
    due_date: dateCast(b.dueDate),
    paid_date: dateCast(b.paidDate),
    status: b.status,
    is_recurring: b.isRecurring,
    recurring_period: b.recurringPeriod ?? null,
    provider: b.provider ?? null,
    notes: b.notes ?? null,
    receipt_path: b.receiptPath ?? null,
    created_at: dateTime(b.createdAt),
    updated_at: dateTime(b.updatedAt),
  };

  if (b.user !== undefined) out.user = maybe(b.user, presentUser);

  return out;
}

export function presentTask(t: Row | null): Row | null {
  if (!t) return null;

  const out: Row = {
    id: int(t.id),
    family_id: int(t.familyId),
    created_by: int(t.createdBy),
    assigned_to: int(t.assignedTo),
    title: t.title,
    description: t.description ?? null,
    due_date: dateCast(t.dueDate),
    priority: t.priority,
    status: t.status,
    category: t.category ?? null,
    completed_at: dateTime(t.completedAt),
    created_at: dateTime(t.createdAt),
    updated_at: dateTime(t.updatedAt),
  };

  if (t.creator !== undefined) out.creator = maybe(t.creator, presentUser);
  if (t.assignee !== undefined) out.assignee = maybe(t.assignee, presentUser);

  return out;
}

export function presentActivityLog(l: Row | null): Row | null {
  if (!l) return null;

  const out: Row = {
    id: int(l.id),
    user_id: int(l.userId),
    family_id: int(l.familyId),
    module: l.module,
    action: l.action,
    description: l.description,
    meta: l.meta ?? null,
    created_at: dateTime(l.createdAt),
    updated_at: dateTime(l.updatedAt),
  };

  if (l.user !== undefined) out.user = maybe(l.user, presentUser);

  return out;
}

/**
 * Reminder carries `$appends = ['next_occurrence', 'days_until']`, so both
 * computed attributes must be present on every serialized reminder.
 * `days_until` must stay an integer — RemindersPage.vue compares it with `===`.
 */
export function presentReminder(r: Row | null, now: Date = new Date()): Row | null {
  if (!r) return null;

  const out: Row = {
    id: int(r.id),
    family_id: int(r.familyId),
    created_by: int(r.createdBy),
    title: r.title,
    type: r.type,
    occasion_date: dateCast(r.occasionDate),
    recurs_yearly: r.recursYearly,
    remind_days_before: r.remindDaysBefore,
    description: r.description ?? null,
    is_active: r.isActive,
    notification_sent_at: dateCast(r.notificationSentAt),
    created_at: dateTime(r.createdAt),
    updated_at: dateTime(r.updatedAt),
    next_occurrence: nextOccurrence(r.occasionDate, r.recursYearly, now),
    days_until: daysUntil(r.occasionDate, r.recursYearly, now),
  };

  if (r.creator !== undefined) out.creator = maybe(r.creator, presentUser);

  return out;
}
