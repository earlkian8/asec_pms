<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds:
     *  - is_archived (boolean) to inventory_items
     *  - archived_at (timestamp) to inventory_items
     *  - Updates stock_out_type on inventory_transactions to support new types
     */
    public function up(): void
    {
        // 1. Add archive columns to inventory_items
        Schema::table('inventory_items', function (Blueprint $table) {
            $table->boolean('is_archived')->default(false)->after('is_active');
            $table->timestamp('archived_at')->nullable()->after('is_archived');
        });

        // 2. Update inventory_transactions.stock_out_type to support expanded types.
        //    If using PostgreSQL with an enum type, alter it; for MySQL/SQLite use string.
        //    We switch to a plain varchar so new types can be added without further migrations.
        if (Schema::hasTable('inventory_transactions') && Schema::hasColumn('inventory_transactions', 'stock_out_type')) {
            // For PostgreSQL: alter the column type to text so we are not constrained by enum
            // For MySQL / SQLite this is a no-op since the column is already a string
            try {
                DB::statement("ALTER TABLE inventory_transactions ALTER COLUMN stock_out_type TYPE VARCHAR(50)");
            } catch (\Exception $e) {
                // MySQL / SQLite: the column is already a varchar — nothing to do
            }
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('inventory_items', function (Blueprint $table) {
            $table->dropColumn(['is_archived', 'archived_at']);
        });
    }
};