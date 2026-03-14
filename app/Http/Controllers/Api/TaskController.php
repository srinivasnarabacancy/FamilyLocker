<?php

namespace App\Http\Controllers\Api;

use App\Models\Task;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class TaskController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = Task::where('family_id', $request->user()->family_id)
            ->with(['creator', 'assignee']);

        if ($request->status) {
            $query->where('status', $request->status);
        }
        if ($request->priority) {
            $query->where('priority', $request->priority);
        }
        if ($request->assigned_to) {
            $query->where('assigned_to', $request->assigned_to);
        }
        if ($request->my_tasks) {
            $query->where(function ($q) use ($request) {
                $q->where('assigned_to', $request->user()->id)
                  ->orWhere('created_by', $request->user()->id);
            });
        }

        return $this->successResponse($query->orderBy('due_date')->orderByRaw("FIELD(priority,'urgent','high','medium','low')")->paginate(20));
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'due_date' => 'nullable|date',
            'priority' => 'sometimes|in:low,medium,high,urgent',
            'assigned_to' => 'nullable|exists:users,id',
            'category' => 'nullable|string|max:100',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $task = Task::create([
            ...$request->only(['title', 'description', 'due_date', 'priority', 'assigned_to', 'category']),
            'family_id' => $request->user()->family_id,
            'created_by' => $request->user()->id,
        ]);

        $this->logActivity(
            $request->user()->id, $request->user()->family_id,
            'tasks', 'created', "Created task: {$task->title}"
        );

        return $this->successResponse($task->load(['creator', 'assignee']), 'Task created', 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $task = Task::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->with(['creator', 'assignee'])
            ->first();

        return $task ? $this->successResponse($task) : $this->errorResponse('Task not found', 404);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $task = Task::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (!$task) {
            return $this->errorResponse('Task not found', 404);
        }

        $data = $request->only(['title', 'description', 'due_date', 'priority', 'assigned_to', 'category', 'status']);

        if (isset($data['status']) && $data['status'] === 'completed' && $task->status !== 'completed') {
            $data['completed_at'] = now();
        }

        $task->update($data);

        $this->logActivity(
            $request->user()->id, $request->user()->family_id,
            'tasks', 'updated', "Updated task: {$task->title}"
        );

        return $this->successResponse($task->fresh()->load(['creator', 'assignee']), 'Task updated');
    }

    public function updateStatus(Request $request, int $id): JsonResponse
    {
        $task = Task::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (!$task) {
            return $this->errorResponse('Task not found', 404);
        }

        $validator = Validator::make($request->all(), [
            'status' => 'required|in:pending,in_progress,completed,cancelled',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $data = ['status' => $request->status];

        if ($request->status === 'completed') {
            $data['completed_at'] = now();
        }

        $task->update($data);

        return $this->successResponse($task->fresh(), 'Task status updated');
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $task = Task::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (!$task) {
            return $this->errorResponse('Task not found', 404);
        }

        $task->delete();

        return $this->successResponse(null, 'Task deleted');
    }
}
