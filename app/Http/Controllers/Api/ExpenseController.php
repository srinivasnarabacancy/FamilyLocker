<?php

namespace App\Http\Controllers\Api;

use App\Models\Expense;
use App\Models\ExpenseCategory;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class ExpenseController extends BaseApiController
{
    public function index(Request $request): JsonResponse
    {
        $query = Expense::where('family_id', $request->user()->family_id)
            ->with(['user', 'category']);

        if ($request->category_id) {
            $query->where('category_id', $request->category_id);
        }
        if ($request->month) {
            $query->whereMonth('date', date('m', strtotime($request->month)))
                  ->whereYear('date', date('Y', strtotime($request->month)));
        }
        if ($request->from_date) {
            $query->whereDate('date', '>=', $request->from_date);
        }
        if ($request->to_date) {
            $query->whereDate('date', '<=', $request->to_date);
        }

        $expenses = $query->orderBy('date', 'desc')->paginate(20);

        return $this->successResponse($expenses);
    }

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title' => 'required|string|max:255',
            'amount' => 'required|numeric|min:0',
            'date' => 'required|date',
            'category_id' => 'nullable|exists:expense_categories,id',
            'description' => 'nullable|string',
            'payment_method' => 'sometimes|in:cash,card,upi,net_banking',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $data = $request->only(['title', 'amount', 'date', 'category_id', 'description', 'payment_method']);
        $data['family_id'] = $request->user()->family_id;
        $data['user_id'] = $request->user()->id;

        $expense = Expense::create($data);

        $this->logActivity(
            $request->user()->id, $request->user()->family_id,
            'expenses', 'created', "Added expense: {$expense->title} (₹{$expense->amount})"
        );

        return $this->successResponse($expense->load(['user', 'category']), 'Expense added successfully', 201);
    }

    public function show(Request $request, int $id): JsonResponse
    {
        $expense = Expense::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->with(['user', 'category'])
            ->first();

        return $expense
            ? $this->successResponse($expense)
            : $this->errorResponse('Expense not found', 404);
    }

    public function update(Request $request, int $id): JsonResponse
    {
        $expense = Expense::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (!$expense) {
            return $this->errorResponse('Expense not found', 404);
        }

        $validator = Validator::make($request->all(), [
            'title' => 'sometimes|string|max:255',
            'amount' => 'sometimes|numeric|min:0',
            'date' => 'sometimes|date',
            'category_id' => 'nullable|exists:expense_categories,id',
            'description' => 'nullable|string',
            'payment_method' => 'sometimes|in:cash,card,upi,net_banking',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $expense->update($request->only(['title', 'amount', 'date', 'category_id', 'description', 'payment_method']));

        return $this->successResponse($expense->fresh()->load(['user', 'category']), 'Expense updated successfully');
    }

    public function destroy(Request $request, int $id): JsonResponse
    {
        $expense = Expense::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (!$expense) {
            return $this->errorResponse('Expense not found', 404);
        }

        $expense->delete();

        return $this->successResponse(null, 'Expense deleted successfully');
    }

    public function summary(Request $request): JsonResponse
    {
        $familyId = $request->user()->family_id;
        $month = $request->month ?? now()->format('Y-m');
        $year = substr($month, 0, 4);
        $monthNum = substr($month, 5, 2);

        $totalMonthly = Expense::where('family_id', $familyId)
            ->whereMonth('date', $monthNum)
            ->whereYear('date', $year)
            ->sum('amount');

        $categoryBreakdown = Expense::where('family_id', $familyId)
            ->whereMonth('date', $monthNum)
            ->whereYear('date', $year)
            ->with('category')
            ->selectRaw('category_id, SUM(amount) as total, COUNT(*) as count')
            ->groupBy('category_id')
            ->get();

        $monthlyTrend = Expense::where('family_id', $familyId)
            ->selectRaw('EXTRACT(YEAR FROM "date") as year, EXTRACT(MONTH FROM "date") as month, SUM(amount) as total')
            ->groupByRaw('EXTRACT(YEAR FROM "date"), EXTRACT(MONTH FROM "date")')
            ->orderByRaw('EXTRACT(YEAR FROM "date") DESC, EXTRACT(MONTH FROM "date") DESC')
            ->limit(12)
            ->get();

        return $this->successResponse([
            'total_monthly' => $totalMonthly,
            'category_breakdown' => $categoryBreakdown,
            'monthly_trend' => $monthlyTrend,
        ]);
    }

    // Categories
    public function categories(Request $request): JsonResponse
    {
        $categories = ExpenseCategory::where('family_id', $request->user()->family_id)->get();

        return $this->successResponse($categories);
    }

    public function storeCategory(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:100',
            'icon' => 'nullable|string|max:50',
            'color' => 'nullable|string|max:20',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $category = ExpenseCategory::create([
            ...$request->only(['name', 'icon', 'color']),
            'family_id' => $request->user()->family_id,
        ]);

        return $this->successResponse($category, 'Category created', 201);
    }

    public function destroyCategory(Request $request, int $id): JsonResponse
    {
        $category = ExpenseCategory::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (!$category) {
            return $this->errorResponse('Category not found', 404);
        }

        $category->delete();

        return $this->successResponse(null, 'Category deleted');
    }
}
