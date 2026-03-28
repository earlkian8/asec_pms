<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_material_allocations', function (Blueprint $table) {
            $table->foreignId('direct_supply_id')
                ->nullable()
                ->after('inventory_item_id')
                ->constrained('direct_supplies')
                ->onDelete('set null');

            $table->decimal('unit_price', 10, 2)->nullable()->after('direct_supply_id');
        });
    }

    public function down(): void
    {
        Schema::table('project_material_allocations', function (Blueprint $table) {
            $table->dropForeign(['direct_supply_id']);
            $table->dropColumn(['direct_supply_id', 'unit_price']);
        });
    }
};
