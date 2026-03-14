<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('employees', function (Blueprint $table) {
            $table->id();

            // ── Identity ──────────────────────────────────────────────────────
            $table->string('employee_id', 50)->nullable()->unique();
            $table->string('profile_image')->nullable();

            // ── Name & Auth ───────────────────────────────────────────────────
            $table->string('first_name');
            $table->string('last_name');
            $table->string('email')->unique();
            $table->string('phone', 30)->nullable();
            $table->string('position', 150)->nullable();
            $table->boolean('is_active')->default(true);

            // ── Personal Information ──────────────────────────────────────────
            $table->string('secondary_phone', 30)->nullable();
            $table->enum('gender', ['male', 'female', 'other', 'prefer_not_to_say'])->nullable();
            $table->date('date_of_birth')->nullable();
            $table->enum('civil_status', ['single', 'married', 'widowed', 'separated', 'divorced'])->nullable();
            $table->string('nationality', 100)->nullable();

            // ── Address (PSGC) ────────────────────────────────────────────────
            $table->string('region', 150)->nullable();
            $table->string('province', 150)->nullable();
            $table->string('city_municipality', 150)->nullable();
            $table->string('barangay', 150)->nullable();
            $table->text('address')->nullable();
            $table->string('zip_code', 20)->nullable();

            // ── Emergency Contact ─────────────────────────────────────────────
            $table->string('emergency_contact_name', 150)->nullable();
            $table->string('emergency_contact_relationship', 80)->nullable();
            $table->string('emergency_contact_phone', 30)->nullable();

            // ── Government IDs ────────────────────────────────────────────────
            $table->string('sss_number', 30)->nullable();
            $table->string('sss_id_image')->nullable();
            $table->string('philhealth_number', 30)->nullable();
            $table->string('philhealth_id_image')->nullable();
            $table->string('pagibig_number', 30)->nullable();
            $table->string('pagibig_id_image')->nullable();
            $table->string('tin_number', 30)->nullable();
            $table->string('tin_id_image')->nullable();

            // ── Notes ─────────────────────────────────────────────────────────
            $table->text('notes')->nullable();

            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('employees');
    }
};