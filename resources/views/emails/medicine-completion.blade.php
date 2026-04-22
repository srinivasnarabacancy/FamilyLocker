<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Medicine Course Completed</title>
</head>
<body style="margin:0;padding:24px;background-color:#f4f6fb;font-family:Arial,sans-serif;color:#1f2937;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 12px 30px rgba(15,23,42,0.08);">

        {{-- Header --}}
        <p style="margin:0 0 12px;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:#6c5ce7;">FamilyLocker</p>
        <h1 style="margin:0 0 8px;font-size:26px;line-height:1.2;">
            @if ($medicines->count() === 1)
                Medicine Course Completed
            @else
                {{ $medicines->count() }} Medicine Courses Completed
            @endif
        </h1>
        <p style="margin:0 0 24px;font-size:16px;color:#6b7280;">
            Hi {{ $recipient->name }}, the following medicine course(s) for <strong>{{ $family->name }}</strong> have ended today.
        </p>

        {{-- Medicine cards --}}
        @foreach ($medicines as $medicine)
            @php
                $startDate = $medicine->start_date ? \Carbon\Carbon::parse($medicine->start_date)->format('F j, Y') : null;
                $endDate   = $medicine->end_date   ? \Carbon\Carbon::parse($medicine->end_date)->format('F j, Y')   : null;
            @endphp

            <div style="margin-bottom:16px;padding:20px;border-radius:12px;background:#f0fdf4;border:1px solid #86efac;">
                <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:8px;">
                    <span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:11px;font-weight:700;letter-spacing:0.05em;text-transform:uppercase;background:#dcfce7;color:#15803d;">
                        Completed
                    </span>
                    <span style="font-size:12px;color:#6b7280;">{{ $medicine->member_name }}</span>
                </div>

                <h2 style="margin:0 0 4px;font-size:18px;line-height:1.3;color:#111827;">{{ $medicine->name }}</h2>

                @if ($medicine->dosage || $medicine->frequency)
                    <p style="margin:0 0 4px;font-size:14px;color:#6b7280;">
                        @if ($medicine->dosage) {{ $medicine->dosage }} @endif
                        @if ($medicine->dosage && $medicine->frequency) &nbsp;·&nbsp; @endif
                        @if ($medicine->frequency) {{ $medicine->frequency }} @endif
                    </p>
                @endif

                @if ($startDate || $endDate)
                    <p style="margin:0 0 8px;font-size:13px;color:#9ca3af;">
                        @if ($startDate) {{ $startDate }} @endif
                        @if ($startDate && $endDate) → @endif
                        @if ($endDate) {{ $endDate }} @endif
                    </p>
                @endif

                @if ($medicine->notes)
                    <p style="margin:0;font-size:14px;line-height:1.6;color:#374151;">{{ $medicine->notes }}</p>
                @endif
            </div>
        @endforeach

        {{-- CTA --}}
        <p style="margin:24px 0 0;">
            <a href="{{ config('app.url') }}/app/medical"
               style="display:inline-block;padding:12px 24px;border-radius:999px;background:#6c5ce7;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;">
                View Medical Records
            </a>
        </p>

        <hr style="margin:28px 0;border:none;border-top:1px solid #e5e7eb;">
        <p style="margin:0;font-size:13px;line-height:1.6;color:#9ca3af;">
            You received this email because you are a member of the <strong>{{ $family->name }}</strong> family on FamilyLocker.
        </p>
    </div>
</body>
</html>
