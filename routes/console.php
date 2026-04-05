<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Send reminder notification emails every morning at 08:00.
// The command checks each active reminder's shouldNotifyToday() logic,
// groups reminders by family, and dispatches one digest email per member.
Schedule::command('reminders:notify')
    ->dailyAt('08:00')
    ->withoutOverlapping()
    ->runInBackground();

