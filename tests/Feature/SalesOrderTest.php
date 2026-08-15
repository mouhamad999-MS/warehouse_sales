<?php

namespace Tests\Feature;

use App\Models\Customer;
use App\Models\Product;
use App\Models\SalesOrder;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Spatie\Permission\Models\Role;
use Tests\TestCase;

class SalesOrderTest extends TestCase
{
    use RefreshDatabase;

    protected function setUp(): void
    {
        parent::setUp();
        Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'warehouse_manager', 'guard_name' => 'web']);
        Role::firstOrCreate(['name' => 'sales_officer', 'guard_name' => 'web']);
    }

    private function salesUser(): array
    {
        $user = User::factory()->create(['is_active' => true]);
        $user->assignRole('sales_officer');
        return [$user, $user->createToken('test')->plainTextToken];
    }

    public function test_sales_officer_can_create_order(): void
    {
        [$user, $token] = $this->salesUser();
        $customer = Customer::factory()->create(['created_by' => $user->id]);
        $product = Product::factory()->create(['quantity' => 100]);

        $response = $this->withToken($token)->postJson('/api/sales/orders', [
            'customer_id' => $customer->id,
            'items' => [
                ['product_id' => $product->id, 'quantity' => 2, 'unit_price' => $product->unit_price],
            ],
        ]);

        $response->assertStatus(201);
    }

    public function test_sales_officer_can_view_orders(): void
    {
        [, $token] = $this->salesUser();

        $this->withToken($token)->getJson('/api/sales/orders')
             ->assertStatus(200);
    }

    public function test_sales_officer_can_cancel_submitted_order(): void
    {
        [$user, $token] = $this->salesUser();
        $customer = Customer::factory()->create(['created_by' => $user->id]);
        $product = Product::factory()->create(['quantity' => 100]);

        $orderRes = $this->withToken($token)->postJson('/api/sales/orders', [
            'customer_id' => $customer->id,
            'items' => [
                ['product_id' => $product->id, 'quantity' => 1, 'unit_price' => 10.00],
            ],
        ]);

        $orderId = $orderRes->json('data.id');

        $this->withToken($token)->patchJson("/api/sales/orders/{$orderId}/cancel")
             ->assertStatus(200);
    }

    public function test_warehouse_manager_cannot_create_sales_order(): void
    {
        $manager = User::factory()->create(['is_active' => true]);
        $manager->assignRole('warehouse_manager');
        $token = $manager->createToken('test')->plainTextToken;

        $this->withToken($token)->postJson('/api/sales/orders', [
            'customer_id' => 1,
            'items' => [['product_id' => 1, 'quantity' => 1, 'unit_price' => 1]],
        ])->assertStatus(403);
    }
}
