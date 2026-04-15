<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_labor_costs', function (Blueprint $table) {
            $table->json('deduction_items')->nullable()->after('payroll_events');
        });
    }

    public function down(): void
    {
        Schema::table('project_labor_costs', function (Blueprint $table) {
            $table->dropColumn('deduction_items');
        });
    }
};
