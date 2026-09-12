/**
 * Ports of resources/views/emails/*.blade.php.
 *
 * The markup is copied verbatim so rendered mail is visually identical; only
 * the interpolation syntax changes. Blade's `{{ }}` escapes HTML, so every
 * interpolated value goes through `e()` — dropping that would turn a family
 * name containing an apostrophe into broken markup, or worse.
 */

const BRAND = '#6c5ce7';

/** Blade's `{{ }}` escaping (htmlspecialchars with ENT_QUOTES). */
export function e(value: unknown): string {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

/** Carbon's `format('F j, Y')` → "March 14, 2026". */
export function longDate(value: Date | string | null): string | null {
  if (!value) return null;
  const d = typeof value === 'string' ? new Date(`${value.slice(0, 10)}T00:00:00Z`) : value;
  if (Number.isNaN(d.getTime())) return null;
  return `${MONTHS[d.getUTCMonth()]} ${d.getUTCDate()}, ${d.getUTCFullYear()}`;
}

/** Carbon's `format('g:i A')` → "2:30 PM". */
export function shortTime(hms: string | null): string | null {
  if (!hms) return null;
  const [h, m] = hms.split(':').map(Number);
  const suffix = h >= 12 ? 'PM' : 'AM';
  const hour = h % 12 === 0 ? 12 : h % 12;
  return `${hour}:${String(m).padStart(2, '0')} ${suffix}`;
}

function ucfirst(s: string): string {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : s;
}

function layout(title: string, inner: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>${e(title)}</title>
</head>
<body style="margin:0;padding:24px;background-color:#f4f6fb;font-family:Arial,sans-serif;color:#1f2937;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 12px 30px rgba(15,23,42,0.08);">
        <p style="margin:0 0 12px;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:${BRAND};">FamilyLocker</p>
${inner}
    </div>
</body>
</html>`;
}

function cta(href: string, label: string): string {
  return `        <p style="margin:24px 0 0;">
            <a href="${e(href)}" style="display:inline-block;padding:12px 24px;border-radius:999px;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;">${e(label)}</a>
        </p>`;
}

function footer(familyName: string, extra = ''): string {
  return `        <hr style="margin:28px 0;border:none;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:13px;line-height:1.6;color:#9ca3af;">
            You received this email because you are a member of the <strong>${e(familyName)}</strong> family on FamilyLocker.${extra}
        </p>`;
}

const TYPE_COLORS: Record<string, { bg: string; border: string; badge: string; badgeBg: string }> = {
  birthday: { bg: '#fff0f6', border: '#f9a8d4', badge: '#be185d', badgeBg: '#fce7f3' },
  anniversary: { bg: '#f5f3ff', border: '#c4b5fd', badge: '#6d28d9', badgeBg: '#ede9fe' },
  holiday: { bg: '#fffbeb', border: '#fcd34d', badge: '#b45309', badgeBg: '#fef3c7' },
  other: { bg: '#ecfeff', border: '#67e8f9', badge: '#0e7490', badgeBg: '#cffafe' },
};

const STATUS_COLORS: Record<string, { bg: string; border: string; badge: string; badgeBg: string }> = {
  scheduled: { bg: '#eff6ff', border: '#93c5fd', badge: '#1d4ed8', badgeBg: '#dbeafe' },
  completed: { bg: '#f0fdf4', border: '#86efac', badge: '#15803d', badgeBg: '#dcfce7' },
  cancelled: { bg: '#fff1f2', border: '#fca5a5', badge: '#b91c1c', badgeBg: '#fee2e2' },
};

function countdown(days: number | null): { text: string; color: string } | null {
  if (days === null) return null;
  if (days === 0) return { text: 'TODAY', color: '#16a34a' };
  if (days === 1) return { text: 'TOMORROW', color: '#d97706' };
  return { text: `IN ${days} DAYS`, color: BRAND };
}

function badgeRow(
  label: string,
  colors: { badge: string; badgeBg: string },
  right: string,
  marginBottom = '8px',
): string {
  return `                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:${marginBottom};">
                    <span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;background:${colors.badgeBg};color:${colors.badge};">
                        ${e(label)}
                    </span>
                    ${right}
                </div>`;
}

function countdownSpan(c: { text: string; color: string } | null): string {
  if (!c) return '';
  return `<span style="font-size:13px;font-weight:800;letter-spacing:0.08em;color:${c.color};">
                        ${c.text}
                    </span>`;
}

// ─── otp.blade.php ──────────────────────────────────────────────────────────

export function otpEmail(userName: string, otp: string): string {
  return `<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Your FamilyLocker Verification Code</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f4f6fb; margin: 0; padding: 0; }
        .container { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 16px; padding: 40px; box-shadow: 0 2px 16px rgba(108,92,231,.10); }
        .logo { font-size: 2rem; text-align: center; margin-bottom: 8px; }
        h2 { text-align: center; color: ${BRAND}; margin: 0 0 6px; }
        p { color: #5f6780; font-size: 0.97rem; line-height: 1.6; text-align: center; }
        .otp-box { background: #f0edff; border: 2px dashed ${BRAND}; border-radius: 14px; text-align: center; padding: 22px 0; margin: 28px 0; }
        .otp-code { font-size: 2.6rem; font-weight: 700; letter-spacing: 12px; color: ${BRAND}; }
        .expiry { font-size: 0.85rem; color: #999; margin-top: 6px; }
        .footer { font-size: 0.8rem; color: #bbb; text-align: center; margin-top: 28px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">&#127968;</div>
        <h2>FamilyLocker</h2>
        <p>Hi <strong>${e(userName)}</strong>, use the code below to verify your email address.</p>

        <div class="otp-box">
            <div class="otp-code">${e(otp)}</div>
            <div class="expiry">This code expires in 10 minutes.</div>
        </div>

        <p>Enter this 6-digit code on the verification screen. Do not share this code with anyone.</p>

        <div class="footer">If you did not create a FamilyLocker account, you can safely ignore this email.</div>
    </div>
</body>
</html>`;
}

// ─── family-invitation.blade.php ────────────────────────────────────────────

export function familyInvitationEmail(p: {
  memberName: string;
  memberEmail: string;
  memberPhone: string | null;
  memberRelation: string | null;
  roleLabel: string;
  familyName: string;
  inviterName: string;
  temporaryPassword: string;
  loginUrl: string;
}): string {
  const phone = p.memberPhone
    ? `        <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#6b7280;">
                Mobile: ${e(p.memberPhone)}
            </p>\n`
    : '';
  const relation = p.memberRelation
    ? `        <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#6b7280;">
                Relation: ${e(p.memberRelation)}
            </p>\n`
    : '';

  return layout(
    'FamilyLocker Invitation',
    `        <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;">You're invited to join ${e(p.familyName)}</h1>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
            Hi ${e(p.memberName)}, ${e(p.inviterName)} has added you to the <strong>${e(p.familyName)}</strong> family group on FamilyLocker.
        </p>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">
            Your account is ready. Use these temporary credentials to sign in and update your password after your first login.
        </p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4b5563;">
            For security, you will also need to verify this email address before FamilyLocker lets you into the app.
        </p>

        <div style="margin:0 0 24px;padding:20px;border-radius:12px;background:#f8f7ff;border:1px solid #e4defc;">
            <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">Email</p>
            <p style="margin:0 0 16px;font-size:16px;font-weight:700;">${e(p.memberEmail)}</p>
            <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">Temporary Password</p>
            <p style="margin:0;font-size:16px;font-weight:700;letter-spacing:0.04em;">${e(p.temporaryPassword)}</p>
        </div>

        <p style="margin:0 0 24px;">
            <a href="${e(p.loginUrl)}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:${BRAND};color:#ffffff;text-decoration:none;font-weight:700;">Open FamilyLocker</a>
        </p>

        <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#6b7280;">
            Role: ${e(p.roleLabel)}
        </p>
${phone}${relation}        <p style="margin:0;font-size:13px;line-height:1.6;color:#9ca3af;">
            If you were not expecting this invitation, you can ignore this email.
        </p>`,
  );
}

// ─── reminder-notification.blade.php ────────────────────────────────────────

export interface ReminderView {
  title: string;
  type: string;
  description: string | null;
  recursYearly: boolean;
  remindDaysBefore: number;
  nextOccurrence: string | null;
  daysUntil: number | null;
}

function reminderCard(r: ReminderView, marginBottom: string): string {
  const colors = TYPE_COLORS[r.type] ?? TYPE_COLORS.other;
  const c = countdown(r.daysUntil);
  const description = r.description
    ? `\n                <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">${e(r.description)}</p>`
    : '';

  return `            <div style="margin-bottom:${marginBottom};padding:20px;border-radius:12px;background:${colors.bg};border:1px solid ${colors.border};">
${badgeRow(ucfirst(r.type), colors, countdownSpan(c))}

                <h2 style="margin:0 0 4px;font-size:18px;line-height:1.3;color:#111827;">${e(r.title)}</h2>
                <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">${e(longDate(r.nextOccurrence))}</p>${description}
            </div>`;
}

export function reminderNotificationEmail(p: {
  recipientName: string;
  familyName: string;
  reminders: ReminderView[];
  appUrl: string;
}): string {
  const heading =
    p.reminders.length === 1
      ? `Reminder: ${e(p.reminders[0].title)}`
      : `You have ${p.reminders.length} upcoming reminders`;

  return layout(
    'FamilyLocker Reminders',
    `        <h1 style="margin:0 0 8px;font-size:26px;line-height:1.2;">
            ${heading}
        </h1>
        <p style="margin:0 0 24px;font-size:16px;color:#6b7280;">
            Hi ${e(p.recipientName)}, here's what's coming up for <strong>${e(p.familyName)}</strong>.
        </p>

${p.reminders.map((r) => reminderCard(r, '16px')).join('\n')}

${cta(`${p.appUrl}/app/reminders`, 'View All Reminders')}

${footer(p.familyName, `
            To stop receiving reminder emails, deactivate the individual reminder inside the app.`)}`,
  );
}

// ─── reminder-created.blade.php ─────────────────────────────────────────────

export function reminderCreatedEmail(p: {
  recipientName: string;
  isSelf: boolean;
  creatorName: string;
  familyName: string;
  reminder: ReminderView;
  appUrl: string;
}): string {
  const r = p.reminder;
  const colors = TYPE_COLORS[r.type] ?? TYPE_COLORS.other;
  const c = countdown(r.daysUntil);

  const attribution = p.isSelf
    ? `you just added a new reminder to <strong>${e(p.familyName)}</strong>.`
    : `<strong>${e(p.creatorName)}</strong> added a new reminder to <strong>${e(p.familyName)}</strong>.`;

  const recurrence = r.recursYearly
    ? `Recurs every year &nbsp;·&nbsp; Notify ${r.remindDaysBefore} day(s) before`
    : `One-time reminder &nbsp;·&nbsp; Notify ${r.remindDaysBefore} day(s) before`;

  const description = r.description
    ? `\n            <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">${e(r.description)}</p>`
    : '';

  return layout(
    'New Reminder Added',
    `        <h1 style="margin:0 0 8px;font-size:26px;line-height:1.2;">New Reminder Added</h1>
        <p style="margin:0 0 24px;font-size:16px;color:#6b7280;">
            Hi ${e(p.recipientName)},
            ${attribution}
        </p>

        <div style="margin-bottom:24px;padding:20px;border-radius:12px;background:${colors.bg};border:1px solid ${colors.border};">
${badgeRow(ucfirst(r.type), colors, countdownSpan(c))}

            <h2 style="margin:0 0 4px;font-size:18px;line-height:1.3;color:#111827;">${e(r.title)}</h2>
            <p style="margin:0 0 4px;font-size:14px;color:#6b7280;">${e(longDate(r.nextOccurrence))}</p>
            <p style="margin:0 0 8px;font-size:12px;color:#9ca3af;">${recurrence}</p>${description}
        </div>

${cta(`${p.appUrl}/app/reminders`, 'View All Reminders')}

${footer(p.familyName)}`,
  );
}

// ─── appointment-reminder.blade.php ─────────────────────────────────────────

export interface AppointmentView {
  doctorName: string;
  memberName: string;
  specialty: string | null;
  location: string | null;
  notes: string | null;
  status: string;
  date: Date;
  time: string | null;
  daysUntil: number;
}

export function appointmentReminderEmail(p: {
  recipientName: string;
  familyName: string;
  appointments: AppointmentView[];
  appUrl: string;
}): string {
  const heading =
    p.appointments.length === 1
      ? 'Appointment Reminder'
      : `${p.appointments.length} Upcoming Appointments`;

  const cards = p.appointments
    .map((a) => {
      const colors = STATUS_COLORS[a.status] ?? STATUS_COLORS.scheduled;
      const c = countdown(a.daysUntil)!;
      const timeStr = shortTime(a.time);

      const specialty = a.specialty
        ? `\n                <p style="margin:0 0 6px;font-size:14px;color:#6b7280;">${e(a.specialty)}</p>`
        : '';
      const location = a.location
        ? `\n                <p style="margin:0 0 4px;font-size:14px;color:#374151;">&#128205; ${e(a.location)}</p>`
        : '';
      const notes = a.notes
        ? `\n                <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#6b7280;">${e(a.notes)}</p>`
        : '';

      return `            <div style="margin-bottom:16px;padding:20px;border-radius:12px;background:${colors.bg};border:1px solid ${colors.border};">
${badgeRow(ucfirst(a.status), colors, countdownSpan(c), '10px')}

                <h2 style="margin:0 0 2px;font-size:18px;line-height:1.3;color:#111827;">Dr. ${e(a.doctorName)}</h2>${specialty}

                <p style="margin:0 0 4px;font-size:14px;color:#374151;">
                    &#128197; ${e(longDate(a.date))}${timeStr ? ` at ${e(timeStr)}` : ''}
                </p>
                <p style="margin:0 0 4px;font-size:14px;color:#374151;">
                    &#128100; ${e(a.memberName)}
                </p>${location}${notes}
            </div>`;
    })
    .join('\n');

  return layout(
    'Appointment Reminder',
    `        <h1 style="margin:0 0 8px;font-size:26px;line-height:1.2;">
            ${heading}
        </h1>
        <p style="margin:0 0 24px;font-size:16px;color:#6b7280;">
            Hi ${e(p.recipientName)}, here are the upcoming appointments for <strong>${e(p.familyName)}</strong>.
        </p>

${cards}

${cta(`${p.appUrl}/app/medical`, 'View Appointments')}

${footer(p.familyName)}`,
  );
}

// ─── medicine-completion.blade.php ──────────────────────────────────────────

export interface MedicineView {
  name: string;
  memberName: string;
  dosage: string | null;
  frequency: string | null;
  notes: string | null;
  startDate: Date | null;
  endDate: Date | null;
}

export function medicineCompletionEmail(p: {
  recipientName: string;
  familyName: string;
  medicines: MedicineView[];
  appUrl: string;
}): string {
  const heading =
    p.medicines.length === 1
      ? 'Medicine Course Completed'
      : `${p.medicines.length} Medicine Courses Completed`;

  const cards = p.medicines
    .map((m) => {
      const start = longDate(m.startDate);
      const end = longDate(m.endDate);

      const dose =
        m.dosage || m.frequency
          ? `\n                <p style="margin:0 0 4px;font-size:14px;color:#6b7280;">
                    ${[m.dosage && e(m.dosage), m.frequency && e(m.frequency)].filter(Boolean).join(' &nbsp;·&nbsp; ')}
                </p>`
          : '';
      const range =
        start || end
          ? `\n                <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">
                    ${[start && e(start), end && e(end)].filter(Boolean).join(' → ')}
                </p>`
          : '';
      const notes = m.notes
        ? `\n                <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">${e(m.notes)}</p>`
        : '';

      return `            <div style="margin-bottom:16px;padding:20px;border-radius:12px;background:#f0fdf4;border:1px solid #86efac;">
${badgeRow('Completed', { badge: '#15803d', badgeBg: '#dcfce7' }, `<span style="font-size:12px;color:#6b7280;">${e(m.memberName)}</span>`)}

                <h2 style="margin:0 0 4px;font-size:18px;line-height:1.3;color:#111827;">${e(m.name)}</h2>${dose}${range}${notes}
            </div>`;
    })
    .join('\n');

  return layout(
    'Medicine Course Completed',
    `        <h1 style="margin:0 0 8px;font-size:26px;line-height:1.2;">
            ${heading}
        </h1>
        <p style="margin:0 0 24px;font-size:16px;color:#6b7280;">
            Hi ${e(p.recipientName)}, the following medicine course(s) for <strong>${e(p.familyName)}</strong> have ended today.
        </p>

${cards}

${cta(`${p.appUrl}/app/medical`, 'View Medical Records')}

${footer(p.familyName)}`,
  );
}
