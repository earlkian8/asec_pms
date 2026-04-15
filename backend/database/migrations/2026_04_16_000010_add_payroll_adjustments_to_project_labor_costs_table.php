<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_labor_costs', function (Blueprint $table) {
            $table->decimal('base_pay', 12, 2)->default(0)->after('days_present');
            $table->decimal('overpay_amount', 12, 2)->default(0)->after('base_pay');
            $table->decimal('double_pay_amount', 12, 2)->default(0)->after('overpay_amount');
            $table->decimal('damages_deduction', 12, 2)->default(0)->after('double_pay_amount');
            $table->decimal('other_deduction', 12, 2)->default(0)->after('damages_deduction');
            $table->decimal('cash_advance', 12, 2)->default(0)->after('other_deduction');
        });
    }

    public function down(): void
    {
        Schema::table('project_labor_costs', function (Blueprint $table) {
            $table->dropColumn([
                'base_pay',
                'overpay_amount',
                'double_pay_amount',
                'damages_deduction',
                'other_deduction',
                'cash_advance',
            ]);
        });
    }
};
