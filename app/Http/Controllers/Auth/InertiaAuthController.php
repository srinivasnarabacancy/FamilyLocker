<?php

namespace App\Http\Controllers\Auth;

use App\Http\Controllers\Controller;
use App\Models\Family;
use App\Models\User;
use Illuminate\Foundation\Auth\EmailVerificationRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;
use Throwable;

class InertiaAuthController extends Controller
{
    public function login(Request $request): RedirectResponse
    {
        $credentials = $request->validate([
            'email' => ['required', 'email'],
            'password' => ['required', 'string'],
        ]);

        if (!Auth::attempt($credentials)) {
            throw ValidationException::withMessages([
                'email' => 'Invalid credentials.',
            ]);
        }

        $request->session()->regenerate();

        if (!$request->user()?->hasVerifiedEmail()) {
            return redirect()->intended(route('verification.notice'))
                ->with('error', 'Please verify your email address to continue.');
        }

        return redirect()->intended(route('dashboard'));
    }

    public function register(Request $request): RedirectResponse
    {
        $validated = $request->validate([
            'name' => ['required', 'string', 'max:255'],
            'family_name' => ['required', 'string', 'max:255'],
            'email' => ['required', 'email', 'unique:users,email'],
            'password' => ['required', 'string', 'min:8', 'confirmed'],
        ]);

        $user = DB::transaction(function () use ($validated) {
            $family = Family::create([
                'name' => $validated['family_name'],
                'created_by' => 0,
            ]);

            $user = User::create([
                'name' => $validated['name'],
                'email' => $validated['email'],
                'password' => Hash::make($validated['password']),
                'family_id' => $family->id,
                'role' => User::ROLE_OWNER,
            ]);

            $family->update(['created_by' => $user->id]);

            return $user;
        });

        Auth::login($user);
        $request->session()->regenerate();

        try {
            $this->sendVerificationEmail($user);

            return to_route('verification.notice')
                ->with('success', 'Account created. Check your email for a verification link before continuing.');
        } catch (Throwable $e) {
            report($e);

            return to_route('verification.notice')
                ->with('error', 'Account created, but we could not send the verification email. Please request a new one.');
        }
    }

    public function logout(Request $request): RedirectResponse
    {
        Auth::guard('web')->logout();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return to_route('login')->with('success', 'Logged out successfully.');
    }

    public function resendVerification(Request $request): RedirectResponse
    {
        $user = $request->user();

        if ($user?->hasVerifiedEmail()) {
            return to_route('dashboard')->with('success', 'Your email address is already verified.');
        }

        try {
            $this->sendVerificationEmail($user);

            return back()->with('success', 'A fresh verification link has been sent to your email address.');
        } catch (Throwable $e) {
            report($e);

            return back()->with('error', 'We could not send the verification email right now. Please try again in a moment.');
        }
    }

    public function verifyEmail(EmailVerificationRequest $request): RedirectResponse
    {
        if (!$request->user()?->hasVerifiedEmail()) {
            $request->fulfill();
        }

        return to_route('dashboard')->with('success', 'Email verified successfully.');
    }

    private function sendVerificationEmail(?User $user): void
    {
        if (!$user || blank($user->email) || $user->hasVerifiedEmail()) {
            return;
        }

        $user->sendEmailVerificationNotification();
    }
}
