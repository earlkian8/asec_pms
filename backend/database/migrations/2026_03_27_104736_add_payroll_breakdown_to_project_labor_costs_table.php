<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_labor_costs', function (Blueprint $table) {
            // Stores the immutable per-day breakdown snapshot at submit time
            // Structure: { "2026-01-01": { status, time_in, time_out, break_minutes,
            //   worked_hours, standard_hours, deduction_hours, deduction_amount, day_pay } }
            $table->json('payroll_breakdown')->nullable()->after('attendance');
        });
    }

    public function down(): void
    {
        Schema::table('project_labor_costs', function (Blueprint $table) {
            $table->dropColumn('payroll_breakdown');
        });
    }
};
