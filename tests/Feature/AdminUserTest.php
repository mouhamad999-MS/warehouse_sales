<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class AdminUserTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'warehouse_manager', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'sales_officer', 'guard_name' => 'web']);

        $this->admin = User::factory()->create(['is_active' => true]);
        $this->admin->assignRole('admin');
        $this->token = $this->admin->createToken('test')->plainTextToken;
    }

    public function test_admin_can_list_users(): void
    {
        User::factory()->count(3)->create();

        $this->withToken($this->token)->getJson('/api/admin/users')
             ->assertStatus(200)
             ->assertJsonStructure(['data']);
    }

    public function test_admin_can_create_user(): void
    {
        $response = $this->withToken($this->token)->postJson('/api/admin/users', [
            'name' => 'New User',
            'email' => 'new@example.com',
            'password' => 'Password1',
            'role' => 'warehouse_manager',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('users', ['email' => 'new@example.com']);
    }

    public function test_admin_can_deactivate_user(): void
    {
        $user = User::factory()->create(['is_active' => true]);

        $this->withToken($this->token)
             ->patchJson("/api/admin/users/{$user->id}/toggle-active")
             ->assertStatus(200);

        $this->assertDatabaseHas('users', ['id' => $user->id, 'is_active' => false]);
    }

    public function test_admin_can_reset_user_password(): void
    {
        $user = User::factory()->create(['is_active' => true]);

        $this->withToken($this->token)
             ->patchJson("/api/admin/users/{$user->id}/reset-password", [
                 'password' => 'NewPass123',
             ])
             ->assertStatus(200);
    }

    public function test_non_admin_cannot_access_users(): void
    {
        $sales = User::factory()->create(['is_active' => true]);
        $sales->assignRole('sales_officer');
        $token = $sales->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/admin/users')
             ->assertStatus(403);
    }
}
