import {
  Body, Controller, Delete, Get, HttpCode, Param, Patch, Post, Put, Query, Req, UseGuards,
} from '@nestjs/common';
import { Request } from 'express';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../common/prisma.service';
import { ActivityLogService } from '../../common/activity-log.service';
import { AuthGuard, VerifiedGuard } from '../../auth/auth.guard';
import { CurrentUser, AuthUser } from '../../common/current-user.decorator';
import { validate } from '../../common/validator';
import { success, paginate, pageFrom } from '../../common/laravel';
import { presentTask } from '../../common/presenters';
import { NotFoundException } from '../../common/errors';
import { pick, filled, toBigInt } from '../../common/input';

const PER_PAGE = 20;

/**
 * Laravel ordered by `due_date` then a raw CASE over priority. Prisma cannot
 * express the CASE, so the ordering is applied in memory after fetching the
 * page — see PRIORITY_RANK below.
 */
const PRIORITY_RANK: Record<string, number> = { urgent: 1, high: 2, medium: 3, low: 4 };

function priorityRank(p: string): number {
  return PRIORITY_RANK[p] ?? 5;
}

/** Port of App\Http\Controllers\Api\TaskController. */
@Controller('tasks')
@UseGuards(AuthGuard, VerifiedGuard)
export class TasksController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly activity: ActivityLogService,
  ) {}

  private usersCtx() {
    return {
      countWhere: async (table: string, column: string, value: any) => {
        if (table !== 'users') throw new Error(`Unexpected table "${table}"`);
        return this.prisma.user.count({ where: { [column]: BigInt(value) } as any });
      },
    };
  }

  private async findOrFail(id: string, familyId: bigint) {
    const task = await this.prisma.task.findFirst({ where: { id: BigInt(id), familyId } });
    if (!task) throw new NotFoundException('Task not found');
    return task;
  }

  @Get()
  async index(@Query() query: any, @CurrentUser() user: AuthUser, @Req() req: Request) {
    const where: Prisma.TaskWhereInput = { familyId: user.familyId! };

    if (filled(query.status)) where.status = query.status;
    if (filled(query.priority)) where.priority = query.priority;
    if (filled(query.assigned_to)) where.assignedTo = toBigInt(query.assigned_to)!;
    if (filled(query.my_tasks)) {
      where.OR = [{ assignedTo: user.id }, { createdBy: user.id }];
    }

    const page = pageFrom(query);

    // Laravel's combined `orderBy('due_date')` + priority CASE is reproduced by
    // sorting the whole result set, then slicing the page — the ordering must be
    // global, not per-page.
    const [all, total] = await this.prisma.$transaction([
      this.prisma.task.findMany({ where, include: { creator: true, assignee: true } }),
      this.prisma.task.count({ where }),
    ]);

    all.sort((a, b) => {
      // Postgres sorts NULLs last on an ASC order by default.
      const aDue = a.dueDate ? a.dueDate.getTime() : Number.POSITIVE_INFINITY;
      const bDue = b.dueDate ? b.dueDate.getTime() : Number.POSITIVE_INFINITY;
      if (aDue !== bDue) return aDue - bDue;
      return priorityRank(a.priority) - priorityRank(b.priority);
    });

    const rows = all.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    return success(
      paginate(rows.map(presentTask), total, page, PER_PAGE, `${req.protocol}://${req.get('host')}${req.path}`),
    );
  }

  @Post()
  @HttpCode(201)
  async store(@Body() body: any, @CurrentUser() user: AuthUser) {
    await validate(body, {
      title: 'required|string|max:255',
      description: 'nullable|string',
      due_date: 'nullable|date',
      priority: 'sometimes|in:low,medium,high,urgent',
      assigned_to: 'nullable|exists:users,id',
      category: 'nullable|string|max:100',
    }, this.usersCtx());

    const now = new Date();
    const task = await this.prisma.task.create({
      data: {
        ...(pick(body, {
          title: ['title'],
          description: ['description'],
          due_date: ['dueDate', 'date'],
          priority: ['priority'],
          category: ['category'],
        }) as any),
        assignedTo: toBigInt(body.assigned_to),
        familyId: user.familyId!,
        createdBy: user.id,
        createdAt: now,
        updatedAt: now,
      },
      include: { creator: true, assignee: true },
    });

    await this.activity.log(
      user.id, user.familyId!, 'tasks', 'created', `Created task: ${task.title}`,
    );

    return success(presentTask(task), 'Task created');
  }

  @Get(':id')
  async show(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const task = await this.prisma.task.findFirst({
      where: { id: BigInt(id), familyId: user.familyId! },
      include: { creator: true, assignee: true },
    });
    if (!task) throw new NotFoundException('Task not found');

    return success(presentTask(task));
  }

  @Put(':id')
  async update(@Param('id') id: string, @Body() body: any, @CurrentUser() user: AuthUser) {
    const existing = await this.findOrFail(id, user.familyId!);

    const data: any = {
      ...pick(body, {
        title: ['title'],
        description: ['description'],
        due_date: ['dueDate', 'date'],
        priority: ['priority'],
        category: ['category'],
        status: ['status'],
      }),
      updatedAt: new Date(),
    };
    if ('assigned_to' in body) data.assignedTo = toBigInt(body.assigned_to);

    // Stamp completion only on the pending → completed transition.
    if (data.status === 'completed' && existing.status !== 'completed') {
      data.completedAt = new Date();
    }

    const task = await this.prisma.task.update({
      where: { id: existing.id },
      data,
      include: { creator: true, assignee: true },
    });

    await this.activity.log(
      user.id, user.familyId!, 'tasks', 'updated', `Updated task: ${task.title}`,
    );

    return success(presentTask(task), 'Task updated');
  }

  @Patch(':id/status')
  async updateStatus(@Param('id') id: string, @Body() body: any, @CurrentUser() user: AuthUser) {
    const existing = await this.findOrFail(id, user.familyId!);

    await validate(body, { status: 'required|in:pending,in_progress,completed,cancelled' });

    const data: Prisma.TaskUncheckedUpdateInput = { status: body.status, updatedAt: new Date() };
    if (body.status === 'completed') data.completedAt = new Date();

    const task = await this.prisma.task.update({ where: { id: existing.id }, data });

    return success(presentTask(task), 'Task status updated');
  }

  @Delete(':id')
  async destroy(@Param('id') id: string, @CurrentUser() user: AuthUser) {
    const task = await this.findOrFail(id, user.familyId!);
    await this.prisma.task.delete({ where: { id: task.id } });

    return success(null, 'Task deleted');
  }
}
