import {
  Body,
  Controller,
  Get,
  HttpCode,
  Logger,
  Post,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Request } from 'express';
import { PrismaService } from '../common/prisma.service';
import { StorageService } from '../common/storage.service';
import { MailService } from '../mail/mail.service';
import { AuthService } from './auth.service';
import {
  RegistrationService,
  PendingNotFoundError,
  OtpExpiredError,
  OtpMismatchError,
  OtpAttemptsExhaustedError,
  ResendCooldownError,
} from './registration.service';
import { TokenService } from './token.service';
import { AuthGuard, VerifiedGuard } from './auth.guard';
import { hashPassword, checkPassword } from './password';
import { ROLE_OWNER } from './roles';
import { CurrentUser, AuthUser } from '../common/current-user.decorator';
import { Throttle } from '../common/throttle.guard';
import { validate, UploadedFile as FileType } from '../common/validator';
import { success } from '../common/laravel';
import { presentUser } from '../common/presenters';
import { ApiException } from '../common/errors';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly registration: RegistrationService,
    private readonly tokens: TokenService,
    private readonly storage: StorageService,
    private readonly mail: MailService,
  ) {}

  /** Resolves `unique:` / `exists:` rules for the validator. */
  private uniqueCtx() {
    return {
      countWhere: async (table: string, column: string, value: any) => {
        if (table !== 'users') throw new Error(`Unexpected table "${table}"`);
        return this.prisma.user.count({ where: { [column]: value } as any });
      },
    };
  }

  // ─── POST /auth/register ──────────────────────────────────────────────────

  @Post('register')
  @HttpCode(201)
  @Throttle(5, 1)
  async register(@Body() body: any) {
    await validate(
      body,
      {
        name: 'required|string|max:255',
        email: 'required|email|unique:users,email',
        password: 'required|string|min:8|confirmed',
        family_name: 'required|string|max:255',
      },
      this.uniqueCtx(),
    );

    // No user row is created here. The details are held in
    // pending_registrations until the emailed code is verified, so an
    // abandoned sign-up leaves no account behind and frees the address.
    try {
      const { token, expiresInMinutes, expiresAt } = await this.registration.start({
        name: body.name,
        familyName: body.family_name,
        email: body.email,
        password: body.password,
      });

      return success(
        {
          pending_token: token,
          email: body.email,
          expires_in_minutes: expiresInMinutes,
          // ISO-8601 UTC, not the Laravel datetime cast: the client counts down
          // against it, and an unqualified "Y-m-d H:i:s" would be read as local
          // time by the browser.
          otp_expires_at: expiresAt.toISOString(),
        },
        `We sent a 6-digit code to ${body.email}. Enter it to finish creating your account.`,
      );
    } catch (err: any) {
      // Delivery failed, so there is nothing for the user to enter. Nothing was
      // created, and they can simply submit the form again.
      this.logger.error(`Registration code could not be sent to ${body.email}: ${err?.message ?? err}`);

      throw new ApiException(
        'We could not send the verification email right now. Please try again in a moment.',
        503,
      );
    }
  }

  // ─── POST /auth/register/verify ───────────────────────────────────────────

  /** Verifies the code and only then creates the family and owner account. */
  @Post('register/verify')
  @HttpCode(201)
  @Throttle(10, 1)
  async verifyRegistration(@Body() body: any) {
    await validate(body, {
      pending_token: 'required|string|max:64',
      otp: 'required|string|size:6',
    });

    let user;
    try {
      user = await this.registration.verify(body.pending_token, body.otp);
    } catch (err) {
      throw this.registrationError(err);
    }

    const token = await this.tokens.create(user.id);
    const withFamily = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { family: true },
    });

    return success(
      { user: presentUser(withFamily), token },
      'Email verified. Welcome to FamilyLocker!',
    );
  }

  // ─── POST /auth/register/resend ───────────────────────────────────────────

  @Post('register/resend')
  @HttpCode(200)
  @Throttle(6, 1)
  async resendRegistration(@Body() body: any) {
    await validate(body, { pending_token: 'required|string|max:64' });

    try {
      const { email, expiresAt } = await this.registration.resend(body.pending_token);
      return success(
        { otp_expires_at: expiresAt.toISOString() },
        `A new 6-digit code has been sent to ${email}.`,
      );
    } catch (err) {
      throw this.registrationError(err);
    }
  }

  /** Maps registration failures onto the API's error envelope. */
  private registrationError(err: unknown): ApiException {
    if (err instanceof PendingNotFoundError) {
      return new ApiException(
        'This sign-up has expired or was already completed. Please register again.',
        410,
      );
    }
    if (err instanceof OtpExpiredError) {
      return new ApiException('Validation failed', 422, {
        otp: ['That code has expired. Please request a new one.'],
      });
    }
    if (err instanceof OtpAttemptsExhaustedError) {
      return new ApiException('Validation failed', 422, {
        otp: ['Too many incorrect attempts. Please register again to get a new code.'],
      });
    }
    if (err instanceof OtpMismatchError) {
      return new ApiException('Validation failed', 422, {
        otp: [
          `That code is not correct. ${err.attemptsRemaining} attempt(s) remaining.`,
        ],
      });
    }
    if (err instanceof ResendCooldownError) {
      return new ApiException(err.message, 429);
    }

    this.logger.error(`Registration failed: ${err instanceof Error ? err.message : String(err)}`);
    return new ApiException('Something went wrong. Please try again.', 500);
  }

  // ─── POST /auth/login ─────────────────────────────────────────────────────

  @Post('login')
  @Throttle(10, 1)
  async login(@Body() body: any) {
    await validate(body, {
      email: 'required|email',
      password: 'required|string',
    });

    const user = await this.prisma.user.findFirst({
      where: { email: body.email },
      include: { family: true },
    });

    // Hash a dummy value when the account is unknown so response timing does not
    // reveal whether the address exists.
    if (!user || !checkPassword(body.password, user.password)) {
      if (!user) checkPassword(body.password, '$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva');
      throw new ApiException('Invalid credentials', 401);
    }

    const token = await this.tokens.create(user.id);

    if (!AuthService.hasVerifiedEmail(user)) {
      let otpExpiresAt: Date | null = null;

      try {
        otpExpiresAt = await this.auth.generateAndSendOtp(user);
      } catch {
        // Fall through; the client can request another code.
      }

      return success(
        {
          user: presentUser(user),
          token,
          requires_verification: true,
          otp_expires_at: otpExpiresAt?.toISOString() ?? null,
        },
        'Please verify your email before continuing.',
      );
    }

    return success({ user: presentUser(user), token }, 'Login successful');
  }

  // ─── POST /auth/verify-otp ────────────────────────────────────────────────

  @Post('verify-otp')
  @UseGuards(AuthGuard)
  @Throttle(10, 1)
  async verifyOtp(@Body() body: any, @CurrentUser() user: AuthUser) {
    await validate(body, { otp: 'required|string|size:6' });

    if (AuthService.hasVerifiedEmail(user)) {
      return success(null, 'Email already verified.');
    }

    if (!(await this.auth.verifyOtp(user, body.otp))) {
      throw new ApiException('Validation failed', 422, {
        otp: ['The code is invalid or has expired. Please request a new one.'],
      });
    }

    const fresh = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { family: true },
    });

    return success(
      presentUser(fresh),
      'Email verified successfully. Welcome to FamilyLocker!',
    );
  }

  // ─── POST /auth/logout ────────────────────────────────────────────────────

  @Post('logout')
  @UseGuards(AuthGuard)
  async logout(@Req() req: Request) {
    await this.tokens.revoke((req as any).tokenId);
    return success(null, 'Logged out successfully');
  }

  // ─── GET /auth/me ─────────────────────────────────────────────────────────

  @Get('me')
  @UseGuards(AuthGuard)
  async me(@CurrentUser() user: AuthUser) {
    return success(presentUser(user));
  }

  // ─── POST /auth/resend-verification ───────────────────────────────────────

  @Post('resend-verification')
  @UseGuards(AuthGuard)
  @Throttle(6, 1)
  async resendVerification(@CurrentUser() user: AuthUser) {
    if (AuthService.hasVerifiedEmail(user)) {
      return success(null, 'Email address already verified.');
    }

    if (!user.email) {
      throw new ApiException('This account does not have an email address to verify.', 400);
    }

    let otpExpiresAt: Date | null;

    try {
      otpExpiresAt = await this.auth.generateAndSendOtp(user);
    } catch (err: any) {
      this.logger.error(`Resend failed for ${user.email}: ${err?.message ?? err}`);
      throw new ApiException(
        'We could not send the verification email right now. Please try again in a moment.',
        503,
      );
    }

    return success(
      { otp_expires_at: otpExpiresAt?.toISOString() ?? null },
      `A new 6-digit code has been sent to ${user.email}.`,
    );
  }

  // ─── POST /auth/profile ───────────────────────────────────────────────────

  @Post('profile')
  @UseGuards(AuthGuard, VerifiedGuard)
  @UseInterceptors(FileInterceptor('avatar'))
  async updateProfile(
    @Body() body: any,
    @UploadedFile() avatar: FileType | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    await validate({ ...body, avatar }, {
      name: 'sometimes|string|max:255',
      phone: 'sometimes|nullable|string|max:20',
      date_of_birth: 'sometimes|nullable|date',
      relation: 'sometimes|nullable|string|max:50',
      avatar: 'sometimes|image|max:5120',
      remove_avatar: 'sometimes|boolean',
    });

    const data: Record<string, any> = { updatedAt: new Date() };

    if (avatar) {
      await this.storage.delete(user.avatar);
      data.avatar = await this.storage.store(avatar, 'avatars');
    } else if (body.remove_avatar === true || body.remove_avatar === '1' || body.remove_avatar === 'true') {
      await this.storage.delete(user.avatar);
      data.avatar = null;
    }

    // `fill()` only assigns keys that are present in the request.
    if ('name' in body) data.name = body.name;
    if ('phone' in body) data.phone = body.phone || null;
    if ('date_of_birth' in body) {
      data.dateOfBirth = body.date_of_birth ? new Date(`${body.date_of_birth.slice(0, 10)}T00:00:00Z`) : null;
    }
    if ('relation' in body) data.relation = body.relation || null;

    const updated = await this.prisma.user.update({
      where: { id: user.id },
      data,
      include: { family: true },
    });

    return success(presentUser(updated), 'Profile updated successfully');
  }

  // ─── POST /auth/change-password ───────────────────────────────────────────

  @Post('change-password')
  @UseGuards(AuthGuard, VerifiedGuard)
  async changePassword(@Body() body: any, @CurrentUser() user: AuthUser) {
    await validate(body, {
      current_password: 'required|string',
      password: 'required|string|min:8|confirmed',
    });

    if (!checkPassword(body.current_password, user.password)) {
      throw new ApiException('Current password is incorrect', 400);
    }

    await this.prisma.user.update({
      where: { id: user.id },
      data: { password: hashPassword(body.password), updatedAt: new Date() },
    });

    return success(null, 'Password changed successfully');
  }
}
