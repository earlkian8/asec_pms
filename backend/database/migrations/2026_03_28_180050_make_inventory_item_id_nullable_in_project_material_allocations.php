<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_material_allocations', function (Blueprint $table) {
            $table->foreignId('inventory_item_id')->nullable()->change();
        });
    }

    public function down(): void
    {
        Schema::table('project_material_allocations', function (Blueprint $table) {
            $table->foreignId('inventory_item_id')->nullable(false)->change();
        });
    }
};
