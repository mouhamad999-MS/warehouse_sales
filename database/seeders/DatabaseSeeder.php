<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Customer;
use App\Models\MeasurementUnit;
use App\Models\Product;
use App\Models\SystemSettings;
use App\Models\User;
use App\Models\WarehouseLocation;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Spatie\Permission\Models\Role;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        // Roles
        $adminRole = Role::firstOrCreate(['name' => 'admin', 'guard_name' => 'web']);
        $warehouseRole = Role::firstOrCreate(['name' => 'warehouse_manager', 'guard_name' => 'web']);
        $salesRole = Role::firstOrCreate(['name' => 'sales_officer', 'guard_name' => 'web']);

        // Users
        $admin = User::create([
            'name' => 'System Admin',
            'email' => 'admin@warehouse.com',
            'password' => Hash::make('password'),
            'role_id' => $adminRole->id,
            'is_active' => true,
        ]);
        $admin->assignRole($adminRole);

        $warehouse = User::create([
            'name' => 'Warehouse Manager',
            'email' => 'warehouse@warehouse.com',
            'password' => Hash::make('password'),
            'role_id' => $warehouseRole->id,
            'is_active' => true,
        ]);
        $warehouse->assignRole($warehouseRole);

        $sales = User::create([
            'name' => 'Sales Officer',
            'email' => 'sales@warehouse.com',
            'password' => Hash::make('password'),
            'role_id' => $salesRole->id,
            'is_active' => true,
        ]);
        $sales->assignRole($salesRole);

        // System Settings
        SystemSettings::create([
            'company_name' => 'Warehouse Co.',
            'currency' => 'SAR',
            'language' => 'en',
        ]);

        // Measurement Units
        $units = [
            ['name' => 'Kilogram', 'abbreviation' => 'kg'],
            ['name' => 'Piece', 'abbreviation' => 'pc'],
            ['name' => 'Liter', 'abbreviation' => 'L'],
            ['name' => 'Meter', 'abbreviation' => 'm'],
            ['name' => 'Box', 'abbreviation' => 'box'],
        ];
        foreach ($units as $u) {
            MeasurementUnit::create($u);
        }

        // Categories
        $categories = ['Electronics', 'Furniture', 'Raw Materials', 'Office Supplies'];
        foreach ($categories as $name) {
            Category::create(['name' => $name]);
        }

        // Warehouse Locations: R1-R3, S1-S3, B1-B3 = 27 bins
        $capacities = [100, 150, 80, 200, 120, 90, 60, 180, 110];
        $idx = 0;
        foreach (['R1', 'R2', 'R3'] as $rack) {
            foreach (['S1', 'S2', 'S3'] as $shelf) {
                foreach (['B1', 'B2', 'B3'] as $bin) {
                    WarehouseLocation::create([
                        'rack' => $rack,
                        'shelf' => $shelf,
                        'bin' => $bin,
                        'capacity' => $capacities[$idx % 9],
                        'current_load' => 0,
                    ]);
                    $idx++;
                }
            }
        }

        // Products
        $unitIds = MeasurementUnit::pluck('id', 'abbreviation');
        $catIds = Category::pluck('id', 'name');
        $locationIds = WarehouseLocation::pluck('id')->toArray();

        $products = [
            ['name' => 'Laptop Pro 15"', 'sku' => 'ELEC-001', 'category' => 'Electronics', 'unit' => 'pc', 'qty' => 45, 'min' => 10, 'price' => 3500.00],
            ['name' => 'Wireless Mouse', 'sku' => 'ELEC-002', 'category' => 'Electronics', 'unit' => 'pc', 'qty' => 120, 'min' => 20, 'price' => 89.99],
            ['name' => 'USB-C Hub', 'sku' => 'ELEC-003', 'category' => 'Electronics', 'unit' => 'pc', 'qty' => 5, 'min' => 15, 'price' => 149.00],
            ['name' => 'Office Chair', 'sku' => 'FURN-001', 'category' => 'Furniture', 'unit' => 'pc', 'qty' => 30, 'min' => 5, 'price' => 850.00],
            ['name' => 'Standing Desk', 'sku' => 'FURN-002', 'category' => 'Furniture', 'unit' => 'pc', 'qty' => 12, 'min' => 3, 'price' => 2200.00],
            ['name' => 'Steel Beam 6m', 'sku' => 'RAW-001', 'category' => 'Raw Materials', 'unit' => 'm', 'qty' => 200, 'min' => 50, 'price' => 45.00],
            ['name' => 'Aluminum Sheet', 'sku' => 'RAW-002', 'category' => 'Raw Materials', 'unit' => 'kg', 'qty' => 500, 'min' => 100, 'price' => 12.50],
            ['name' => 'Industrial Oil', 'sku' => 'RAW-003', 'category' => 'Raw Materials', 'unit' => 'L', 'qty' => 8, 'min' => 30, 'price' => 25.00],
            ['name' => 'A4 Paper Ream', 'sku' => 'OFF-001', 'category' => 'Office Supplies', 'unit' => 'box', 'qty' => 80, 'min' => 20, 'price' => 35.00],
            ['name' => 'Ballpoint Pen Box', 'sku' => 'OFF-002', 'category' => 'Office Supplies', 'unit' => 'box', 'qty' => 150, 'min' => 30, 'price' => 18.00],
            ['name' => 'Stapler Heavy Duty', 'sku' => 'OFF-003', 'category' => 'Office Supplies', 'unit' => 'pc', 'qty' => 25, 'min' => 5, 'price' => 65.00],
            ['name' => '4K Monitor 27"', 'sku' => 'ELEC-004', 'category' => 'Electronics', 'unit' => 'pc', 'qty' => 18, 'min' => 5, 'price' => 1800.00],
            ['name' => 'Mechanical Keyboard', 'sku' => 'ELEC-005', 'category' => 'Electronics', 'unit' => 'pc', 'qty' => 60, 'min' => 10, 'price' => 320.00],
        ];

        foreach ($products as $i => $p) {
            Product::create([
                'name' => $p['name'],
                'sku' => $p['sku'],
                'category_id' => $catIds[$p['category']],
                'unit_id' => $unitIds[$p['unit']],
                'location_id' => $locationIds[$i % count($locationIds)],
                'quantity' => $p['qty'],
                'min_stock_level' => $p['min'],
                'unit_price' => $p['price'],
            ]);
        }

        // Customers
        $customers = [
            ['name' => 'Ahmed Al-Rashid', 'email' => 'ahmed@example.com', 'phone' => '+966501234567', 'address' => 'Riyadh, Saudi Arabia'],
            ['name' => 'Sara Mohammed', 'email' => 'sara@example.com', 'phone' => '+966509876543', 'address' => 'Jeddah, Saudi Arabia'],
            ['name' => 'Tech Solutions Ltd', 'email' => 'info@techsolutions.com', 'phone' => '+966500112233', 'address' => 'Dammam, Saudi Arabia'],
            ['name' => 'Global Supplies Co', 'email' => 'procurement@globalsupplies.com', 'phone' => '+966544556677', 'address' => 'Riyadh, Saudi Arabia'],
            ['name' => 'Fatima Al-Zahra', 'email' => 'fatima@example.com', 'phone' => '+966555667788', 'address' => 'Mecca, Saudi Arabia'],
        ];

        foreach ($customers as $c) {
            Customer::create([...$c, 'created_by' => $sales->id]);
        }
    }
}
