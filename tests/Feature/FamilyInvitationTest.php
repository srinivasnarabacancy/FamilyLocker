<?php

namespace Tests\Feature;

use App\Mail\FamilyMemberInvitationMail;
use App\Models\Family;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Mail;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FamilyInvitationTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_invite_member_by_email_and_store_mobile_number(): void
    {
        Mail::fake();

        [$family, $owner] = $this->createFamilyWithOwner();

        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/family/members', [
            'name' => 'Priya Sharma',
            'email' => 'priya@example.com',
            'phone' => '+91 98765 43210',
            'relation' => 'Sister',
            'role' => User::ROLE_CAREGIVER,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.family_id', $family->id)
            ->assertJsonPath('data.role', User::ROLE_CAREGIVER)
            ->assertJsonPath('data.phone', '+91 98765 43210')
            ->assertJsonPath('message', 'Invitation email sent successfully');

        $member = User::where('email', 'priya@example.com')->firstOrFail();

        $this->assertDatabaseHas('users', [
            'email' => 'priya@example.com',
            'family_id' => $family->id,
            'role' => User::ROLE_CAREGIVER,
            'phone' => '+91 98765 43210',
        ]);

        Mail::assertSent(FamilyMemberInvitationMail::class, function (FamilyMemberInvitationMail $mail) use ($member, $family, $owner) {
            return $mail->hasTo($member->email)
                && $mail->member->is($member)
                && $mail->family->is($family)
                && $mail->inviter->is($owner)
                && $mail->temporaryPassword !== '';
        });
    }

    public function test_owner_can_invite_member_by_email_without_mobile_number(): void
    {
        Mail::fake();

        [$family, $owner] = $this->createFamilyWithOwner();

        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/family/members', [
            'name' => 'Amit Sharma',
            'email' => 'amit@example.com',
            'relation' => 'Brother',
            'role' => User::ROLE_VIEWER,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.family_id', $family->id)
            ->assertJsonPath('data.role', User::ROLE_VIEWER)
            ->assertJsonPath('data.phone', null)
            ->assertJsonPath('message', 'Invitation email sent successfully');

        $member = User::where('email', 'amit@example.com')->firstOrFail();

        $this->assertDatabaseHas('users', [
            'email' => 'amit@example.com',
            'family_id' => $family->id,
            'role' => User::ROLE_VIEWER,
            'phone' => null,
        ]);

        Mail::assertSent(FamilyMemberInvitationMail::class, function (FamilyMemberInvitationMail $mail) use ($member) {
            return $mail->hasTo($member->email)
                && $mail->member->is($member)
                && $mail->temporaryPassword !== '';
        });
    }

    public function test_owner_can_add_member_with_mobile_number_only(): void
    {
        Mail::fake();

        [$family, $owner] = $this->createFamilyWithOwner();

        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/family/members', [
            'name' => 'Neha Sharma',
            'phone' => '+91 99887 77665',
            'relation' => 'Daughter',
            'role' => User::ROLE_MEMBER,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.family_id', $family->id)
            ->assertJsonPath('data.email', null)
            ->assertJsonPath('data.phone', '+91 99887 77665')
            ->assertJsonPath('message', 'Family member added successfully. No invitation email was sent.');

        $this->assertDatabaseHas('users', [
            'name' => 'Neha Sharma',
            'family_id' => $family->id,
            'email' => null,
            'phone' => '+91 99887 77665',
        ]);

        Mail::assertNothingSent();
    }

    public function test_owner_must_provide_either_email_or_mobile_number(): void
    {
        Mail::fake();

        [, $owner] = $this->createFamilyWithOwner();

        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/family/members', [
            'name' => 'Rahul Sharma',
            'relation' => 'Brother',
            'role' => User::ROLE_VIEWER,
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath('success', false);
    }

    private function createFamilyWithOwner(): array
    {
        $family = Family::create([
            'name' => 'Test Family',
            'created_by' => 0,
        ]);

        $owner = User::factory()->create([
            'family_id' => $family->id,
            'role' => User::ROLE_OWNER,
        ]);

        $family->update(['created_by' => $owner->id]);

        return [$family, $owner];
    }
}
