<?php

namespace App\Console\Commands;

use App\Mail\AppointmentReminderMail;
use App\Mail\MedicineCompletionMail;
use App\Mail\ReminderNotificationMail;
use App\Models\Appointment;
use App\Models\Family;
use App\Models\Medicine;
use App\Models\Reminder;
use Carbon\Carbon;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Mail;

class SendReminderNotifications extends Command
{
    protected $signature = 'reminders:notify
                            {--dry-run : Log which emails would be sent without actually sending them}';

    protected $description = 'Send email notifications for reminders that fall within their remind_days_before window.';

    public function handle(): int
    {
        $today   = Carbon::today();
        $dryRun  = $this->option('dry-run');

        $this->info("[{$today->toDateString()}] Checking reminders for notifications..." . ($dryRun ? ' (DRY RUN)' : ''));

        // Load all active reminders that have not yet been notified this cycle,
        // along with their family and family members (for recipient list).
        $reminders = Reminder::where('is_active', true)
            ->with(['family.members', 'creator'])
            ->get()
            ->filter(fn (Reminder $r) => $r->shouldNotifyToday());

        if ($reminders->isNotEmpty()) {
            $this->info("Found {$reminders->count()} reminder(s) to dispatch.");

            $byFamily  = $reminders->groupBy('family_id');
            $totalSent = 0;

            foreach ($byFamily as $familyId => $familyReminders) {
                /** @var Family $family */
                $family  = $familyReminders->first()->family;
                $members = $family->members->filter(fn ($m) => $m->email && $m->hasVerifiedEmail());

                if ($members->isEmpty()) {
                    $this->warn("  Family #{$familyId} ({$family->name}): no verified members — skipping.");
                    continue;
                }

                foreach ($members as $member) {
                    if ($dryRun) {
                        $this->line("  [DRY RUN] Would email {$member->email} — {$familyReminders->count()} reminder(s):");
                        foreach ($familyReminders as $r) {
                            $this->line("    • {$r->title} (in {$r->days_until} day(s))");
                        }
                    } else {
                        if ($totalSent > 0) {
                            sleep(2);
                        }
                        Mail::to($member->email)->queue(
                            new ReminderNotificationMail($member, $family, $familyReminders)
                        );
                        $this->line("  Queued email → {$member->email} ({$familyReminders->count()} reminder(s))");
                        $totalSent++;
                    }
                }

                if (!$dryRun) {
                    Reminder::whereIn('id', $familyReminders->pluck('id'))
                        ->update(['notification_sent_at' => $today->toDateString()]);
                }
            }
        } else {
            $this->info('No reminders require notification today.');
        }

        $this->info('Done.');

        // ── Appointment reminders ────────────────────────────────────────────
        $this->sendAppointmentReminders($today, $dryRun);

        // ── Medicine completion notifications ────────────────────────────────
        $this->sendMedicineCompletionNotifications($today, $dryRun);

        return self::SUCCESS;
    }

    private function sendAppointmentReminders(Carbon $today, bool $dryRun): void
    {
        $appointments = Appointment::where('status', '!=', 'cancelled')
            ->whereDate('date', '>=', $today)
            ->with('family.members')
            ->get()
            ->filter(fn (Appointment $a) => $a->shouldNotifyToday());

        if ($appointments->isEmpty()) {
            $this->info('No appointment reminders to send today.');
            return;
        }

        $this->info("Found {$appointments->count()} appointment(s) to notify.");

        $byFamily = $appointments->groupBy('family_id');

        foreach ($byFamily as $familyId => $familyAppts) {
            $family  = $familyAppts->first()->family;
            $members = $family->members->filter(fn ($m) => $m->email && $m->hasVerifiedEmail());

            if ($members->isEmpty()) {
                $this->warn("  Family #{$familyId} ({$family->name}): no verified members — skipping.");
                continue;
            }

            foreach ($members as $member) {
                if ($dryRun) {
                    $this->line("  [DRY RUN] Would email {$member->email} — {$familyAppts->count()} appointment(s).");
                } else {
                    sleep(2);
                    Mail::to($member->email)->queue(
                        new AppointmentReminderMail($member, $family, $familyAppts)
                    );
                    $this->line("  Queued appointment reminder → {$member->email}");
                }
            }

            if (!$dryRun) {
                Appointment::whereIn('id', $familyAppts->pluck('id'))
                    ->update(['notification_sent_at' => $today->toDateString()]);
            }
        }
    }

    private function sendMedicineCompletionNotifications(Carbon $today, bool $dryRun): void
    {
        $medicines = Medicine::whereDate('end_date', $today)
            ->where('notify_on_completion', true)
            ->with('family.members')
            ->get();

        if ($medicines->isEmpty()) {
            $this->info('No medicine completions to notify today.');
            return;
        }

        $this->info("Found {$medicines->count()} medicine(s) completing today.");

        $byFamily = $medicines->groupBy('family_id');

        foreach ($byFamily as $familyId => $familyMedicines) {
            $family  = $familyMedicines->first()->family;
            $members = $family->members->filter(fn ($m) => $m->email && $m->hasVerifiedEmail());

            if ($members->isEmpty()) {
                $this->warn("  Family #{$familyId} ({$family->name}): no verified members — skipping.");
                continue;
            }

            foreach ($members as $member) {
                if ($dryRun) {
                    $this->line("  [DRY RUN] Would email {$member->email} — {$familyMedicines->count()} medicine(s) completed.");
                } else {
                    sleep(5);
                    Mail::to($member->email)->queue(
                        new MedicineCompletionMail($member, $family, $familyMedicines)
                    );
                    $this->line("  Queued medicine completion email → {$member->email}");
                }
            }
        }
    }
}
