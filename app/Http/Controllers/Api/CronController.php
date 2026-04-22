<?php

namespace App\Http\Controllers\Api;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Artisan;

class CronController extends BaseApiController
{
    /**
     * Triggered by Vercel's cron scheduler (vercel.json) every day at 08:00 UTC.
     * Vercel passes the CRON_SECRET as a Bearer token — we validate it before running.
     *
     * Endpoint: GET /api/cron/reminders
     */
    public function sendReminders(Request $request): JsonResponse
    {
        $secret = config('app.cron_secret');

        if (!$secret || $request->bearerToken() !== $secret) {
            return $this->errorResponse('Unauthorized', 401);
        }

        Artisan::call('reminders:notify');

        $output = Artisan::output();

        return $this->successResponse(['output' => trim($output)], 'Reminder notifications dispatched');
    }
}
