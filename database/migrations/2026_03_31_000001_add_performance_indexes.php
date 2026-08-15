<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Products: speed up category filter, location filter, low-stock queries
        Schema::table('products', function (Blueprint $table) {
            $table->index('category_id', 'idx_products_category');
            $table->index('location_id', 'idx_products_location');
            $table->index(['quantity', 'min_stock_level'], 'idx_products_stock_level');
        });

        // Stock movements: speed up history by product and date range queries
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->index('product_id', 'idx_movements_product');
            $table->index('user_id', 'idx_movements_user');
            $table->index('created_at', 'idx_movements_created');
            $table->index(['product_id', 'created_at'], 'idx_movements_product_date');
        });

        // Sales orders: speed up status filter and customer lookup
        Schema::table('sales_orders', function (Blueprint $table) {
            $table->index('customer_id', 'idx_orders_customer');
            $table->index('status', 'idx_orders_status');
            $table->index('created_at', 'idx_orders_created');
        });

        // Sales order items: speed up joins
        Schema::table('sales_order_items', function (Blueprint $table) {
            $table->index('sales_order_id', 'idx_items_order');
            $table->index('product_id', 'idx_items_product');
        });

        // Purchase orders: speed up status filter
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->index('status', 'idx_purchase_status');
        });
    }

    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('idx_products_category');
            $table->dropIndex('idx_products_location');
            $table->dropIndex('idx_products_stock_level');
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropIndex('idx_movements_product');
            $table->dropIndex('idx_movements_user');
            $table->dropIndex('idx_movements_created');
            $table->dropIndex('idx_movements_product_date');
        });

        Schema::table('sales_orders', function (Blueprint $table) {
            $table->dropIndex('idx_orders_customer');
            $table->dropIndex('idx_orders_status');
            $table->dropIndex('idx_orders_created');
        });

        Schema::table('sales_order_items', function (Blueprint $table) {
            $table->dropIndex('idx_items_order');
            $table->dropIndex('idx_items_product');
        });

        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropIndex('idx_purchase_status');
        });
    }
};
