<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        // Purchase orders: product lookup, owner lookup, date-range list queries
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->index('product_id',    'idx_po_product');
            $table->index('requested_by',  'idx_po_requested_by');
            $table->index('created_at',    'idx_po_created');
            // Composite: "pending orders for this product" — used by receive flow
            $table->index(['product_id', 'status'], 'idx_po_product_status');
        });

        // Stock movements: type filter (INBOUND / OUTBOUND / ADJUSTMENT)
        Schema::table('stock_movements', function (Blueprint $table) {
            $table->index('type', 'idx_movements_type');
        });

        // Products: soft-delete scan (WHERE deleted_at IS NULL on every query)
        Schema::table('products', function (Blueprint $table) {
            $table->index('deleted_at', 'idx_products_deleted_at');
        });

        // Warehouse locations: map page groups by rack then shelf
        Schema::table('warehouse_locations', function (Blueprint $table) {
            $table->index('rack',          'idx_locations_rack');
            $table->index(['rack', 'shelf'], 'idx_locations_rack_shelf');
        });

        // Activity logs: filter by action type (e.g. "show all approvals")
        Schema::table('activity_logs', function (Blueprint $table) {
            $table->index('action', 'idx_activity_action');
        });
    }

    public function down(): void
    {
        Schema::table('purchase_orders', function (Blueprint $table) {
            $table->dropIndex('idx_po_product');
            $table->dropIndex('idx_po_requested_by');
            $table->dropIndex('idx_po_created');
            $table->dropIndex('idx_po_product_status');
        });

        Schema::table('stock_movements', function (Blueprint $table) {
            $table->dropIndex('idx_movements_type');
        });

        Schema::table('products', function (Blueprint $table) {
            $table->dropIndex('idx_products_deleted_at');
        });

        Schema::table('warehouse_locations', function (Blueprint $table) {
            $table->dropIndex('idx_locations_rack');
            $table->dropIndex('idx_locations_rack_shelf');
        });

        Schema::table('activity_logs', function (Blueprint $table) {
            $table->dropIndex('idx_activity_action');
        });
    }
};
