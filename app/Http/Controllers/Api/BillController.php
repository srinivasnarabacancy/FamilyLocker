<?php

namespace App\Http\Controllers\Api;

use App\Models\Bill;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BillController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = Bill::where('family_id', $request->user()->family_id)
            ->with('user');

        if ($request->status) {
            $query->where('status', $request->status);
        }
        if ($request->category) {
            $query->where('category', $request->category);
        }

        // Auto-mark overdue bills
        Bill::where('family_id', $request->user()->family_id)
            ->where('status', 'pending')
            ->whereDate('due_date', '<', now())
            ->update(['status' => 'overdue']);

        $bills = $query->orderBy('due_date')->paginate(15);

        return $this->successResponse($bills);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'category' => 'required|string|in:electricity,water,gas,internet,phone,rent,insurance,subscription,other',
            'amount' => 'required|numeric|min:0',
            'due_date' => 'required|date',
            'is_recurring' => 'boolean',
            'recurring_period' => 'nullable|required_if:is_recurring,true|in:monthly,quarterly,yearly',
            'provider' => 'nullable|string|max:255',
            'notes' => 'nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $data = $request->only(['name', 'category', 'amount', 'due_date', 'is_recurring', 'recurring_period', 'provider', 'notes']);
        $data['family_id'] = $request->user()->family_id;
        $data['user_id'] = $request->user()->id;

        $bill = Bill::create($data);

        $this->logActivity(
            $request->user()->id, $request->user()->family_id,
            'bills', 'created', "Added bill: {$bill->name} (₹{$bill->amount})"
        );

        return $this->successResponse($bill->load('user'), 'Bill added', 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $bill = Bill::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->with('user')
            ->first();

        return $bill ? $this->successResponse($bill) : $this->errorResponse('Bill not found', 404);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $bill = Bill::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (!$bill) {
            return $this->errorResponse('Bill not found', 404);
        }

        $bill->update($request->only(['name', 'category', 'amount', 'due_date', 'is_recurring', 'recurring_period', 'provider', 'notes', 'status', 'paid_date']));

        return $this->successResponse($bill->fresh()->load('user'), 'Bill updated');
    }

    public function markPaid(Request $request, int $id): JsonResponse
    {
        $bill = Bill::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (!$bill) {
            return $this->errorResponse('Bill not found', 404);
        }

        $bill->update([
            'status' => 'paid',
            'paid_date' => $request->paid_date ?? now()->toDateString(),
        ]);

        $this->logActivity(
            $request->user()->id, $request->user()->family_id,
            'bills', 'paid', "Marked bill as paid: {$bill->name}"
        );

        // Create next recurring bill
        if ($bill->is_recurring) {
            $nextDueDate = match ($bill->recurring_period) {
                'monthly' => now()->parse($bill->due_date)->addMonth(),
                'quarterly' => now()->parse($bill->due_date)->addMonths(3),
                'yearly' => now()->parse($bill->due_date)->addYear(),
                default => null,
            };

            if ($nextDueDate) {
                Bill::create([
                    'family_id' => $bill->family_id,
                    'user_id' => $bill->user_id,
                    'name' => $bill->name,
                    'category' => $bill->category,
                    'amount' => $bill->amount,
                    'due_date' => $nextDueDate->toDateString(),
                    'is_recurring' => true,
                    'recurring_period' => $bill->recurring_period,
                    'provider' => $bill->provider,
                    'notes' => $bill->notes,
                ]);
            }
        }

        return $this->successResponse($bill->fresh(), 'Bill marked as paid');
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $bill = Bill::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (!$bill) {
            return $this->errorResponse('Bill not found', 404);
        }

        $bill->delete();

        return $this->successResponse(null, 'Bill deleted');
    }

    public function upcomingDue(Request $request): JsonResponse
    {
        $days = $request->days ?? 7;

        $bills = Bill::where('family_id', $request->user()->family_id)
            ->where('status', 'pending')
            ->whereDate('due_date', '>=', now())
            ->whereDate('due_date', '<=', now()->addDays($days))
            ->orderBy('due_date')
            ->get();

        return $this->successResponse($bills);
    }
}
