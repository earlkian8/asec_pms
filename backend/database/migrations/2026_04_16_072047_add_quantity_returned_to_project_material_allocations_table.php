<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('project_material_allocations', function (Blueprint $table) {
            $table->decimal('quantity_returned', 10, 2)->default(0)->after('quantity_remaining');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('project_material_allocations', function (Blueprint $table) {
            $table->dropColumn('quantity_returned');
        });
    }
};
