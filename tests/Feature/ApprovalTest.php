<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class ApprovalTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'warehouse_manager', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'sales_officer', 'guard_name' => 'web']);
    }

    private function createSubmittedOrder(): array
    {
        $sales = User::factory()->create(['is_active' => true]);
        $sales->assignRole('sales_officer');
        $salesToken = $sales->createToken('test')->plainTextToken;

        $customer = Customer::factory()->create(['created_by' => $sales->id]);
        $product = Product::factory()->create(['quantity' => 100]);

        $orderRes = $this->withToken($salesToken)->postJson('/api/sales/orders', [
            'customer_id' => $customer->id,
            'items' => [
                ['product_id' => $product->id, 'quantity' => 5, 'unit_price' => 20.00],
            ],
        ]);

        $orderRes->assertStatus(201);

        // Clear Spatie permission cache so next user gets fresh roles
        app(\Spatie\Permission\PermissionRegistrar::class)->forgetCachedPermissions();

        return [$orderRes->json('data.id'), $product->id];
    }

    public function test_warehouse_manager_can_approve_sales_order(): void
    {
        [$orderId, $productId] = $this->createSubmittedOrder();

        $manager = User::factory()->create(['is_active' => true]);
        $manager->assignRole('warehouse_manager');

        $response = $this->actingAs($manager, 'sanctum')->putJson("/api/warehouse/approvals/sales-orders/{$orderId}", [
            'action' => 'approve',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('sales_orders', ['id' => $orderId, 'status' => 'APPROVED']);
        // Stock should be decremented by 5
        $this->assertDatabaseHas('products', ['id' => $productId, 'quantity' => 95]);
    }

    public function test_warehouse_manager_can_reject_sales_order(): void
    {
        [$orderId, $productId] = $this->createSubmittedOrder();

        $manager = User::factory()->create(['is_active' => true]);
        $manager->assignRole('warehouse_manager');

        $response = $this->actingAs($manager, 'sanctum')->putJson("/api/warehouse/approvals/sales-orders/{$orderId}", [
            'action' => 'reject',
        ]);

        $response->assertStatus(200);
        $this->assertDatabaseHas('sales_orders', ['id' => $orderId, 'status' => 'REJECTED']);
        // Stock should remain unchanged
        $this->assertDatabaseHas('products', ['id' => $productId, 'quantity' => 100]);
    }
}
