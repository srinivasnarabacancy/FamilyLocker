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
import { success, paginate, pageFrom, decimal2, int } from '../../common/laravel';
import { presentExpense, presentExpenseCategory } from '../../common/presenters';
import { NotFoundException } from '../../common/errors';
import { pick, filled, toDate, toBigInt } from '../../common/input';

const PER_PAGE = 20;

/** First and last instant of a `YYYY-MM` month, for whereMonth/whereYear. */
function monthRange(year: number, month: number) {
  return {
    gte: new Date(Date.UTC(year, month - 1, 1)),
    lt: new Date(Date.UTC(month === 12 ? year + 1 : year, month === 12 ? 0 : month, 1)),
  };
}

/** Port of App\Http\Controllers\Api\ExpenseController. */
@Controller('expenses')
@UseGuards(AuthGuard, VerifiedGuard)
export class ExpensesController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityLogService,
  ) {}

  private categoryCtx() {
    return {
      countWhere: async (table: string, column: string, value: any) => {
        if (table !== 'expense_categories') throw new Error(`Unexpected table "${table}"`);
        return this.prisma.expenseCategory.count({ where: { [column]: BigInt(value) } as any });
      },
    };
  }

  private async findOrFail(id: string, familyId: bigint) {
    const expense = await this.prisma.expense.findFirst({ where: { id: BigInt(id), familyId } });
    if (!expense) throw new NotFoundException('Expense not found');
    return expense;
  }

  @Get()
  async index(@Query() query: any, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const where: Prisma.ExpenseWhereInput = { familyId: user.familyId! };

    if (filled(query.category_id)) where.categoryId = toBigInt(query.category_id)!;

    if (filled(query.month)) {
      const d = new Date(query.month.length <= 7 ? `${query.month}-01T00:00:00Z` : query.month);
      where.date = monthRange(d.getUTCFullYear(), d.getUTCMonth() + 1);
    }

    // from_date / to_date are additive filters in Laravel; merged so both apply.
    if (filled(query.from_date) || filled(query.to_date)) {
      where.date = {
        ...(where.date as object),
        ...(filled(query.from_date) ? { gte: toDate(query.from_date)! } : {}),
        ...(filled(query.to_date) ? { lte: toDate(query.to_date)! } : {}),
      };
    }

    const page = pageFrom(query);

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.expense.findMany({
        where,
        include: { user: true, category: true },
        orderBy: { date: 'desc' },
        skip: (page - 1) * PER_PAGE,
        take: PER_PAGE,
      }),
      this.prisma.expense.count({ where }),
    ]);

    return success(
      paginate(rows.map(presentExpense), total, page, PER_PAGE, `${req.protocol}://${req.get('host')}${req.path}`),
    );
  }

  @Post()
  @HttpCode(201)
  async store(@Body() body: any, @CurrentUser() user: AuthUser) {
    await validate(body, {
      title: 'required|string|max:255',
      amount: 'required|numeric|min:0',
      date: 'required|date',
      category_id: 'nullable|exists:expense_categories,id',
      description: 'nullable|string',
      payment_method: 'sometimes|in:cash,card,upi,net_banking',
    }, this.categoryCtx());

    const now = new Date();
    const expense = await this.prisma.expense.create({
      data: {
        ...(pick(body, {
          title: ['title'],
          amount: ['amount', 'decimal'],
          date: ['date', 'date'],
          category_id: ['categoryId', 'int'],
          description: ['description'],
          payment_method: ['paymentMethod'],
        }) as any),
        categoryId: toBigInt(body.category_id),
        familyId: user.familyId!,
        userId: user.id,
        createdAt: now,
        updatedAt: now,
      },
      include: { user: true, category: true },
    });

    await this.activity.log(
      user.id, user.familyId!, 'expenses', 'created',
      `Added expense: ${expense.title} (₹${decimal2(expense.amount)})`,
    );

    return success(presentExpense(expense), 'Expense added successfully');
  }

  @Get('summary')
  async summary(@Query() query: any, @CurrentUser() user: AuthUser) {
    const familyId = user.familyId!;
    const now = new Date();
    const month: string = filled(query.month)
      ? query.month
      : `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;

    const year = Number(month.slice(0, 4));
    const monthNum = Number(month.slice(5, 7));
    const range = monthRange(year, monthNum);

    const totalAgg = await this.prisma.expense.aggregate({
      where: { familyId, date: range },
      _sum: { amount: true },
    });

    const grouped = await this.prisma.expense.groupBy({
      by: ['categoryId'],
      where: { familyId, date: range },
      _sum: { amount: true },
      _count: { _all: true },
    });

    // Laravel eager-loaded `category` onto each grouped row.
    const categories = await this.prisma.expenseCategory.findMany({ where: { familyId } });
    const byId = new Map(categories.map((c) => [String(c.id), c]));

    const categoryBreakdown = grouped.map((g) => ({
      category_id: int(g.categoryId),
      total: decimal2(g._sum.amount ?? 0),
      count: g._count._all,
      category: g.categoryId ? presentExpenseCategory(byId.get(String(g.categoryId)) ?? null) : null,
    }));

    const monthlyTrend = await this.monthlyTotals(familyId, 12);

    return success({
      // Laravel's ->sum() returns Postgres' numeric as a string; 0 when empty.
      total_monthly: totalAgg._sum.amount ? decimal2(totalAgg._sum.amount) : '0',
      category_breakdown: categoryBreakdown,
      monthly_trend: monthlyTrend,
    });
  }

  /**
   * Shared by the summary endpoint and the dashboard chart. Mirrors the raw
   * `EXTRACT(YEAR ...)/EXTRACT(MONTH ...)` grouping the Laravel query used, so
   * the `{year, month, total}` row shape the Vue charts read is preserved.
   */
  async monthlyTotals(familyId: bigint, limit: number) {
    const rows = await this.prisma.$queryRaw<
      Array<{ year: number; month: number; total: Prisma.Decimal }>
    >`
      SELECT EXTRACT(YEAR FROM "date")::int AS year,
             EXTRACT(MONTH FROM "date")::int AS month,
             SUM(amount) AS total
      FROM expenses
      WHERE family_id = ${familyId}
      GROUP BY EXTRACT(YEAR FROM "date"), EXTRACT(MONTH FROM "date")
      ORDER BY year DESC, month DESC
      LIMIT ${limit}
    `;

    return rows.map((r) => ({ year: r.year, month: r.month, total: decimal2(r.total) }));
  }

  @Get('categories')
  async categories(@CurrentUser() user: AuthUser) {
    const rows = await this.prisma.expenseCategory.findMany({ where: { familyId: user.familyId! } });
    return success(rows.map(presentExpenseCategory));
  }

  @Post('categories')
  @HttpCode(201)
  async storeCategory(@Body() body: any, @CurrentUser() user: AuthUser) {
    await validate(body, {
      name: 'required|string|max:100',
      icon: 'nullable|string|max:50',
      color: 'nullable|string|max:20',
    });

    const now = new Date();
    const category = await this.prisma.expenseCategory.create({
      data: {
        ...(pick(body, { name: ['name'], icon: ['icon'], color: ['color'] }) as any),
        familyId: user.familyId!,
        createdAt: now,
        updatedAt: now,
      },
    });

    return success(presentExpenseCategory(category), 'Category created');
  }

  @Delete('categories/:id')
  async destroyCategory(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const category = await this.prisma.expenseCategory.findFirst({
      where: { id: BigInt(id), familyId: user.familyId! },
    });
    if (!category) throw new NotFoundException('Category not found');

    await this.prisma.expenseCategory.delete({ where: { id: category.id } });

    return success(null, 'Category deleted');
  }

  @Get(':id')
  async show(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const expense = await this.prisma.expense.findFirst({
      where: { id: BigInt(id), familyId: user.familyId! },
      include: { user: true, category: true },
    });
    if (!expense) throw new NotFoundException('Expense not found');

    return success(presentExpense(expense));
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: AuthUser) {
    const existing = await this.findOrFail(id, user.familyId!);

    await validate(body, {
      title: 'sometimes|string|max:255',
      amount: 'sometimes|numeric|min:0',
      date: 'sometimes|date',
      category_id: 'nullable|exists:expense_categories,id',
      description: 'nullable|string',
      payment_method: 'sometimes|in:cash,card,upi,net_banking',
    }, this.categoryCtx());

    const data: any = {
      ...pick(body, {
        title: ['title'],
        amount: ['amount', 'decimal'],
        date: ['date', 'date'],
        description: ['description'],
        payment_method: ['paymentMethod'],
      }),
      updatedAt: new Date(),
    };
    if ('category_id' in body) data.categoryId = toBigInt(body.category_id);

    const expense = await this.prisma.expense.update({
      where: { id: existing.id },
      data,
      include: { user: true, category: true },
    });

    return success(presentExpense(expense), 'Expense updated successfully');
  }

  @Delete(':id')
  async destroy(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const expense = await this.findOrFail(id, user.familyId!);
    await this.prisma.expense.delete({ where: { id: expense.id } });

    return success(null, 'Expense deleted successfully');
  }
}
