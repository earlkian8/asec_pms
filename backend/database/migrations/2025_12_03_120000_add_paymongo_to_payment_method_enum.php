<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // For PostgreSQL
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE billing_payments DROP CONSTRAINT IF EXISTS billing_payments_payment_method_check");
            DB::statement("ALTER TABLE billing_payments ADD CONSTRAINT billing_payments_payment_method_check CHECK (payment_method IN ('cash', 'check', 'bank_transfer', 'credit_card', 'paymongo', 'other'))");
        } else {
            // For MySQL
            DB::statement("ALTER TABLE billing_payments MODIFY COLUMN payment_method ENUM('cash', 'check', 'bank_transfer', 'credit_card', 'paymongo', 'other') DEFAULT 'bank_transfer'");
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // For PostgreSQL
        if (DB::getDriverName() === 'pgsql') {
            DB::statement("ALTER TABLE billing_payments DROP CONSTRAINT IF EXISTS billing_payments_payment_method_check");
            DB::statement("ALTER TABLE billing_payments ADD CONSTRAINT billing_payments_payment_method_check CHECK (payment_method IN ('cash', 'check', 'bank_transfer', 'credit_card', 'other'))");
        } else {
            // For MySQL
            DB::statement("ALTER TABLE billing_payments MODIFY COLUMN payment_method ENUM('cash', 'check', 'bank_transfer', 'credit_card', 'other') DEFAULT 'bank_transfer'");
        }
    }
};

