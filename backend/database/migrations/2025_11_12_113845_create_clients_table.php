<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('clients', function (Blueprint $table) {
            $table->id();
            $table->string('client_code', 20)->unique();
            $table->string('client_name', 255);
            $table->enum('client_type', ['individual', 'corporation', 'government', 'ngo'])->default('individual');
            $table->string('contact_person', 100)->nullable();
            $table->string('email', 100)->nullable();
            $table->string('phone_number', 20)->nullable();
            $table->text('address')->nullable();
            $table->string('city', 100)->nullable();
            $table->string('province', 100)->nullable();
            $table->string('postal_code', 10)->nullable();
            $table->string('country', 50)->nullable();
            $table->string('tax_id', 50)->nullable();
            $table->string('business_permit', 100)->nullable();
            $table->decimal('credit_limit', 15, 2)->default(0);
            $table->string('payment_terms')->nullable();
            $table->boolean('is_active')->default(true);
            $table->text('notes')->nullable();
            $table->string('password')->nullable()->after('email');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('clients');
    }
};
