<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('compensation_profiles', function (Blueprint $table) {
            $table->id();
            $table->morphs('profileable');
            $table->string('pay_type', 20)->default('hourly');
            $table->decimal('hourly_rate', 12, 2)->nullable();
            $table->decimal('monthly_salary', 14, 2)->nullable();
            $table->date('effective_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['profileable_type', 'profileable_id', 'is_active'], 'comp_profiles_active_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('compensation_profiles');
    }
};
