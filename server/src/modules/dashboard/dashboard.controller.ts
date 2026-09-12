import { Controller, Get, UseGuards } from '@nestjs/common';
import { PrismaService } from '../../common/prisma.service';
import { AuthGuard, VerifiedGuard } from '../../auth/auth.guard';
import { CurrentUser, AuthUser } from '../../common/current-user.decorator';
import { success, decimal2 } from '../../common/laravel';
import {
  presentActivityLog, presentAppointment, presentBill,
  presentDocument, presentReminder, presentTask,
} from '../../common/presenters';
import { daysUntil, today } from '../../common/reminder-logic';
import { ExpensesController } from '../expenses/expenses.controller';

const PRIORITY_RANK: Record<string, number> = { urgent: 1, high: 2, medium: 3, low: 4 };

/** Port of App\Http\Controllers\Api\DashboardController. */
@Controller('dashboard')
@UseGuards(AuthGuard, VerifiedGuard)
export class DashboardController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly expenses: ExpensesController,
  ) {}

  @Get()
  async index(@CurrentUser() user: AuthUser) {
    const familyId = user.familyId!;
    const now = new Date();
    const t = today(now);
    const plus = (days: number) => new Date(t.getTime() + days * 86_400_000);

    // Active reminders are loaded once and reused for both the stat and the
    // list, as the Laravel version did after its own optimisation pass.
    const activeReminders = await this.prisma.reminder.findMany({
      where: { familyId, isActive: true },
      include: { creator: true },
    });

    const upcomingReminders = activeReminders
      .map((r) => ({ row: r, days: daysUntil(r.occasionDate, r.recursYearly, now) }))
      .filter((x) => x.days !== null && x.days >= 0 && x.days <= 30)
      .sort((a, b) => a.days! - b.days!);

    const monthStart = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), 1));
    const monthEnd = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 1, 1));

    const [
      documents, expiringDocumentCount, monthExpenseAgg, pendingBills, overdueBills,
      billsDueThisWeek, pendingTaskCount, completedTasks, medicalRecords, upcomingAppointmentCount,
      recentActivities, upcomingBills, upcomingAppointments, pendingTasks, expiringDocuments,
    ] = await this.prisma.$transaction([
      this.prisma.document.count({ where: { familyId } }),
      this.prisma.document.count({
        where: { familyId, expiryDate: { gte: t, lte: plus(30) } },
      }),
      this.prisma.expense.aggregate({
        where: { familyId, date: { gte: monthStart, lt: monthEnd } },
        _sum: { amount: true },
      }),
      this.prisma.bill.count({ where: { familyId, status: { in: ['pending', 'overdue'] } } }),
      this.prisma.bill.count({ where: { familyId, status: 'overdue' } }),
      this.prisma.bill.count({
        where: { familyId, status: 'pending', dueDate: { gte: t, lte: plus(7) } },
      }),
      this.prisma.task.count({ where: { familyId, status: { in: ['pending', 'in_progress'] } } }),
      this.prisma.task.count({ where: { familyId, status: 'completed' } }),
      this.prisma.medicalRecord.count({ where: { familyId } }),
      this.prisma.appointment.count({
        where: { familyId, status: 'scheduled', date: { gte: t } },
      }),
      this.prisma.activityLog.findMany({
        where: { familyId },
        include: { user: true },
        orderBy: { createdAt: 'desc' },
        take: 10,
      }),
      this.prisma.bill.findMany({
        where: { familyId, status: { in: ['pending', 'overdue'] } },
        orderBy: { dueDate: 'asc' },
        take: 5,
      }),
      this.prisma.appointment.findMany({
        where: { familyId, status: 'scheduled', date: { gte: t } },
        orderBy: { date: 'asc' },
        take: 5,
      }),
      this.prisma.task.findMany({
        where: { familyId, status: { in: ['pending', 'in_progress'] } },
        include: { assignee: true },
      }),
      this.prisma.document.findMany({
        where: { familyId, expiryDate: { gte: t, lte: plus(60) } },
        orderBy: { expiryDate: 'asc' },
        take: 5,
      }),
    ]);

    // The priority CASE ordering has no Prisma equivalent, so it is applied in
    // memory before taking the top five.
    const rankedTasks = [...pendingTasks]
      .sort((a, b) => (PRIORITY_RANK[a.priority] ?? 5) - (PRIORITY_RANK[b.priority] ?? 5))
      .slice(0, 5);

    const monthlyExpenses = (await this.expenses.monthlyTotals(familyId, 6)).reverse();

    return success({
      stats: {
        documents,
        expiring_documents: expiringDocumentCount,
        total_expense_this_month: monthExpenseAgg._sum.amount
          ? decimal2(monthExpenseAgg._sum.amount)
          : '0',
        pending_bills: pendingBills,
        overdue_bills: overdueBills,
        bills_due_this_week: billsDueThisWeek,
        pending_tasks: pendingTaskCount,
        completed_tasks: completedTasks,
        medical_records: medicalRecords,
        upcoming_appointments: upcomingAppointmentCount,
        upcoming_reminders: upcomingReminders.length,
      },
      recent_activities: recentActivities.map(presentActivityLog),
      upcoming_bills: upcomingBills.map(presentBill),
      upcoming_appointments: upcomingAppointments.map(presentAppointment),
      upcoming_reminders: upcomingReminders.slice(0, 5).map((x) => presentReminder(x.row, now)),
      pending_tasks: rankedTasks.map(presentTask),
      expiring_documents: expiringDocuments.map(presentDocument),
      monthly_expenses: monthlyExpenses,
    });
  }
}
