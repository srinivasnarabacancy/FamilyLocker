<?php

namespace Tests\Feature;

use App\Models\Family;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\Sanctum;
use Tests\TestCase;

class AuthProfileUpdateTest extends TestCase
{
    use RefreshDatabase;

    public function test_avatar_upload_uses_profile_endpoint_and_returns_user_with_family(): void
    {
        Storage::fake('public');

        $family = Family::create([
            'name' => 'Test Family',
            'created_by' => 0,
        ]);

        $user = User::factory()->create([
            'family_id' => $family->id,
            'avatar' => 'avatars/old-avatar.jpg',
        ]);

        $family->update(['created_by' => $user->id]);
        Storage::disk('public')->put($user->avatar, 'old-avatar');

        Sanctum::actingAs($user);

        $response = $this->post('/api/auth/profile', [
            'avatar' => UploadedFile::fake()->image('avatar.jpg'),
        ], [
            'Accept' => 'application/json',
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.family.id', $family->id);

        $newAvatar = $response->json('data.avatar');

        $this->assertNotNull($newAvatar);
        $this->assertNotSame('avatars/old-avatar.jpg', $newAvatar);
        Storage::disk('public')->assertMissing('avatars/old-avatar.jpg');
        Storage::disk('public')->assertExists($newAvatar);
    }

    public function test_avatar_can_be_removed_via_profile_endpoint(): void
    {
        Storage::fake('public');

        $family = Family::create([
            'name' => 'Test Family',
            'created_by' => 0,
        ]);

        $user = User::factory()->create([
            'family_id' => $family->id,
            'avatar' => 'avatars/existing-avatar.jpg',
        ]);

        $family->update(['created_by' => $user->id]);
        Storage::disk('public')->put($user->avatar, 'existing-avatar');

        Sanctum::actingAs($user);

        $response = $this->postJson('/api/auth/profile', [
            'remove_avatar' => true,
        ]);

        $response
            ->assertOk()
            ->assertJsonPath('success', true)
            ->assertJsonPath('data.id', $user->id)
            ->assertJsonPath('data.avatar', null)
            ->assertJsonPath('data.family.id', $family->id);

        Storage::disk('public')->assertMissing('avatars/existing-avatar.jpg');
    }
}
