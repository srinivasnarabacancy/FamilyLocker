<?php

use App\Http\Controllers\Auth\InertiaAuthController;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

$renderPage = static fn (string $component, string $pageTitle, array $props = []) => static fn () => Inertia::render(
    $component,
    array_merge($props, ['pageTitle' => $pageTitle])
);

Route::get('/', static function () {
    if (!auth()->check()) {
        return to_route('login');
    }

    return auth()->user()->hasVerifiedEmail()
        ? to_route('dashboard')
        : to_route('verification.notice');
})->name('home');

Route::middleware('guest')->group(function () use ($renderPage): void {
    Route::get('/login', $renderPage('auth/LoginPage', 'Login'))->name('login');
    Route::post('/login', [InertiaAuthController::class, 'login'])->name('login.store');

    Route::get('/register', $renderPage('auth/RegisterPage', 'Register'))->name('register');
    Route::post('/register', [InertiaAuthController::class, 'register'])->name('register.store');
});

Route::middleware('auth')->group(function () use ($renderPage): void {
    Route::get('/verify-email', static function () {
        return request()->user()?->hasVerifiedEmail()
            ? to_route('dashboard')
            : Inertia::render('auth/VerifyEmailPage', [
                'pageTitle' => 'Verify Email',
            ]);
    })->name('verification.notice');
    Route::post('/email/verification-notification', [InertiaAuthController::class, 'resendVerification'])
        ->middleware('throttle:6,1')
        ->name('verification.send');
    Route::get('/email/verify/{id}/{hash}', [InertiaAuthController::class, 'verifyEmail'])
        ->middleware(['signed', 'throttle:6,1'])
        ->name('verification.verify');
    Route::post('/logout', [InertiaAuthController::class, 'logout'])->name('logout');

    Route::middleware('verified')->prefix('app')->group(function () use ($renderPage): void {
        Route::get('/', static fn () => to_route('dashboard'));
        Route::get('/dashboard', $renderPage('DashboardPage', 'Dashboard'))->name('dashboard');
        Route::get('/documents', $renderPage('DocumentsPage', 'Documents'))->name('documents');
        Route::get('/expenses', $renderPage('ExpensesPage', 'Expenses'))->name('expenses');
        Route::get('/medical', $renderPage('MedicalPage', 'Medical'))->name('medical');
        Route::get('/albums', $renderPage('AlbumsPage', 'Albums'))->name('albums');
        Route::get('/albums/{id}', static fn (int $id) => Inertia::render('AlbumDetailPage', [
            'albumId' => $id,
            'pageTitle' => 'Album',
        ]))->whereNumber('id')->name('album-detail');
        Route::get('/bills', $renderPage('BillsPage', 'Bills'))->name('bills');
        Route::get('/tasks', $renderPage('TasksPage', 'Tasks'))->name('tasks');
        Route::get('/family', $renderPage('FamilyPage', 'Family'))->name('family');
        Route::get('/profile', $renderPage('ProfilePage', 'Profile'))->name('profile');
    });
});
