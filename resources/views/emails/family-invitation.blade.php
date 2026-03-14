<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FamilyLocker Invitation</title>
</head>
<body style="margin:0;padding:24px;background-color:#f4f6fb;font-family:Arial,sans-serif;color:#1f2937;">
    <div style="max-width:640px;margin:0 auto;background:#ffffff;border-radius:16px;padding:32px;box-shadow:0 12px 30px rgba(15,23,42,0.08);">
        <p style="margin:0 0 12px;font-size:14px;letter-spacing:0.08em;text-transform:uppercase;color:#6c5ce7;">FamilyLocker</p>
        <h1 style="margin:0 0 16px;font-size:28px;line-height:1.2;">You're invited to join {{ $family->name }}</h1>
        <p style="margin:0 0 16px;font-size:16px;line-height:1.6;">
            Hi {{ $member->name }}, {{ $inviter->name }} has added you to the <strong>{{ $family->name }}</strong> family group on FamilyLocker.
        </p>
        <p style="margin:0 0 24px;font-size:16px;line-height:1.6;">
            Your account is ready. Use these temporary credentials to sign in and update your password after your first login.
        </p>
        <p style="margin:0 0 24px;font-size:15px;line-height:1.6;color:#4b5563;">
            For security, you will also need to verify this email address before FamilyLocker lets you into the app.
        </p>

        <div style="margin:0 0 24px;padding:20px;border-radius:12px;background:#f8f7ff;border:1px solid #e4defc;">
            <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">Email</p>
            <p style="margin:0 0 16px;font-size:16px;font-weight:700;">{{ $member->email }}</p>
            <p style="margin:0 0 8px;font-size:14px;color:#6b7280;">Temporary Password</p>
            <p style="margin:0;font-size:16px;font-weight:700;letter-spacing:0.04em;">{{ $temporaryPassword }}</p>
        </div>

        <p style="margin:0 0 24px;">
            <a href="{{ $loginUrl }}" style="display:inline-block;padding:12px 20px;border-radius:999px;background:#6c5ce7;color:#ffffff;text-decoration:none;font-weight:700;">Open FamilyLocker</a>
        </p>

        <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#6b7280;">
            Role: {{ \App\Models\User::roleLabel($member->role) }}
        </p>
        @if ($member->phone)
            <p style="margin:0 0 8px;font-size:14px;line-height:1.6;color:#6b7280;">
                Mobile: {{ $member->phone }}
            </p>
        @endif
        @if ($member->relation)
            <p style="margin:0 0 24px;font-size:14px;line-height:1.6;color:#6b7280;">
                Relation: {{ $member->relation }}
            </p>
        @endif

        <p style="margin:0;font-size:13px;line-height:1.6;color:#9ca3af;">
            If you were not expecting this invitation, you can ignore this email.
        </p>
    </div>
</body>
</html>
