<?php

namespace App\Http\Controllers\Api;

use App\Mail\ReminderCreatedMail;
use App\Models\Family;
use App\Models\Reminder;
use Carbon\Carbon;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Facades\Validator;

class ReminderController extends BaseApiController
{
    // ─── List all reminders ───────────────────────────────────────────────────

    public function index(Request $request): JsonResponse
    {
        $query = Reminder::where('family_id', $request->user()->family_id)
            ->with('creator');

        if ($request->filled('type')) {
            $query->where('type', $request->type);
        }

        if ($request->filled('is_active')) {
            $query->where('is_active', filter_var($request->is_active, FILTER_VALIDATE_BOOLEAN));
        }

        $reminders = $query->orderBy('occasion_date')->get();

        // Sort by next occurrence so the soonest appears first
        $sorted = $reminders->sortBy('days_until')->values();

        return $this->successResponse($sorted);
    }

    // ─── Upcoming reminders ───────────────────────────────────────────────────

    /**
     * Returns reminders whose next occurrence falls within the next $days days
     * (or those that should already be reminding, i.e. days_until <= remind_days_before).
     */
    public function upcoming(Request $request): JsonResponse
    {
        $days = (int) $request->get('days', 30);

        $reminders = Reminder::where('family_id', $request->user()->family_id)
            ->where('is_active', true)
            ->with('creator')
            ->get()
            ->filter(function (Reminder $r) use ($days) {
                $daysUntil = $r->days_until;
                return $daysUntil !== null && $daysUntil >= 0 && $daysUntil <= $days;
            })
            ->sortBy('days_until')
            ->values();

        return $this->successResponse($reminders);
    }

    // ─── Create ───────────────────────────────────────────────────────────────

    public function store(Request $request): JsonResponse
    {
        $validator = Validator::make($request->all(), [
            'title'              => 'required|string|max:255',
            'type'               => 'sometimes|in:birthday,anniversary,holiday,other',
            'occasion_date'      => 'required|date',
            'recurs_yearly'      => 'sometimes|boolean',
            'remind_days_before' => 'sometimes|integer|min:0|max:365',
            'description'        => 'nullable|string',
            'is_active'          => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $reminder = Reminder::create([
            ...$request->only([
                'title', 'type', 'occasion_date', 'recurs_yearly',
                'remind_days_before', 'description', 'is_active',
            ]),
            'family_id'  => $request->user()->family_id,
            'created_by' => $request->user()->id,
        ]);

        $this->logActivity(
            $request->user()->id,
            $request->user()->family_id,
            'reminders',
            'created',
            "Created reminder: {$reminder->title}"
        );

        $this->notifyFamilyReminderCreated($reminder, $request->user());

        return $this->successResponse($reminder->load('creator'), 'Reminder created', 201);
    }

    // ─── Show ─────────────────────────────────────────────────────────────────

    public function show(Request $request, int $id): JsonResponse
    {
        $reminder = Reminder::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->with('creator')
            ->first();

        return $reminder
            ? $this->successResponse($reminder)
            : $this->errorResponse('Reminder not found', 404);
    }

    // ─── Update ───────────────────────────────────────────────────────────────

    public function update(Request $request, int $id): JsonResponse
    {
        $reminder = Reminder::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (!$reminder) {
            return $this->errorResponse('Reminder not found', 404);
        }

        $validator = Validator::make($request->all(), [
            'title'              => 'sometimes|string|max:255',
            'type'               => 'sometimes|in:birthday,anniversary,holiday,other',
            'occasion_date'      => 'sometimes|date',
            'recurs_yearly'      => 'sometimes|boolean',
            'remind_days_before' => 'sometimes|integer|min:0|max:365',
            'description'        => 'nullable|string',
            'is_active'          => 'sometimes|boolean',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $reminder->update($request->only([
            'title', 'type', 'occasion_date', 'recurs_yearly',
            'remind_days_before', 'description', 'is_active',
        ]));

        $this->logActivity(
            $request->user()->id,
            $request->user()->family_id,
            'reminders',
            'updated',
            "Updated reminder: {$reminder->title}"
        );

        return $this->successResponse($reminder->fresh()->load('creator'), 'Reminder updated');
    }

    // ─── Delete ───────────────────────────────────────────────────────────────

    public function destroy(Request $request, int $id): JsonResponse
    {
        $reminder = Reminder::where('id', $id)
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (!$reminder) {
            return $this->errorResponse('Reminder not found', 404);
        }

        $title = $reminder->title;
        $reminder->delete();

        $this->logActivity(
            $request->user()->id,
            $request->user()->family_id,
            'reminders',
            'deleted',
            "Deleted reminder: {$title}"
        );

        return $this->successResponse(null, 'Reminder deleted');
    }

    private function notifyFamilyReminderCreated(Reminder $reminder, $creator): void
    {
        $family  = Family::with('members')->find($reminder->family_id);
        $members = $family->members->filter(fn ($m) => $m->email && $m->hasVerifiedEmail());

        foreach ($members as $member) {
            Mail::to($member->email)->queue(
                new ReminderCreatedMail($member, $creator, $family, $reminder)
            );
        }
    }
}
