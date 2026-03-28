<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_teams', function (Blueprint $table) {
            // 'hourly' | 'salary' | 'fixed'
            $table->string('pay_type', 20)->default('hourly')->after('hourly_rate');
            // Used when pay_type = 'salary' (monthly amount)
            $table->decimal('monthly_salary', 12, 2)->nullable()->after('pay_type');
        });
    }

    public function down(): void
    {
        Schema::table('project_teams', function (Blueprint $table) {
            $table->dropColumn(['pay_type', 'monthly_salary']);
        });
    }
};
