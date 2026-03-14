<?php

use App\Http\Controllers\Api\AlbumController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\BillController;
use App\Http\Controllers\Api\DashboardController;
use App\Http\Controllers\Api\DocumentController;
use App\Http\Controllers\Api\ExpenseController;
use App\Http\Controllers\Api\FamilyController;
use App\Http\Controllers\Api\MedicalController;
use App\Http\Controllers\Api\TaskController;
use Illuminate\Support\Facades\Route;

// Public routes
Route::prefix('auth')->group(function () {
    Route::post('register', [AuthController::class, 'register']);
    Route::post('login', [AuthController::class, 'login']);
});

// Protected routes
Route::middleware('auth:sanctum')->group(function () {
    // Auth
    Route::prefix('auth')->group(function () {
        Route::post('logout', [AuthController::class, 'logout']);
        Route::get('me', [AuthController::class, 'me']);
        Route::post('resend-verification', [AuthController::class, 'resendVerification'])->middleware('throttle:6,1');
    });

    Route::middleware('verified')->group(function () {
        Route::prefix('auth')->group(function () {
            Route::post('profile', [AuthController::class, 'updateProfile']);
            Route::post('change-password', [AuthController::class, 'changePassword']);
        });

        // Dashboard
        Route::get('dashboard', [DashboardController::class, 'index']);

        // Family
        Route::prefix('family')->group(function () {
            Route::get('/', [FamilyController::class, 'show']);
            Route::match(['post', 'put'], '/', [FamilyController::class, 'update']);
            Route::post('invite', [FamilyController::class, 'inviteMember']);
            Route::get('members', [FamilyController::class, 'members']);
            Route::post('members', [FamilyController::class, 'inviteMember']);
            Route::delete('members/{id}', [FamilyController::class, 'removeMember']);
        });

        // Documents
        Route::prefix('documents')->group(function () {
            Route::get('/', [DocumentController::class, 'index']);
            Route::post('/', [DocumentController::class, 'store']);
            Route::get('expiring', [DocumentController::class, 'expiring']);
            Route::get('{id}', [DocumentController::class, 'show']);
            Route::post('{id}', [DocumentController::class, 'update']);
            Route::delete('{id}', [DocumentController::class, 'destroy']);
        });

        // Expenses
        Route::prefix('expenses')->group(function () {
            Route::get('/', [ExpenseController::class, 'index']);
            Route::post('/', [ExpenseController::class, 'store']);
            Route::get('summary', [ExpenseController::class, 'summary']);
            Route::get('categories', [ExpenseController::class, 'categories']);
            Route::post('categories', [ExpenseController::class, 'storeCategory']);
            Route::delete('categories/{id}', [ExpenseController::class, 'destroyCategory']);
            Route::get('{id}', [ExpenseController::class, 'show']);
            Route::put('{id}', [ExpenseController::class, 'update']);
            Route::delete('{id}', [ExpenseController::class, 'destroy']);
        });

        // Medical
        Route::prefix('medical')->group(function () {
            Route::get('records', [MedicalController::class, 'records']);
            Route::post('records', [MedicalController::class, 'storeRecord']);
            Route::get('records/{id}', [MedicalController::class, 'showRecord']);
            Route::post('records/{id}', [MedicalController::class, 'updateRecord']);
            Route::delete('records/{id}', [MedicalController::class, 'destroyRecord']);

            Route::get('medicines', [MedicalController::class, 'medicines']);
            Route::post('medicines', [MedicalController::class, 'storeMedicine']);
            Route::put('medicines/{id}', [MedicalController::class, 'updateMedicine']);
            Route::delete('medicines/{id}', [MedicalController::class, 'destroyMedicine']);

            Route::get('appointments', [MedicalController::class, 'appointments']);
            Route::post('appointments', [MedicalController::class, 'storeAppointment']);
            Route::put('appointments/{id}', [MedicalController::class, 'updateAppointment']);
            Route::delete('appointments/{id}', [MedicalController::class, 'destroyAppointment']);
        });

        // Albums
        Route::prefix('albums')->group(function () {
            Route::get('/', [AlbumController::class, 'index']);
            Route::post('/', [AlbumController::class, 'store']);
            Route::get('{id}', [AlbumController::class, 'show']);
            Route::put('{id}', [AlbumController::class, 'update']);
            Route::delete('{id}', [AlbumController::class, 'destroy']);
            Route::post('{id}/photos', [AlbumController::class, 'uploadPhotos']);
            Route::delete('photos/{photoId}', [AlbumController::class, 'deletePhoto']);
            Route::post('{albumId}/cover/{photoId}', [AlbumController::class, 'setCover']);
        });

        // Bills
        Route::prefix('bills')->group(function () {
            Route::get('/', [BillController::class, 'index']);
            Route::post('/', [BillController::class, 'store']);
            Route::get('upcoming-due', [BillController::class, 'upcomingDue']);
            Route::get('{id}', [BillController::class, 'show']);
            Route::put('{id}', [BillController::class, 'update']);
            Route::post('{id}/mark-paid', [BillController::class, 'markPaid']);
            Route::delete('{id}', [BillController::class, 'destroy']);
        });

        // Tasks
        Route::prefix('tasks')->group(function () {
            Route::get('/', [TaskController::class, 'index']);
            Route::post('/', [TaskController::class, 'store']);
            Route::get('{id}', [TaskController::class, 'show']);
            Route::put('{id}', [TaskController::class, 'update']);
            Route::patch('{id}/status', [TaskController::class, 'updateStatus']);
            Route::delete('{id}', [TaskController::class, 'destroy']);
        });
    });
});
