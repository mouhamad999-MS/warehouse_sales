<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('products', function (Blueprint $table) {
            $table->id();
            $table->string('name');
            $table->string('sku', 100)->unique();
            $table->foreignId('category_id')->constrained()->restrictOnDelete();
            $table->foreignId('location_id')->nullable()->constrained('warehouse_locations')->nullOnDelete();
            $table->foreignId('unit_id')->constrained('measurement_units')->restrictOnDelete();
            $table->integer('quantity')->default(0);
            $table->integer('min_stock_level')->default(0);
            $table->decimal('unit_price', 10, 2);
            $table->text('description')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('products');
    }
};
