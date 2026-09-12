import { Injectable, Logger } from '@nestjs/common';
import { randomBytes, randomInt, timingSafeEqual } from 'crypto';
import { PendingRegistration, User } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { MailService } from '../mail/mail.service';
import { hashPassword } from './password';
import { ROLE_OWNER } from './roles';

/** Code lifetime for a pending sign-up. */
const OTP_TTL_MINUTES = Number(process.env.REGISTRATION_OTP_TTL_MINUTES ?? 5);

/**
 * Wrong guesses before the code is burned. Six digits is only ~20 bits, so
 * expiry alone is not sufficient protection.
 */
const MAX_ATTEMPTS = Number(process.env.REGISTRATION_OTP_MAX_ATTEMPTS ?? 5);

/** Minimum gap between resends for one pending sign-up. */
const RESEND_COOLDOWN_SECONDS = Number(process.env.REGISTRATION_OTP_RESEND_SECONDS ?? 60);

export class PendingNotFoundError extends Error {}
export class OtpExpiredError extends Error {}
export class OtpMismatchError extends Error {
  constructor(public readonly attemptsRemaining: number) {
    super('Incorrect code.');
  }
}
export class OtpAttemptsExhaustedError extends Error {}
export class ResendCooldownError extends Error {
  constructor(public readonly retryAfterSeconds: number) {
    super(`Please wait ${retryAfterSeconds}s before requesting another code.`);
  }
}

/**
 * Two-step account creation.
 *
 * "Create Account" does NOT create a user. The submitted details are held in
 * `pending_registrations` with a one-time code; the `users` and `families` rows
 * are only INSERTed once that code is verified. An abandoned or mistyped
 * sign-up therefore leaves no account behind and does not consume the email
 * address — which the previous create-then-verify flow did.
 */
@Injectable()
export class RegistrationService {
  private readonly logger = new Logger(RegistrationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /**
   * Stores the sign-up and emails a code. Returns the opaque token the client
   * uses to verify or resend.
   *
   * Re-registering the same address replaces any earlier pending row, so only
   * one code is ever live for an address.
   */
  async start(input: {
    name: string;
    familyName: string;
    email: string;
    password: string;
  }): Promise<{ token: string; expiresInMinutes: number; expiresAt: Date }> {
    const email = input.email.trim();
    const token = randomBytes(32).toString('base64url').slice(0, 64);
    const otp = this.generateCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60_000);

    const data = {
      token,
      name: input.name,
      familyName: input.familyName,
      email,
      // Hashed here so plaintext is never persisted, even transiently.
      password: hashPassword(input.password),
      otpCode: otp,
      otpExpiresAt: expiresAt,
      attempts: 0,
      lastSentAt: now,
      updatedAt: now,
    };

    await this.prisma.pendingRegistration.upsert({
      where: { email },
      create: data,
      update: data,
    });

    // The error is deliberately propagated: the caller must know the code did
    // not go out, rather than sending the user to a screen waiting for mail
    // that never arrives. The row is removed first so a mail outage does not
    // accumulate dead sign-ups.
    try {
      await this.mail.sendOtp(email, input.name, otp);
    } catch (err) {
      await this.prisma.pendingRegistration.delete({ where: { email } }).catch(() => undefined);
      throw err;
    }

    return { token, expiresInMinutes: OTP_TTL_MINUTES, expiresAt };
  }

  /**
   * Verifies a code and, only then, creates the family and owner account.
   * Returns the new user.
   */
  async verify(token: string, submitted: string): Promise<User> {
    const pending = await this.findPending(token);

    if (pending.otpExpiresAt.getTime() < Date.now()) {
      await this.discard(pending.id);
      throw new OtpExpiredError();
    }

    if (pending.attempts >= MAX_ATTEMPTS) {
      await this.discard(pending.id);
      throw new OtpAttemptsExhaustedError();
    }

    if (!this.codesMatch(pending.otpCode, submitted)) {
      const attempts = pending.attempts + 1;

      if (attempts >= MAX_ATTEMPTS) {
        await this.discard(pending.id);
        throw new OtpAttemptsExhaustedError();
      }

      await this.prisma.pendingRegistration.update({
        where: { id: pending.id },
        data: { attempts, updatedAt: new Date() },
      });

      throw new OtpMismatchError(MAX_ATTEMPTS - attempts);
    }

    return this.createAccount(pending);
  }

  /** Issues a fresh code for an existing pending sign-up. */
  async resend(
    token: string,
  ): Promise<{ email: string; expiresInMinutes: number; expiresAt: Date }> {
    const pending = await this.findPending(token);

    if (pending.lastSentAt) {
      const elapsed = (Date.now() - pending.lastSentAt.getTime()) / 1000;
      if (elapsed < RESEND_COOLDOWN_SECONDS) {
        throw new ResendCooldownError(Math.ceil(RESEND_COOLDOWN_SECONDS - elapsed));
      }
    }

    const otp = this.generateCode();
    const now = new Date();
    const expiresAt = new Date(now.getTime() + OTP_TTL_MINUTES * 60_000);

    await this.prisma.pendingRegistration.update({
      where: { id: pending.id },
      data: {
        otpCode: otp,
        otpExpiresAt: expiresAt,
        // A new code resets the budget; the old one is gone.
        attempts: 0,
        lastSentAt: now,
        updatedAt: now,
      },
    });

    await this.mail.sendOtp(pending.email, pending.name, otp);

    return { email: pending.email, expiresInMinutes: OTP_TTL_MINUTES, expiresAt };
  }

  /** The address a pending token belongs to, for display on the OTP screen. */
  async emailFor(token: string): Promise<string> {
    return (await this.findPending(token)).email;
  }

  /**
   * Creates the family and its owner, mirroring the original registration:
   * the family is inserted first with a placeholder creator, then back-filled.
   * Wrapped in a transaction so a failure cannot strand an orphan family.
   */
  private async createAccount(pending: PendingRegistration): Promise<User> {
    const now = new Date();

    const user = await this.prisma.$transaction(async (tx) => {
      const family = await tx.family.create({
        data: {
          name: pending.familyName,
          createdBy: BigInt(0),
          createdAt: now,
          updatedAt: now,
        },
      });

      const created = await tx.user.create({
        data: {
          name: pending.name,
          email: pending.email,
          // Already hashed at start(); do not re-hash.
          password: pending.password,
          familyId: family.id,
          role: ROLE_OWNER,
          // The address is proven by this point, so the account starts verified.
          emailVerifiedAt: now,
          createdAt: now,
          updatedAt: now,
        },
      });

      await tx.family.update({ where: { id: family.id }, data: { createdBy: created.id } });

      // The pending row has served its purpose; remove it in the same
      // transaction so a crash cannot leave both a user and a live code.
      await tx.pendingRegistration.delete({ where: { id: pending.id } });

      return created;
    });

    return user;
  }

  private async findPending(token: string): Promise<PendingRegistration> {
    const pending = await this.prisma.pendingRegistration.findUnique({ where: { token } });
    if (!pending) throw new PendingNotFoundError();
    return pending;
  }

  private async discard(id: bigint): Promise<void> {
    await this.prisma.pendingRegistration.delete({ where: { id } }).catch(() => undefined);
  }

  private generateCode(): string {
    // randomInt is CSPRNG-backed; the range keeps every code exactly six digits.
    return String(randomInt(100000, 1000000));
  }

  /** Constant-time comparison, so response timing cannot leak the code. */
  private codesMatch(expected: string, submitted: string): boolean {
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(String(submitted ?? ''), 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  }
}
