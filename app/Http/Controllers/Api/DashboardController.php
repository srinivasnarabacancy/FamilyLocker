<?php

namespace App\Http\Controllers\Api;

use App\Models\ActivityLog;
use App\Models\Bill;
use App\Models\Document;
use App\Models\Expense;
use App\Models\MedicalRecord;
use App\Models\Reminder;
use App\Models\Task;
use App\Models\Appointment;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class DashboardController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $familyId = $request->user()->family_id;
        $today = now()->toDateString();

        // Stats counts
        $stats = [
            'documents' => Document::where('family_id', $familyId)->count(),
            'expiring_documents' => Document::where('family_id', $familyId)
                ->whereNotNull('expiry_date')
                ->whereDate('expiry_date', '>=', $today)
                ->whereDate('expiry_date', '<=', now()->addDays(30)->toDateString())
                ->count(),
            'total_expense_this_month' => Expense::where('family_id', $familyId)
                ->whereMonth('date', now()->month)
                ->whereYear('date', now()->year)
                ->sum('amount'),
            'pending_bills' => Bill::where('family_id', $familyId)
                ->whereIn('status', ['pending', 'overdue'])
                ->count(),
            'overdue_bills' => Bill::where('family_id', $familyId)
                ->where('status', 'overdue')
                ->count(),
            'bills_due_this_week' => Bill::where('family_id', $familyId)
                ->where('status', 'pending')
                ->whereDate('due_date', '>=', $today)
                ->whereDate('due_date', '<=', now()->addDays(7)->toDateString())
                ->count(),
            'pending_tasks' => Task::where('family_id', $familyId)
                ->whereIn('status', ['pending', 'in_progress'])
                ->count(),
            'completed_tasks' => Task::where('family_id', $familyId)
                ->where('status', 'completed')
                ->count(),
            'medical_records' => MedicalRecord::where('family_id', $familyId)->count(),
            'upcoming_appointments' => Appointment::where('family_id', $familyId)
                ->where('status', 'scheduled')
                ->whereDate('date', '>=', $today)
                ->count(),
            'upcoming_reminders' => Reminder::where('family_id', $familyId)
                ->where('is_active', true)
                ->get()
                ->filter(fn(Reminder $r) => $r->days_until !== null && $r->days_until >= 0 && $r->days_until <= 30)
                ->count(),
        ];

        // Recent activities
        $recentActivities = ActivityLog::where('family_id', $familyId)
            ->with('user')
            ->orderBy('created_at', 'desc')
            ->limit(10)
            ->get();

        // Upcoming bills
        $upcomingBills = Bill::where('family_id', $familyId)
            ->whereIn('status', ['pending', 'overdue'])
            ->orderBy('due_date')
            ->limit(5)
            ->get();

        // Upcoming appointments
        $upcomingAppointments = Appointment::where('family_id', $familyId)
            ->where('status', 'scheduled')
            ->whereDate('date', '>=', $today)
            ->orderBy('date')
            ->limit(5)
            ->get();

        // Pending tasks
        $pendingTasks = Task::where('family_id', $familyId)
            ->whereIn('status', ['pending', 'in_progress'])
            ->with(['assignee'])
            ->orderByRaw("CASE priority WHEN 'urgent' THEN 1 WHEN 'high' THEN 2 WHEN 'medium' THEN 3 WHEN 'low' THEN 4 ELSE 5 END")
            ->limit(5)
            ->get();

        // Expiring documents
        $expiringDocuments = Document::where('family_id', $familyId)
            ->whereNotNull('expiry_date')
            ->whereDate('expiry_date', '>=', $today)
            ->whereDate('expiry_date', '<=', now()->addDays(60)->toDateString())
            ->orderBy('expiry_date')
            ->limit(5)
            ->get();

        // Monthly expense chart (last 6 months)
        $monthlyExpenses = Expense::where('family_id', $familyId)
            ->selectRaw('EXTRACT(YEAR FROM "date") as year, EXTRACT(MONTH FROM "date") as month, SUM(amount) as total')
            ->groupByRaw('EXTRACT(YEAR FROM "date"), EXTRACT(MONTH FROM "date")')
            ->orderByRaw('EXTRACT(YEAR FROM "date") DESC, EXTRACT(MONTH FROM "date") DESC')
            ->limit(6)
            ->get()
            ->reverse()
            ->values();

        // Upcoming reminders (within next 30 days)
        $upcomingReminders = Reminder::where('family_id', $familyId)
            ->where('is_active', true)
            ->with('creator')
            ->get()
            ->filter(fn(Reminder $r) => $r->days_until !== null && $r->days_until >= 0 && $r->days_until <= 30)
            ->sortBy('days_until')
            ->values()
            ->take(5);

        return $this->successResponse([
            'stats' => $stats,
            'recent_activities' => $recentActivities,
            'upcoming_bills' => $upcomingBills,
            'upcoming_appointments' => $upcomingAppointments,
            'upcoming_reminders' => $upcomingReminders,
            'pending_tasks' => $pendingTasks,
            'expiring_documents' => $expiringDocuments,
            'monthly_expenses' => $monthlyExpenses,
        ]);
    }
}
