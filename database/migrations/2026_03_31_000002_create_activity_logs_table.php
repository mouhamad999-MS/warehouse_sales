<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('activity_logs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('user_id')->nullable()->constrained()->nullOnDelete();
            $table->string('action');           // created, updated, deleted, stock_in, stock_out, approved
            $table->string('model_type');       // App\Models\Product, App\Models\SalesOrder, etc.
            $table->unsignedBigInteger('model_id');
            $table->string('model_label')->nullable(); // human-readable name e.g. product name, order #
            $table->json('changes')->nullable(); // before/after for updates
            $table->string('ip_address', 45)->nullable();
            $table->timestamps();

            $table->index(['model_type', 'model_id'], 'idx_activity_model');
            $table->index('user_id', 'idx_activity_user');
            $table->index('created_at', 'idx_activity_date');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('activity_logs');
    }
};
