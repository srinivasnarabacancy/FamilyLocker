import {
  Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, UseGuards,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { ActivityLogService } from '../../common/activity-log.service';
import { MailService } from '../../mail/mail.service';
import { AuthService } from '../../auth/auth.service';
import { AuthGuard, VerifiedGuard } from '../../auth/auth.guard';
import { CurrentUser, AuthUser } from '../../common/current-user.decorator';
import { validate } from '../../common/validator';
import { success } from '../../common/laravel';
import { presentReminder } from '../../common/presenters';
import { NotFoundException } from '../../common/errors';
import { pick, filled, toBool } from '../../common/input';
import { daysUntil, nextOccurrence } from '../../common/reminder-logic';
import { toReminderView } from './reminder-view';

/** Port of App\Http\Controllers\Api\ReminderController. */
@Controller('reminders')
@UseGuards(AuthGuard, VerifiedGuard)
export class RemindersController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityLogService,
    private readonly mail: MailService,
  ) {}

  private async findOrFail(id: string, familyId: bigint) {
    const reminder = await this.prisma.reminder.findFirst({ where: { id: BigInt(id), familyId } });
    if (!reminder) throw new NotFoundException('Reminder not found');
    return reminder;
  }

  @Get()
  async index(@Query() query: any, @CurrentUser() user: AuthUser) {
    const where: Prisma.ReminderWhereInput = { familyId: user.familyId! };
    if (filled(query.type)) where.type = query.type;
    if (filled(query.is_active)) where.isActive = toBool(query.is_active);

    const rows = await this.prisma.reminder.findMany({
      where,
      include: { creator: true },
      orderBy: { occasionDate: 'asc' },
    });

    // Sorted by the computed days_until so the soonest occurrence leads, which
    // cannot be expressed as a SQL order — same as the Collection sort Laravel used.
    const sorted = rows
      .map((r) => ({ row: r, days: daysUntil(r.occasionDate, r.recursYearly) }))
      .sort((a, b) => (a.days ?? Infinity) - (b.days ?? Infinity))
      .map((x) => presentReminder(x.row));

    return success(sorted);
  }

  @Get('upcoming')
  async upcoming(@Query() query: any, @CurrentUser() user: AuthUser) {
    const days = filled(query.days) ? Number(query.days) : 30;

    const rows = await this.prisma.reminder.findMany({
      where: { familyId: user.familyId!, isActive: true },
      include: { creator: true },
    });

    const upcoming = rows
      .map((r) => ({ row: r, days: daysUntil(r.occasionDate, r.recursYearly) }))
      .filter((x) => x.days !== null && x.days >= 0 && x.days <= days)
      .sort((a, b) => a.days! - b.days!)
      .map((x) => presentReminder(x.row));

    return success(upcoming);
  }

  @Post()
  @HttpCode(201)
  async store(@Body() body: any, @CurrentUser() user: AuthUser) {
    await validate(body, {
      title: 'required|string|max:255',
      type: 'sometimes|in:birthday,anniversary,holiday,other',
      occasion_date: 'required|date',
      recurs_yearly: 'sometimes|boolean',
      remind_days_before: 'sometimes|integer|min:0|max:365',
      description: 'nullable|string',
      is_active: 'sometimes|boolean',
    });

    const now = new Date();
    const reminder = await this.prisma.reminder.create({
      data: {
        ...(pick(body, {
          title: ['title'],
          type: ['type'],
          occasion_date: ['occasionDate', 'date'],
          recurs_yearly: ['recursYearly', 'bool'],
          remind_days_before: ['remindDaysBefore', 'int'],
          description: ['description'],
          is_active: ['isActive', 'bool'],
        }) as any),
        familyId: user.familyId!,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      },
      include: { creator: true },
    });

    await this.activity.log(
      user.id, user.familyId!, 'reminders', 'created', `Created reminder: ${reminder.title}`,
    );

    await this.notifyFamilyReminderCreated(reminder, user);

    return success(presentReminder(reminder), 'Reminder created');
  }

  @Get(':id')
  async show(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const reminder = await this.prisma.reminder.findFirst({
      where: { id: BigInt(id), familyId: user.familyId! },
      include: { creator: true },
    });
    if (!reminder) throw new NotFoundException('Reminder not found');

    return success(presentReminder(reminder));
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: AuthUser) {
    const existing = await this.findOrFail(id, user.familyId!);

    await validate(body, {
      title: 'sometimes|string|max:255',
      type: 'sometimes|in:birthday,anniversary,holiday,other',
      occasion_date: 'sometimes|date',
      recurs_yearly: 'sometimes|boolean',
      remind_days_before: 'sometimes|integer|min:0|max:365',
      description: 'nullable|string',
      is_active: 'sometimes|boolean',
    });

    const reminder = await this.prisma.reminder.update({
      where: { id: existing.id },
      data: {
        ...pick(body, {
          title: ['title'],
          type: ['type'],
          occasion_date: ['occasionDate', 'date'],
          recurs_yearly: ['recursYearly', 'bool'],
          remind_days_before: ['remindDaysBefore', 'int'],
          description: ['description'],
          is_active: ['isActive', 'bool'],
        }),
        updatedAt: new Date(),
      },
      include: { creator: true },
    });

    await this.activity.log(
      user.id, user.familyId!, 'reminders', 'updated', `Updated reminder: ${reminder.title}`,
    );

    return success(presentReminder(reminder), 'Reminder updated');
  }

  @Delete(':id')
  async destroy(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const reminder = await this.findOrFail(id, user.familyId!);
    await this.prisma.reminder.delete({ where: { id: reminder.id } });

    await this.activity.log(
      user.id, user.familyId!, 'reminders', 'deleted', `Deleted reminder: ${reminder.title}`,
    );

    return success(null, 'Reminder deleted');
  }

  /** Port of notifyFamilyReminderCreated(): one e-mail per verified member. */
  private async notifyFamilyReminderCreated(
    reminder: Prisma.ReminderGetPayload<{ include: { creator: true } }>,
    creator: AuthUser,
  ) {
    const family = await this.prisma.family.findUnique({
      where: { id: reminder.familyId },
      include: { members: true },
    });
    if (!family) return;

    const recipients = family.members.filter(
      (m) => m.email && AuthService.hasVerifiedEmail(m),
    );

    for (const member of recipients) {
      try {
        await this.mail.sendReminderCreated(member.email!, {
          recipientName: member.name,
          isSelf: member.id === creator.id,
          creatorName: creator.name,
          familyName: family.name,
          reminder: toReminderView(reminder),
        });
      } catch {
        // A failed notification must not fail reminder creation.
      }
    }
  }
}
