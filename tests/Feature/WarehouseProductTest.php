<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\MeasurementUnit;
use App\Models\Product;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class WarehouseProductTest extends TestCase
{
    use RefreshDatabase;

    private User $manager;
    private string $token;

    protected function setUp(): void
    {
        parent::setUp();
        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'warehouse_manager', 'guard_name' => 'web']);
        \Spatie\Permission\Models\Role::firstOrCreate(['name' => 'sales_officer', 'guard_name' => 'web']);

        $this->manager = User::factory()->create(['is_active' => true]);
        $this->manager->assignRole('warehouse_manager');
        $this->token = $this->manager->createToken('test')->plainTextToken;
    }

    public function test_warehouse_manager_can_list_products(): void
    {
        Product::factory()->count(3)->create();

        $this->actingAs($this->manager, 'sanctum')
             ->getJson('/api/warehouse/products')
             ->assertStatus(200)
             ->assertJsonStructure(['data']);
    }

    public function test_warehouse_manager_can_create_product(): void
    {
        $category = Category::factory()->create();
        $unit     = MeasurementUnit::factory()->create();

        $response = $this->actingAs($this->manager, 'sanctum')->postJson('/api/warehouse/products', [
            'name'           => 'Test Product',
            'sku'            => 'TST-001',
            'category_id'    => $category->id,
            'unit_id'        => $unit->id,
            'quantity'       => 10,
            'min_stock_level' => 2,
            'unit_price'     => 9.99,
        ]);

        $response->assertStatus(201)
                 ->assertJsonPath('data.name', 'Test Product');
    }

    public function test_sales_officer_cannot_create_product(): void
    {
        $sales = User::factory()->create(['is_active' => true]);
        $sales->assignRole('sales_officer');
        $token = $sales->createToken('test')->plainTextToken;

        $this->withToken($token)
             ->postJson('/api/warehouse/products', ['name' => 'X'])
             ->assertStatus(403);
    }

    public function test_low_stock_product_is_flagged(): void
    {
        $product = Product::factory()->create(['quantity' => 1, 'min_stock_level' => 5]);

        $this->assertTrue($product->isLowStock());
    }
}
