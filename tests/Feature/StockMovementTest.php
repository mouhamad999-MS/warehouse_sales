<?php

namespace Tests\Feature;

use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class StockMovementTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'warehouse_manager', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'sales_officer', 'guard_name' => 'web']);

        $this->manager = User::factory()->create(['is_active' => true]);
        $this->manager->assignRole('warehouse_manager');
        $this->token = $this->manager->createToken('test')->plainTextToken;
    }

    public function test_warehouse_manager_can_record_inbound_stock(): void
    {
        $product = Product::factory()->create(['quantity' => 10]);

        $response = $this->actingAs($this->manager, 'sanctum')->postJson('/api/warehouse/stock/inbound', [
            'product_id' => $product->id,
            'quantity' => 5,
            'notes' => 'Received from supplier',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('products', ['id' => $product->id, 'quantity' => 15]);
    }

    public function test_warehouse_manager_can_record_outbound_stock(): void
    {
        $product = Product::factory()->create(['quantity' => 50]);

        $response = $this->actingAs($this->manager, 'sanctum')->postJson('/api/warehouse/stock/outbound', [
            'product_id' => $product->id,
            'quantity' => 10,
            'notes' => 'Shipped to customer',
        ]);

        $response->assertStatus(201);
        $this->assertDatabaseHas('products', ['id' => $product->id, 'quantity' => 40]);
    }

    public function test_outbound_fails_when_insufficient_stock(): void
    {
        $product = Product::factory()->create(['quantity' => 2]);

        $response = $this->actingAs($this->manager, 'sanctum')->postJson('/api/warehouse/stock/outbound', [
            'product_id' => $product->id,
            'quantity' => 10,
        ]);

        $response->assertStatus(422);
    }

    public function test_stock_history_returns_movements(): void
    {
        $response = $this->actingAs($this->manager, 'sanctum')->getJson('/api/warehouse/stock/history');
        $response->assertStatus(200);
    }
}
