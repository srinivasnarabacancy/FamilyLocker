<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ActivityLog;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\Request;

class BaseApiController extends Controller
{
    protected function successResponse(mixed $data, string $message = 'Success', int $statusCode = 200): JsonResponse
    {
        return response()->json([
            'success' => true,
            'message' => $message,
            'data' => $data,
        ], $statusCode);
    }

    protected function errorResponse(string $message = 'Error', int $statusCode = 400, mixed $errors = null): JsonResponse
    {
        return response()->json([
            'success' => false,
            'message' => $message,
            'errors' => $errors,
        ], $statusCode);
    }

    protected function logActivity(int $userId, int $familyId, string $module, string $action, string $description, array $meta = []): void
    {
        ActivityLog::create([
            'user_id' => $userId,
            'family_id' => $familyId,
            'module' => $module,
            'action' => $action,
            'description' => $description,
            'meta' => $meta,
        ]);
    }
}
