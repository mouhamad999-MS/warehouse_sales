<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ActivityLogTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'warehouse_manager', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'sales_officer', 'guard_name' => 'web']);
    }

    public function test_product_creation_is_logged(): void
    {
        $manager = User::factory()->create(['is_active' => true]);
        $manager->assignRole('warehouse_manager');

        $this->actingAs($manager, 'sanctum');

        $product = Product::factory()->create();

        $this->assertDatabaseHas('activity_logs', [
            'action' => 'created',
            'model_type' => 'App\\Models\\Product',
            'model_id' => $product->id,
        ]);
    }

    public function test_product_update_is_logged(): void
    {
        $manager = User::factory()->create(['is_active' => true]);
        $manager->assignRole('warehouse_manager');

        $this->actingAs($manager, 'sanctum');

        $product = Product::factory()->create(['name' => 'Old Name']);
        $product->update(['name' => 'New Name']);

        $this->assertDatabaseHas('activity_logs', [
            'action' => 'updated',
            'model_type' => 'App\\Models\\Product',
            'model_id' => $product->id,
        ]);
    }

    public function test_admin_can_view_activity_logs(): void
    {
        $admin = User::factory()->create(['is_active' => true]);
        $admin->assignRole('admin');
        $token = $admin->createToken('test')->plainTextToken;

        $this->withToken($token)->getJson('/api/admin/activity-logs')
             ->assertStatus(200)
             ->assertJsonStructure(['data']);
    }
}
