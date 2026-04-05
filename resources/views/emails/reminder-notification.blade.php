<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FamilyLocker Reminders</title>
</head>
<body style="margin:0;padding:24px;background-color:#f4f6fb;font-family:Arial,sans-serif;color:#1f2937;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 12px 30px rgba(15,23,42,0.08);">

        {{-- Header --}}
        <p style="margin:0 0 12px;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:#6c5ce7;">FamilyLocker</p>
        <h1 style="margin:0 0 8px;font-size:26px;line-height:1.2;">
            @if ($reminders->count() === 1)
                Reminder: {{ $reminders->first()->title }}
            @else
                You have {{ $reminders->count() }} upcoming reminders
            @endif
        </h1>
        <p style="margin:0 0 24px;font-size:16px;color:#6b7280;">
            Hi {{ $recipient->name }}, here's what's coming up for <strong>{{ $family->name }}</strong>.
        </p>

        {{-- Reminder cards --}}
        @foreach ($reminders as $reminder)
            @php
                $typeColors = [
                    'birthday'    => ['bg' => '#fff0f6', 'border' => '#f9a8d4', 'badge' => '#be185d', 'badgeBg' => '#fce7f3'],
                    'anniversary' => ['bg' => '#f5f3ff', 'border' => '#c4b5fd', 'badge' => '#6d28d9', 'badgeBg' => '#ede9fe'],
                    'holiday'     => ['bg' => '#fffbeb', 'border' => '#fcd34d', 'badge' => '#b45309', 'badgeBg' => '#fef3c7'],
                    'other'       => ['bg' => '#ecfeff', 'border' => '#67e8f9', 'badge' => '#0e7490', 'badgeBg' => '#cffafe'],
                ];
                $colors = $typeColors[$reminder->type] ?? $typeColors['other'];
                $daysUntil = $reminder->days_until;

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

                $typeLabel = ucfirst($reminder->type);
                $nextDate  = \Carbon\Carbon::parse($reminder->next_occurrence)->format('F j, Y');
            @endphp

            <div style="margin-bottom:16px;padding:20px;border-radius:12px;background:{{ $colors['bg'] }};border:1px solid {{ $colors['border'] }};">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                    <span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;background:{{ $colors['badgeBg'] }};color:{{ $colors['badge'] }};">
                        {{ $typeLabel }}
                    </span>
                    <span style="font-size:13px;font-weight:800;letter-spacing:0.08em;color:{{ $countdownColor }};">
                        {{ $countdown }}
                    </span>
                </div>

                <h2 style="margin:0 0 4px;font-size:18px;line-height:1.3;color:#111827;">{{ $reminder->title }}</h2>
                <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">{{ $nextDate }}</p>

                @if ($reminder->description)
                    <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">{{ $reminder->description }}</p>
                @endif
            </div>
        @endforeach

        {{-- CTA --}}
        <p style="margin:24px 0 0;">
            <a href="{{ config('app.url') }}/app/reminders"
               style="display:inline-block;padding:12px 24px;border-radius:999px;background:#6c5ce7;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;">
                View All Reminders
            </a>
        </p>

        <hr style="margin:28px 0;border:none;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:13px;line-height:1.6;color:#9ca3af;">
            You received this email because you are a member of the <strong>{{ $family->name }}</strong> family on FamilyLocker.
            To stop receiving reminder emails, deactivate the individual reminder inside the app.
        </p>
    </div>
</body>
</html>
