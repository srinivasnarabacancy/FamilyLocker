import {
  Body, Controller, Delete, Get, HttpCode, Param, Post, Put, UploadedFile,
  UseGuards, UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { PrismaService } from '../../common/prisma.service';
import { StorageService } from '../../common/storage.service';
import { MailService } from '../../mail/mail.service';
import { AuthService } from '../../auth/auth.service';
import { AuthGuard, VerifiedGuard } from '../../auth/auth.guard';
import { CurrentUser, AuthUser } from '../../common/current-user.decorator';
import { validate, UploadedFile as FileType } from '../../common/validator';
import { success } from '../../common/laravel';
import { presentFamily, presentUser } from '../../common/presenters';
import { ApiException, ForbiddenException, NotFoundException } from '../../common/errors';
import { hashPassword } from '../../auth/password';
import { canManageFamily, roleLabel, INVITABLE_ROLES, ROLE_MEMBER, ROLE_OWNER } from '../../auth/roles';
import { pick, filled } from '../../common/input';

/** Port of App\Http\Controllers\Api\FamilyController. */
@Controller('family')
@UseGuards(AuthGuard, VerifiedGuard)
export class FamilyController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly storage: StorageService,
    private readonly mail: MailService,
  ) {}

  /** Port of ensureCanManageFamily(). */
  private assertCanManage(user: AuthUser) {
    if (!canManageFamily(user.role)) {
      throw new ForbiddenException('Only owners and admins can manage family members');
    }
  }

  private uniqueCtx() {
    return {
      countWhere: async (table: string, column: string, value: any) => {
        if (table !== 'users') throw new Error(`Unexpected table "${table}"`);
        return this.prisma.user.count({ where: { [column]: value } as any });
      },
    };
  }

  @Get()
  async show(@CurrentUser() user: AuthUser) {
    if (!user.familyId) throw new NotFoundException('Family not found');

    const family = await this.prisma.family.findUnique({
      where: { id: user.familyId },
      include: { members: true },
    });
    if (!family) throw new NotFoundException('Family not found');

    return success(presentFamily(family));
  }

  /**
   * Route::match(['post','put'], '/'). Nest keeps only the last of two stacked
   * route decorators, so each verb gets its own thin handler.
   */
  @Post()
  @UseInterceptors(FileInterceptor('avatar'))
  async updateViaPost(
    @Body() body: any,
    @UploadedFile() avatar: FileType | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.updateFamily(body, avatar, user);
  }

  @Put()
  @UseInterceptors(FileInterceptor('avatar'))
  async updateViaPut(
    @Body() body: any,
    @UploadedFile() avatar: FileType | undefined,
    @CurrentUser() user: AuthUser,
  ) {
    return this.updateFamily(body, avatar, user);
  }

  private async updateFamily(
    body: any,
    avatar: FileType | undefined,
    user: AuthUser,
  ) {
    this.assertCanManage(user);

    await validate(body, {
      name: 'sometimes|string|max:255',
      description: 'sometimes|nullable|string',
    });

    const data: Record<string, any> = {
      ...pick(body, { name: ['name'], description: ['description'] }),
      updatedAt: new Date(),
    };

    if (avatar) data.avatar = await this.storage.store(avatar, 'family-avatars');

    const family = await this.prisma.family.update({ where: { id: user.familyId! }, data });

    return success(presentFamily(family), 'Family updated successfully');
  }

  @Get('members')
  async members(@CurrentUser() user: AuthUser) {
    const rows = await this.prisma.user.findMany({ where: { familyId: user.familyId! } });
    return success(rows.map(presentUser));
  }

  /** Both `POST /family/invite` and `POST /family/members` invite a member. */
  @Post('invite')
  @HttpCode(201)
  async inviteViaInvite(@Body() body: any, @CurrentUser() inviter: AuthUser) {
    return this.inviteMember(body, inviter);
  }

  @Post('members')
  @HttpCode(201)
  async inviteViaMembers(@Body() body: any, @CurrentUser() inviter: AuthUser) {
    return this.inviteMember(body, inviter);
  }

  private async inviteMember(body: any, inviter: AuthUser) {
    this.assertCanManage(inviter);

    await validate(body, {
      name: 'required|string|max:255',
      email: `nullable|required_without:phone|email|unique:users,email`,
      phone: 'nullable|required_without:email|string|max:20',
      relation: 'required|string|max:50',
      role: `sometimes|in:${INVITABLE_ROLES.join(',')}`,
    }, this.uniqueCtx());

    const temporaryPassword = AuthService.temporaryPassword();
    const emailProvided = filled(body.email);
    const now = new Date();

    const user = await this.prisma.user.create({
      data: {
        name: body.name,
        email: emailProvided ? body.email : null,
        password: hashPassword(temporaryPassword),
        familyId: inviter.familyId!,
        role: body.role ?? ROLE_MEMBER,
        relation: body.relation,
        phone: filled(body.phone) ? body.phone : null,
        createdAt: now,
        updatedAt: now,
      },
    });

    if (emailProvided) {
      try {
        await this.mail.sendFamilyInvitation(user.email!, {
          memberName: user.name,
          memberEmail: user.email!,
          memberPhone: user.phone,
          memberRelation: user.relation,
          roleLabel: roleLabel(user.role),
          familyName: inviter.family!.name,
          inviterName: inviter.name,
          temporaryPassword,
          loginUrl: `${(process.env.APP_URL ?? '').replace(/\/$/, '')}/login`,
        });
      } catch {
        // Laravel wrapped this in a transaction and rolled the user back when the
        // mail failed. The row is kept here instead: the member exists, and the
        // owner can resend rather than silently losing the invite. Reported as a
        // 500 so the caller still knows the e-mail did not go out.
        throw new ApiException('Failed to send invitation email', 500);
      }
    }

    return success(
      presentUser(user),
      emailProvided
        ? 'Invitation email sent successfully'
        : 'Family member added successfully. No invitation email was sent.',
    );
  }

  @Delete('members/:id')
  async removeMember(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    this.assertCanManage(user);

    const member = await this.prisma.user.findFirst({
      where: { id: BigInt(id), familyId: user.familyId! },
    });
    if (!member) throw new NotFoundException('Member not found');

    if (member.role === ROLE_OWNER) {
      throw new ForbiddenException('Cannot remove family owner');
    }

    await this.prisma.user.delete({ where: { id: member.id } });

    return success(null, 'Member removed successfully');
  }
}
