<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE purchase_orders MODIFY COLUMN status ENUM('DRAFT','SUBMITTED','APPROVED','REJECTED','CANCELLED','RECEIVED') NOT NULL DEFAULT 'SUBMITTED'");
        }
        // SQLite stores ENUM as TEXT and accepts any string — no ALTER needed for tests
    }

    public function down(): void
    {
        if (DB::getDriverName() === 'mysql') {
            DB::statement("ALTER TABLE purchase_orders MODIFY COLUMN status ENUM('DRAFT','SUBMITTED','APPROVED','REJECTED','CANCELLED') NOT NULL DEFAULT 'SUBMITTED'");
        }
    }
};
