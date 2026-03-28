<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_labor_costs', function (Blueprint $table) {
            $table->string('pay_type', 20)->default('hourly')->after('status');
            $table->decimal('monthly_salary', 12, 2)->nullable()->after('daily_rate');
        });
    }

    public function down(): void
    {
        Schema::table('project_labor_costs', function (Blueprint $table) {
            $table->dropColumn(['pay_type', 'monthly_salary']);
        });
    }
};
