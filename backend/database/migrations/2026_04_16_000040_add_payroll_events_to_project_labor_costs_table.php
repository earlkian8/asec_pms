<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_labor_costs', function (Blueprint $table) {
            $table->json('payroll_events')->nullable()->after('attendance');
        });
    }

    public function down(): void
    {
        Schema::table('project_labor_costs', function (Blueprint $table) {
            $table->dropColumn('payroll_events');
        });
    }
};
