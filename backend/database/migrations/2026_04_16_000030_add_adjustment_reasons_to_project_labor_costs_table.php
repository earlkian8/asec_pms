<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_labor_costs', function (Blueprint $table) {
            $table->text('overpay_reason')->nullable()->after('overpay_amount');
            $table->text('double_pay_reason')->nullable()->after('double_pay_amount');
            $table->text('damages_reason')->nullable()->after('damages_deduction');
            $table->text('other_deduction_reason')->nullable()->after('other_deduction');
            $table->text('cash_advance_reason')->nullable()->after('cash_advance');
        });
    }

    public function down(): void
    {
        Schema::table('project_labor_costs', function (Blueprint $table) {
            $table->dropColumn([
                'overpay_reason',
                'double_pay_reason',
                'damages_reason',
                'other_deduction_reason',
                'cash_advance_reason',
            ]);
        });
    }
};
