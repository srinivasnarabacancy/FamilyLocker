import { Injectable, Logger } from '@nestjs/common';
import { randomInt, randomBytes, timingSafeEqual } from 'crypto';
import { User } from '@prisma/client';
import { PrismaService } from '../common/prisma.service';
import { MailService } from '../mail/mail.service';

/** OTP validity, matching User::generateAndSendOtp()'s `now()->addMinutes(10)`. */
const OTP_TTL_MINUTES = 10;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
  ) {}

  /**
   * Port of User::hasVerifiedEmail() — an account with no e-mail address
   * counts as verified, because invited members may only have a phone number.
   */
  static hasVerifiedEmail(user: Pick<User, 'email' | 'emailVerifiedAt'>): boolean {
    return !user.email || user.emailVerifiedAt !== null;
  }

  /**
   * Port of User::generateAndSendOtp(). No-op for verified or e-mail-less users.
   *
   * Returns when the new code expires so the caller can hand the client an
   * absolute deadline to count down against; null when no code was issued.
   */
  async generateAndSendOtp(user: User): Promise<Date | null> {
    if (!user.email || AuthService.hasVerifiedEmail(user)) return null;

    const otp = String(randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + OTP_TTL_MINUTES * 60_000);

    await this.prisma.user.update({
      where: { id: user.id },
      data: {
        otpCode: otp,
        otpExpiresAt: expiresAt,
        updatedAt: new Date(),
      },
    });

    await this.mail.sendOtp(user.email, user.name, otp);

    return expiresAt;
  }

  /** Port of User::verifyOtp(). Consumes the code on success. */
  async verifyOtp(user: User, code: string): Promise<boolean> {
    if (
      !user.otpCode ||
      !user.otpExpiresAt ||
      user.otpExpiresAt.getTime() < Date.now() ||
      !AuthService.codesMatch(user.otpCode, code)
    ) {
      return false;
    }

    await this.markEmailAsVerified(user.id);
    return true;
  }

  /** Constant-time comparison, so response timing cannot leak the code. */
  private static codesMatch(expected: string, submitted: string): boolean {
    const a = Buffer.from(expected, 'utf8');
    const b = Buffer.from(String(submitted ?? ''), 'utf8');
    return a.length === b.length && timingSafeEqual(a, b);
  }

  /** Port of User::markEmailAsVerified(). */
  async markEmailAsVerified(userId: bigint): Promise<void> {
    await this.prisma.user.update({
      where: { id: userId },
      data: {
        emailVerifiedAt: new Date(),
        otpCode: null,
        otpExpiresAt: null,
        updatedAt: new Date(),
      },
    });
  }

  /** Str::random(12), used for invited members' temporary passwords. */
  static temporaryPassword(): string {
    return randomBytes(12).toString('base64url').slice(0, 12);
  }
}
