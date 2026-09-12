import {
  Body, Controller, Delete, Get, HttpCode, Param, Post, Put, Query, Req, UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { ActivityLogService } from '../../common/activity-log.service';
import { AuthGuard, VerifiedGuard } from '../../auth/auth.guard';
import { CurrentUser, AuthUser } from '../../common/current-user.decorator';
import { validate } from '../../common/validator';
import { success, paginate, pageFrom, decimal2 } from '../../common/laravel';
import { presentBill } from '../../common/presenters';
import { NotFoundException } from '../../common/errors';
import { pick, filled, toDate } from '../../common/input';
import { today } from '../../common/reminder-logic';

const PER_PAGE = 15;

/** Port of App\Http\Controllers\Api\BillController. */
@Controller('bills')
@UseGuards(AuthGuard, VerifiedGuard)
export class BillsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityLogService,
  ) {}

  private async findOrFail(id: string, familyId: bigint) {
    const bill = await this.prisma.bill.findFirst({ where: { id: BigInt(id), familyId } });
    if (!bill) throw new NotFoundException('Bill not found');
    return bill;
  }

  @Get()
  async index(@Query() query: any, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const familyId = user.familyId!;

    // Side effect preserved from Laravel: listing bills flips past-due pending
    // bills to `overdue` before the page is read.
    await this.prisma.bill.updateMany({
      where: { familyId, status: 'pending', dueDate: { lt: today() } },
      data: { status: 'overdue' },
    });

    const where: Prisma.BillWhereInput = { familyId };
    if (filled(query.status)) where.status = query.status;
    if (filled(query.category)) where.category = query.category;

    const page = pageFrom(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.bill.findMany({
        where,
        include: { user: true },
        orderBy: { dueDate: 'asc' },
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
      }),
      this.prisma.bill.count({ where }),
    ]);

    return success(
      paginate(rows.map(presentBill), total, page, PER_PAGE, `${req.protocol}://${req.get('host')}${req.path}`),
    );
  }

  @Post()
  @HttpCode(201)
  async store(@Body() body: any, @CurrentUser() user: AuthUser) {
    await validate(body, {
      name: 'required|string|max:255',
      category: 'required|string|in:electricity,water,gas,internet,phone,rent,insurance,subscription,other',
      amount: 'required|numeric|min:0',
      due_date: 'required|date',
      is_recurring: 'boolean',
      recurring_period: 'nullable|required_if:is_recurring,true|in:monthly,quarterly,yearly',
      provider: 'nullable|string|max:255',
      notes: 'nullable|string',
    });

    const now = new Date();
    const bill = await this.prisma.bill.create({
      data: {
        ...(pick(body, {
          name: ['name'],
          category: ['category'],
          amount: ['amount', 'decimal'],
          due_date: ['dueDate', 'date'],
          is_recurring: ['isRecurring', 'bool'],
          recurring_period: ['recurringPeriod'],
          provider: ['provider'],
          notes: ['notes'],
        }) as any),
        familyId: user.familyId!,
        userId: user.id,
        createdAt: now,
        updatedAt: now,
      },
      include: { user: true },
    });

    await this.activity.log(
      user.id, user.familyId!, 'bills', 'created',
      `Added bill: ${bill.name} (₹${decimal2(bill.amount)})`,
    );

    return success(presentBill(bill), 'Bill added');
  }

  @Get('upcoming-due')
  async upcomingDue(@Query() query: any, @CurrentUser() user: AuthUser) {
    const days = filled(query.days) ? Number(query.days) : 7;
    const from = today();
    const to = new Date(from.getTime() + days * 86_400_000);

    const bills = await this.prisma.bill.findMany({
      where: { familyId: user.familyId!, status: 'pending', dueDate: { gte: from, lte: to } },
      orderBy: { dueDate: 'asc' },
    });

    return success(bills.map(presentBill));
  }

  @Get(':id')
  async show(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const bill = await this.prisma.bill.findFirst({
      where: { id: BigInt(id), familyId: user.familyId! },
      include: { user: true },
    });
    if (!bill) throw new NotFoundException('Bill not found');

    return success(presentBill(bill));
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: AuthUser) {
    const existing = await this.findOrFail(id, user.familyId!);

    const bill = await this.prisma.bill.update({
      where: { id: existing.id },
      data: {
        ...pick(body, {
          name: ['name'],
          category: ['category'],
          amount: ['amount', 'decimal'],
          due_date: ['dueDate', 'date'],
          is_recurring: ['isRecurring', 'bool'],
          recurring_period: ['recurringPeriod'],
          provider: ['provider'],
          notes: ['notes'],
          status: ['status'],
          paid_date: ['paidDate', 'date'],
        }),
        updatedAt: new Date(),
      },
      include: { user: true },
    });

    return success(presentBill(bill), 'Bill updated');
  }

  @Post(':id/mark-paid')
  async markPaid(@Param('id') id: string, @Body() body: any, @CurrentUser() user: AuthUser) {
    const existing = await this.findOrFail(id, user.familyId!);

    const bill = await this.prisma.bill.update({
      where: { id: existing.id },
      data: {
        status: 'paid',
        paidDate: filled(body.paid_date) ? toDate(body.paid_date) : today(),
        updatedAt: new Date(),
      },
    });

    await this.activity.log(
      user.id, user.familyId!, 'bills', 'paid', `Marked bill as paid: ${bill.name}`,
    );

    // Roll a recurring bill forward from its ORIGINAL due date, not from today.
    if (bill.isRecurring) {
      const next = this.nextDueDate(existing.dueDate, bill.recurringPeriod);

      if (next) {
        const now = new Date();
        await this.prisma.bill.create({
          data: {
            familyId: bill.familyId,
            userId: bill.userId,
            name: bill.name,
            category: bill.category,
            amount: bill.amount,
            dueDate: next,
            isRecurring: true,
            recurringPeriod: bill.recurringPeriod,
            provider: bill.provider,
            notes: bill.notes,
            createdAt: now,
            updatedAt: now,
          },
        });
      }
    }

    return success(presentBill(bill), 'Bill marked as paid');
  }

  /**
   * Carbon's addMonth/addMonths/addYear. Note the overflow behaviour: adding a
   * month to 31 January yields 3 March (or 2 March in a leap year), exactly as
   * PHP's DateTime does, so recurring-bill dates do not drift from the current
   * behaviour.
   */
  private nextDueDate(from: Date, period: string | null): Date | null {
    const d = new Date(from.getTime());

    switch (period) {
      case 'monthly':
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, d.getUTCDate()));
      case 'quarterly':
        return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 3, d.getUTCDate()));
      case 'yearly':
        return new Date(Date.UTC(d.getUTCFullYear() + 1, d.getUTCMonth(), d.getUTCDate()));
      default:
        return null;
    }
  }

  @Delete(':id')
  async destroy(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const bill = await this.findOrFail(id, user.familyId!);
    await this.prisma.bill.delete({ where: { id: bill.id } });

    return success(null, 'Bill deleted');
  }
}
