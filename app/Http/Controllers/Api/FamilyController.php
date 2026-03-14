<?php

namespace App\Http\Controllers\Api;

use App\Mail\FamilyMemberInvitationMail;
use App\Models\Family;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Support\Str;
use Illuminate\Support\Facades\Validator;
use Illuminate\Validation\Rule;
use Throwable;

class FamilyController extends BaseApiController
{
    private function ensureCanManageFamily(Request $request): ?JsonResponse
    {
        if (!$request->user()->canManageFamily()) {
            return $this->errorResponse('Only owners and admins can manage family members', 403);
        }

        return null;
    }

    public function show(Request $request): JsonResponse
    {
        $family = $request->user()->family()->with('members')->first();

        if (!$family) {
            return $this->errorResponse('Family not found', 404);
        }

        return $this->successResponse($family);
    }

    public function update(Request $request): JsonResponse
    {
        if ($response = $this->ensureCanManageFamily($request)) {
            return $response;
        }

        $validator = Validator::make($request->all(), [
            'name' => 'sometimes|string|max:255',
            'description' => 'sometimes|nullable|string',
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $family = $request->user()->family;

        if ($request->hasFile('avatar')) {
            $path = $request->file('avatar')->store('family-avatars', 'public');
            $family->avatar = $path;
        }

        $family->update($request->only(['name', 'description']));

        return $this->successResponse($family->fresh(), 'Family updated successfully');
    }

    public function members(Request $request): JsonResponse
    {
        $members = User::where('family_id', $request->user()->family_id)->get();

        return $this->successResponse($members);
    }

    public function inviteMember(Request $request): JsonResponse
    {
        if ($response = $this->ensureCanManageFamily($request)) {
            return $response;
        }

        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'email' => 'nullable|required_without:phone|email|unique:users,email',
            'phone' => 'nullable|required_without:email|string|max:20',
            'relation' => 'required|string|max:50',
            'role' => ['sometimes', Rule::in(User::invitableRoles())],
        ]);

        if ($validator->fails()) {
            return $this->errorResponse('Validation failed', 422, $validator->errors());
        }

        $inviter = $request->user();
        $temporaryPassword = Str::random(12);
        $emailProvided = $request->filled('email');

        DB::beginTransaction();

        try {
            $user = User::create([
                'name' => $request->name,
                'email' => $emailProvided ? $request->email : null,
                'password' => Hash::make($temporaryPassword),
                'family_id' => $inviter->family_id,
                'role' => $request->role ?? User::ROLE_MEMBER,
                'relation' => $request->relation,
                'phone' => $request->filled('phone') ? $request->phone : null,
            ]);

            if ($emailProvided) {
                Mail::to($user->email)->send(new FamilyMemberInvitationMail(
                    member: $user,
                    family: $inviter->family,
                    inviter: $inviter,
                    temporaryPassword: $temporaryPassword,
                    loginUrl: url('/login'),
                ));
            }

            DB::commit();
        } catch (Throwable $e) {
            DB::rollBack();
            report($e);

            return $this->errorResponse($emailProvided ? 'Failed to send invitation email' : 'Failed to add family member', 500);
        }

        return $this->successResponse(
            $user,
            $emailProvided
                ? 'Invitation email sent successfully'
                : 'Family member added successfully. No invitation email was sent.',
            201
        );
    }

    public function removeMember(Request $request, int $memberId): JsonResponse
    {
        if ($response = $this->ensureCanManageFamily($request)) {
            return $response;
        }

        $member = User::where('id', $memberId)
            ->where('family_id', $request->user()->family_id)
            ->first();

        if (!$member) {
            return $this->errorResponse('Member not found', 404);
        }

        if ($member->role === User::ROLE_OWNER) {
            return $this->errorResponse('Cannot remove family owner', 403);
        }

        $member->delete();

        return $this->successResponse(null, 'Member removed successfully');
    }
}
