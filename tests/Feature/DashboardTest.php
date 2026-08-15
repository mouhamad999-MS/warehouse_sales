<?php

namespace Tests\Feature;

use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class DashboardTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'warehouse_manager', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'sales_officer', 'guard_name' => 'web']);
    }

    public function test_unauthenticated_user_cannot_access_dashboard()
    {
        $this->getJson('/api/dashboard')->assertStatus(401);
    }

    public function test_authenticated_user_can_access_dashboard()
    {
        $user = User::factory()->create(['is_active' => true]);
        $user->assignRole('admin');

        $this->actingAs($user, 'sanctum')->getJson('/api/dashboard')->assertOk();
    }
}
