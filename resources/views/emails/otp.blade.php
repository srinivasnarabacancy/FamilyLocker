<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <title>Your FamilyLocker Verification Code</title>
    <style>
        body { font-family: Arial, sans-serif; background: #f4f6fb; margin: 0; padding: 0; }
        .container { max-width: 480px; margin: 40px auto; background: #fff; border-radius: 16px; padding: 40px; box-shadow: 0 2px 16px rgba(108,92,231,.10); }
        .logo { font-size: 2rem; text-align: center; margin-bottom: 8px; }
        h2 { text-align: center; color: #6c5ce7; margin: 0 0 6px; }
        p { color: #5f6780; font-size: 0.97rem; line-height: 1.6; text-align: center; }
        .otp-box { background: #f0edff; border: 2px dashed #6c5ce7; border-radius: 14px; text-align: center; padding: 22px 0; margin: 28px 0; }
        .otp-code { font-size: 2.6rem; font-weight: 700; letter-spacing: 12px; color: #6c5ce7; }
        .expiry { font-size: 0.85rem; color: #999; margin-top: 6px; }
        .footer { font-size: 0.8rem; color: #bbb; text-align: center; margin-top: 28px; }
    </style>
</head>
<body>
    <div class="container">
        <div class="logo">🏠</div>
        <h2>FamilyLocker</h2>
        <p>Hi <strong>{{ $userName }}</strong>, use the code below to verify your email address.</p>

        <div class="otp-box">
            <div class="otp-code">{{ $otp }}</div>
            <div class="expiry">This code expires in 10 minutes.</div>
        </div>

        <p>Enter this 6-digit code on the verification screen. Do not share this code with anyone.</p>

        <div class="footer">If you did not create a FamilyLocker account, you can safely ignore this email.</div>
    </div>
</body>
</html>
