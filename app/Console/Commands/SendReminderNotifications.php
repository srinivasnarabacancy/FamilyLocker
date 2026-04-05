<?php

namespace App\Console\Commands;

use App\Mail\ReminderNotificationMail;
use App\Models\Family;
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

        if ($reminders->isEmpty()) {
            $this->info('No reminders require notification today.');
            return self::SUCCESS;
        }

        $this->info("Found {$reminders->count()} reminder(s) to dispatch.");

        // Group reminders by family so we can send one digest email per family per member.
        $byFamily    = $reminders->groupBy('family_id');
        $totalSent   = 0;   // global counter to throttle across all families

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
                    // Pause before every send after the first to respect SMTP rate limits.
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

            // Mark all reminders in this family as notified today.
            if (!$dryRun) {
                Reminder::whereIn('id', $familyReminders->pluck('id'))
                    ->update(['notification_sent_at' => $today->toDateString()]);
            }
        }

        $this->info('Done.');
        return self::SUCCESS;
    }
}
