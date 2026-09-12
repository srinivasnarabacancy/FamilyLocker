import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { MailService } from '../../mail/mail.service';
import { AuthService } from '../../auth/auth.service';
import {
  today, diffInDays, reminderShouldNotifyToday, appointmentShouldNotifyToday,
} from '../../common/reminder-logic';
import { toReminderView } from '../reminders/reminder-view';

/** Pause between sends, carried over from the command's sleep() calls. */
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Port of App\Console\Commands\SendReminderNotifications.
 *
 * Runs three independent passes — occasion reminders, appointment reminders and
 * medicine completions — and returns the log lines the Artisan command printed,
 * because CronController echoed them back in its response body.
 */
@Injectable()
export class SendRemindersService {
  private readonly logger = new Logger('reminders:notify');

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  async run(dryRun = false): Promise<string[]> {
    const out: string[] = [];
    const now = new Date();
    const t = today(now);
    const todayString = t.toISOString().slice(0, 10);

    const line = (s: string) => {
      out.push(s);
      this.logger.log(s);
    };

    line(`[${todayString}] Checking reminders for notifications...${dryRun ? ' (DRY RUN)' : ''}`);

    await this.sendReminderEmails(t, dryRun, line, now);
    line('Done.');

    await this.sendAppointmentReminders(t, dryRun, line, now);
    await this.sendMedicineCompletions(t, dryRun, line);

    return out;
  }

  private async verifiedMembers(familyId: bigint) {
    const family = await this.prisma.family.findUnique({
      where: { id: familyId },
      include: { members: true },
    });

    return {
      family,
      members: (family?.members ?? []).filter((m) => m.email && AuthService.hasVerifiedEmail(m)),
    };
  }

  // ─── Occasion reminders ───────────────────────────────────────────────────

  private async sendReminderEmails(
    t: Date,
    dryRun: boolean,
    line: (s: string) => void,
    now: Date,
  ) {
    const all = await this.prisma.reminder.findMany({ where: { isActive: true } });
    const due = all.filter((r) => reminderShouldNotifyToday(r, now));

    if (due.length === 0) {
      line('No reminders require notification today.');
      return;
    }

    line(`Found ${due.length} reminder(s) to dispatch.`);

    const byFamily = new Map<string, typeof due>();
    for (const r of due) {
      const key = String(r.familyId);
      byFamily.set(key, [...(byFamily.get(key) ?? []), r]);
    }

    let totalSent = 0;

    for (const [familyId, reminders] of byFamily) {
      const { family, members } = await this.verifiedMembers(BigInt(familyId));
      if (!family) continue;

      if (members.length === 0) {
        line(`  Family #${familyId} (${family.name}): no verified members — skipping.`);
        continue;
      }

      const views = reminders.map((r) => toReminderView(r, now));

      for (const member of members) {
        if (dryRun) {
          line(`  [DRY RUN] Would email ${member.email} — ${reminders.length} reminder(s):`);
          for (const v of views) line(`    • ${v.title} (in ${v.daysUntil} day(s))`);
          continue;
        }

        // Throttles the upstream SMTP relay, as the original command did.
        if (totalSent > 0) await sleep(2000);

        try {
          await this.mail.sendReminderNotification(member.email!, {
            recipientName: member.name,
            familyName: family.name,
            reminders: views,
          });
          line(`  Queued email → ${member.email} (${reminders.length} reminder(s))`);
          totalSent++;
        } catch (err: any) {
          line(`  FAILED → ${member.email}: ${err?.message ?? err}`);
        }
      }

      if (!dryRun) {
        await this.prisma.reminder.updateMany({
          where: { id: { in: reminders.map((r) => r.id) } },
          data: { notificationSentAt: t },
        });
      }
    }
  }

  // ─── Appointment reminders ────────────────────────────────────────────────

  private async sendAppointmentReminders(
    t: Date,
    dryRun: boolean,
    line: (s: string) => void,
    now: Date,
  ) {
    const candidates = await this.prisma.appointment.findMany({
      where: { status: { not: 'cancelled' }, date: { gte: t } },
    });
    const due = candidates.filter((a) => appointmentShouldNotifyToday(a, now));

    if (due.length === 0) {
      line('No appointment reminders to send today.');
      return;
    }

    line(`Found ${due.length} appointment(s) to notify.`);

    const byFamily = new Map<string, typeof due>();
    for (const a of due) {
      const key = String(a.familyId);
      byFamily.set(key, [...(byFamily.get(key) ?? []), a]);
    }

    for (const [familyId, appointments] of byFamily) {
      const { family, members } = await this.verifiedMembers(BigInt(familyId));
      if (!family) continue;

      if (members.length === 0) {
        line(`  Family #${familyId} (${family.name}): no verified members — skipping.`);
        continue;
      }

      const views = appointments.map((a) => ({
        doctorName: a.doctorName,
        memberName: a.memberName,
        specialty: a.specialty,
        location: a.location,
        notes: a.notes,
        status: a.status,
        date: a.date,
        time: a.time
          ? a.time.toISOString().slice(11, 19)
          : null,
        daysUntil: diffInDays(t, a.date),
      }));

      for (const member of members) {
        if (dryRun) {
          line(`  [DRY RUN] Would email ${member.email} — ${appointments.length} appointment(s).`);
          continue;
        }

        await sleep(2000);

        try {
          await this.mail.sendAppointmentReminder(member.email!, {
            recipientName: member.name,
            familyName: family.name,
            appointments: views,
          });
          line(`  Queued appointment reminder → ${member.email}`);
        } catch (err: any) {
          line(`  FAILED → ${member.email}: ${err?.message ?? err}`);
        }
      }

      if (!dryRun) {
        await this.prisma.appointment.updateMany({
          where: { id: { in: appointments.map((a) => a.id) } },
          data: { notificationSentAt: t },
        });
      }
    }
  }

  // ─── Medicine completions ─────────────────────────────────────────────────

  private async sendMedicineCompletions(t: Date, dryRun: boolean, line: (s: string) => void) {
    const medicines = await this.prisma.medicine.findMany({
      where: { endDate: t, notifyOnCompletion: true },
    });

    if (medicines.length === 0) {
      line('No medicine completions to notify today.');
      return;
    }

    line(`Found ${medicines.length} medicine(s) completing today.`);

    const byFamily = new Map<string, typeof medicines>();
    for (const m of medicines) {
      const key = String(m.familyId);
      byFamily.set(key, [...(byFamily.get(key) ?? []), m]);
    }

    for (const [familyId, familyMedicines] of byFamily) {
      const { family, members } = await this.verifiedMembers(BigInt(familyId));
      if (!family) continue;

      if (members.length === 0) {
        line(`  Family #${familyId} (${family.name}): no verified members — skipping.`);
        continue;
      }

      const views = familyMedicines.map((m) => ({
        name: m.name,
        memberName: m.memberName,
        dosage: m.dosage,
        frequency: m.frequency,
        notes: m.notes,
        startDate: m.startDate,
        endDate: m.endDate,
      }));

      for (const member of members) {
        if (dryRun) {
          line(`  [DRY RUN] Would email ${member.email} — ${familyMedicines.length} medicine(s) completed.`);
          continue;
        }

        await sleep(5000);

        try {
          await this.mail.sendMedicineCompletion(member.email!, {
            recipientName: member.name,
            familyName: family.name,
            medicines: views,
          });
          line(`  Queued medicine completion email → ${member.email}`);
        } catch (err: any) {
          line(`  FAILED → ${member.email}: ${err?.message ?? err}`);
        }
      }
    }
  }
}
