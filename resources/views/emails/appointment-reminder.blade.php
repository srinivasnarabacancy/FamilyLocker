<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Appointment Reminder</title>
</head>
<body style="margin:0;padding:24px;background-color:#f4f6fb;font-family:Arial,sans-serif;color:#1f2937;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 12px 30px rgba(15,23,42,0.08);">

        {{-- Header --}}
        <p style="margin:0 0 12px;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:#6c5ce7;">FamilyLocker</p>
        <h1 style="margin:0 0 8px;font-size:26px;line-height:1.2;">
            @if ($appointments->count() === 1)
                Appointment Reminder
            @else
                {{ $appointments->count() }} Upcoming Appointments
            @endif
        </h1>
        <p style="margin:0 0 24px;font-size:16px;color:#6b7280;">
            Hi {{ $recipient->name }}, here are the upcoming appointments for <strong>{{ $family->name }}</strong>.
        </p>

        {{-- Appointment cards --}}
        @foreach ($appointments as $appt)
            @php
                $apptDate  = \Carbon\Carbon::parse($appt->date);
                $daysUntil = (int) now()->startOfDay()->diffInDays($apptDate, false);
                $dateStr   = $apptDate->format('F j, Y');
                $timeStr   = $appt->time ? \Carbon\Carbon::createFromFormat('H:i:s', $appt->time)->format('g:i A') : null;

                if ($daysUntil === 0) {
                    $countdown = 'TODAY';
                    $countdownColor = '#16a34a';
                } elseif ($daysUntil === 1) {
                    $countdown = 'TOMORROW';
                    $countdownColor = '#d97706';
                } else {
                    $countdown = "IN {$daysUntil} DAYS";
                    $countdownColor = '#6c5ce7';
                }

                $statusColors = [
                    'scheduled'  => ['bg' => '#eff6ff', 'border' => '#93c5fd', 'badge' => '#1d4ed8', 'badgeBg' => '#dbeafe'],
                    'completed'  => ['bg' => '#f0fdf4', 'border' => '#86efac', 'badge' => '#15803d', 'badgeBg' => '#dcfce7'],
                    'cancelled'  => ['bg' => '#fff1f2', 'border' => '#fca5a5', 'badge' => '#b91c1c', 'badgeBg' => '#fee2e2'],
                ];
                $colors = $statusColors[$appt->status] ?? $statusColors['scheduled'];
            @endphp

            <div style="margin-bottom:16px;padding:20px;border-radius:12px;background:{{ $colors['bg'] }};border:1px solid {{ $colors['border'] }};">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:10px;">
                    <span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;background:{{ $colors['badgeBg'] }};color:{{ $colors['badge'] }};">
                        {{ ucfirst($appt->status) }}
                    </span>
                    <span style="font-size:13px;font-weight:800;letter-spacing:0.08em;color:{{ $countdownColor }};">
                        {{ $countdown }}
                    </span>
                </div>

                <h2 style="margin:0 0 2px;font-size:18px;line-height:1.3;color:#111827;">Dr. {{ $appt->doctor_name }}</h2>
                @if ($appt->specialty)
                    <p style="margin:0 0 6px;font-size:14px;color:#6b7280;">{{ $appt->specialty }}</p>
                @endif

                <p style="margin:0 0 4px;font-size:14px;color:#374151;">
                    &#128197; {{ $dateStr }}{{ $timeStr ? ' at ' . $timeStr : '' }}
                </p>
                <p style="margin:0 0 4px;font-size:14px;color:#374151;">
                    &#128100; {{ $appt->member_name }}
                </p>
                @if ($appt->location)
                    <p style="margin:0 0 4px;font-size:14px;color:#374151;">&#128205; {{ $appt->location }}</p>
                @endif
                @if ($appt->notes)
                    <p style="margin:8px 0 0;font-size:14px;line-height:1.6;color:#6b7280;">{{ $appt->notes }}</p>
                @endif
            </div>
        @endforeach

        {{-- CTA --}}
        <p style="margin:24px 0 0;">
            <a href="{{ config('app.url') }}/app/medical"
               style="display:inline-block;padding:12px 24px;border-radius:999px;background:#6c5ce7;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;">
                View Appointments
            </a>
        </p>

        <hr style="margin:28px 0;border:none;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:13px;line-height:1.6;color:#9ca3af;">
            You received this email because you are a member of the <strong>{{ $family->name }}</strong> family on FamilyLocker.
        </p>
    </div>
</body>
</html>
