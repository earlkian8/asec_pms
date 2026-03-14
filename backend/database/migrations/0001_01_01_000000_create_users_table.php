<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();

            // ── Auth ──────────────────────────────────────────────────────────
            $table->string('name');
            $table->string('email')->unique();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->rememberToken();

            // ── Identity ──────────────────────────────────────────────────────
            $table->string('employee_id', 50)->nullable()->unique();
            $table->string('profile_image')->nullable();

            // ── Personal Information ──────────────────────────────────────────
            $table->string('phone', 30)->nullable();
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

        Schema::create('password_reset_tokens', function (Blueprint $table) {
            $table->string('email')->primary();
            $table->string('token');
            $table->timestamp('created_at')->nullable();
        });

        Schema::create('sessions', function (Blueprint $table) {
            $table->string('id')->primary();
            $table->foreignId('user_id')->nullable()->index();
            $table->string('ip_address', 45)->nullable();
            $table->text('user_agent')->nullable();
            $table->longText('payload');
            $table->integer('last_activity')->index();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
        Schema::dropIfExists('password_reset_tokens');
        Schema::dropIfExists('sessions');
    }
};