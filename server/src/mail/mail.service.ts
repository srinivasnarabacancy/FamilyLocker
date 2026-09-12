import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import {
  otpEmail,
  familyInvitationEmail,
  reminderNotificationEmail,
  reminderCreatedEmail,
  appointmentReminderEmail,
  medicineCompletionEmail,
  ReminderView,
  AppointmentView,
  MedicineView,
} from './templates';

/**
 * Replaces Illuminate\Mail plus the six Mailable classes. Subject lines are
 * copied from each Mailable's envelope() so threading in existing inboxes is
 * unchanged.
 *
 * Laravel ran with QUEUE_CONNECTION=sync, so `->queue()` and `->send()` both
 * dispatched inline; sending is awaited here to match that behaviour. Moving to
 * a real queue is a follow-up, not part of the port.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: Transporter | null = null;

  private readonly from = {
    address: process.env.MAIL_FROM_ADDRESS ?? 'hello@example.com',
    name: process.env.MAIL_FROM_NAME ?? 'FamilyLocker',
  };

  private readonly appUrl = (process.env.APP_URL ?? 'http://localhost:8000').replace(/\/$/, '');

  private transport(): Transporter {
    if (!this.transporter) {
      const port = Number(process.env.MAIL_PORT ?? 2525);

      this.transporter = nodemailer.createTransport({
        host: process.env.MAIL_HOST,
        port,
        // Laravel infers this from MAIL_SCHEME/port; 465 is implicit TLS.
        secure: port === 465,
        auth: process.env.MAIL_USERNAME
          ? { user: process.env.MAIL_USERNAME, pass: process.env.MAIL_PASSWORD }
          : undefined,
      });
    }

    return this.transporter;
  }

  /**
   * Brevo's transactional HTTP API. Preferred over SMTP when BREVO_API_KEY is
   * present: no SMTP handshake, which is faster and more reliable on
   * serverless, and it fails with a readable JSON error rather than an opaque
   * SMTP code.
   *
   * The key is read from the environment on the server only — it is never sent
   * to the browser and must never appear in a VITE_* variable.
   */
  private async sendViaBrevo(to: string, subject: string, html: string): Promise<void> {
    const res = await fetch('https://api.brevo.com/v3/smtp/email', {
      method: 'POST',
      headers: {
        'api-key': process.env.BREVO_API_KEY!,
        'content-type': 'application/json',
        accept: 'application/json',
      },
      body: JSON.stringify({
        sender: { name: this.from.name, email: this.from.address },
        to: [{ email: to }],
        subject,
        htmlContent: html,
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      const body = await res.text();
      // Brevo reports an unverified sender here, which is the usual first failure.
      throw new Error(`Brevo API ${res.status}: ${body}`);
    }
  }

  private async send(to: string, subject: string, html: string): Promise<void> {
    try {
      if (process.env.BREVO_API_KEY) {
        await this.sendViaBrevo(to, subject, html);
      } else {
        await this.transport().sendMail({ from: this.from, to, subject, html });
      }
    } catch (err: any) {
      // Matches Laravel's behaviour at the call sites, which report() and carry
      // on rather than failing the user's request.
      this.logger.error(`Failed to send "${subject}" to ${to}: ${err?.message ?? err}`);
      throw err;
    }
  }

  /** EmailOtpMail */
  async sendOtp(to: string, userName: string, otp: string): Promise<void> {
    await this.send(to, 'Your FamilyLocker Verification Code', otpEmail(userName, otp));
  }

  /** FamilyMemberInvitationMail */
  async sendFamilyInvitation(
    to: string,
    p: Parameters<typeof familyInvitationEmail>[0] & { familyName: string },
  ): Promise<void> {
    await this.send(
      to,
      `You're invited to join ${p.familyName} on FamilyLocker`,
      familyInvitationEmail(p),
    );
  }

  /** ReminderCreatedMail */
  async sendReminderCreated(
    to: string,
    p: {
      recipientName: string;
      isSelf: boolean;
      creatorName: string;
      familyName: string;
      reminder: ReminderView;
    },
  ): Promise<void> {
    await this.send(
      to,
      `New Reminder Added: ${p.reminder.title} — ${p.familyName}`,
      reminderCreatedEmail({ ...p, appUrl: this.appUrl }),
    );
  }

  /** ReminderNotificationMail */
  async sendReminderNotification(
    to: string,
    p: { recipientName: string; familyName: string; reminders: ReminderView[] },
  ): Promise<void> {
    const subject =
      p.reminders.length === 1
        ? `Reminder: ${p.reminders[0].title} — ${p.familyName}`
        : `${p.reminders.length} upcoming reminders for ${p.familyName}`;

    await this.send(to, subject, reminderNotificationEmail({ ...p, appUrl: this.appUrl }));
  }

  /** AppointmentReminderMail */
  async sendAppointmentReminder(
    to: string,
    p: { recipientName: string; familyName: string; appointments: AppointmentView[] },
  ): Promise<void> {
    const subject =
      p.appointments.length === 1
        ? `Appointment Reminder: Dr. ${p.appointments[0].doctorName} — ${p.familyName}`
        : `${p.appointments.length} upcoming appointments for ${p.familyName}`;

    await this.send(to, subject, appointmentReminderEmail({ ...p, appUrl: this.appUrl }));
  }

  /** MedicineCompletionMail */
  async sendMedicineCompletion(
    to: string,
    p: { recipientName: string; familyName: string; medicines: MedicineView[] },
  ): Promise<void> {
    const subject =
      p.medicines.length === 1
        ? `Medicine Course Completed: ${p.medicines[0].name} — ${p.familyName}`
        : `${p.medicines.length} medicine courses completed for ${p.familyName}`;

    await this.send(to, subject, medicineCompletionEmail({ ...p, appUrl: this.appUrl }));
  }
}
