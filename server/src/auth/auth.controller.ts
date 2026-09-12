import {
  Body,
  Controller,
  Get,
  HttpCode,
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
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
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

    const now = new Date();

    // Laravel creates the family with created_by=0 then back-fills it; the same
    // two-step runs here inside a transaction so a failure cannot strand an
    // orphan family row (the Laravel API version was not transactional).
    const user = await this.prisma.$transaction(async (tx) => {
      const family = await tx.family.create({
        data: { name: body.family_name, createdBy: BigInt(0), createdAt: now, updatedAt: now },
      });

      const created = await tx.user.create({
        data: {
          name: body.name,
          email: body.email,
          password: hashPassword(body.password),
          familyId: family.id,
          role: ROLE_OWNER,
          createdAt: now,
          updatedAt: now,
        },
      });

      await tx.family.update({ where: { id: family.id }, data: { createdBy: created.id } });

      return created;
    });

    // DEVIATION: Laravel's API called sendEmailVerificationNotification(), which
    // sends a signed verification LINK — but routes/web.php never registered a
    // handler for it, so that link 404s. The working path in production is the
    // OTP flow used by the Inertia controller, so the port standardises on OTP.
    try {
      await this.auth.generateAndSendOtp(user);
    } catch {
      // Account is created either way; the client can request a new code.
    }

    // DEVIATION: a token is issued even though the account is unverified, so the
    // SPA can reach the OTP screen. This mirrors the Inertia flow, which logged
    // the user in and then relied on the `verified` middleware. Every protected
    // endpoint stays blocked by VerifiedGuard until the code is entered.
    const token = await this.tokens.create(user.id);
    const withFamily = await this.prisma.user.findUnique({
      where: { id: user.id },
      include: { family: true },
    });

    return success(
      {
        user: presentUser(withFamily),
        token,
        requires_verification: true,
      },
      'Registration successful. Please verify your email before logging in.',
    );
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
      try {
        await this.auth.generateAndSendOtp(user);
      } catch {
        // Fall through; the client can request another code.
      }

      return success(
        { user: presentUser(user), token, requires_verification: true },
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

    await this.auth.generateAndSendOtp(user);

    return success(null, 'Verification email sent successfully.');
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
