<?php

namespace Tests\Feature;

use App\Models\Family;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class FamilyMemberRolesTest extends TestCase
{
    use RefreshDatabase;

    public function test_owner_can_create_member_with_extended_role_options(): void
    {
        [$family, $owner] = $this->createFamilyWithOwner();

        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/family/members', [
            'name' => 'Priya Sharma',
            'email' => 'priya@example.com',
            'relation' => 'Sister',
            'role' => User::ROLE_CAREGIVER,
        ]);

        $response
            ->assertCreated()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.family_id', $family->id)
            ->assertJsonPath('data.role', User::ROLE_CAREGIVER);

        $this->assertDatabaseHas('users', [
            'email' => 'priya@example.com',
            'family_id' => $family->id,
            'role' => User::ROLE_CAREGIVER,
        ]);
    }

    public function test_owner_role_cannot_be_assigned_when_inviting_member(): void
    {
        [, $owner] = $this->createFamilyWithOwner();

        Sanctum::actingAs($owner);

        $response = $this->postJson('/api/family/members', [
            'name' => 'Amit Sharma',
            'email' => 'amit@example.com',
            'relation' => 'Brother',
            'role' => User::ROLE_OWNER,
        ]);

        $response
            ->assertStatus(422)
            ->assertJsonPath('success', false);

        $this->assertDatabaseMissing('users', [
            'email' => 'amit@example.com',
        ]);
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
