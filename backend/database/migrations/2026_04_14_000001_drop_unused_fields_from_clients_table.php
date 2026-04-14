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
        $columnsToDrop = array_values(array_filter([
            'tax_id',
            'business_permit',
            'credit_limit',
            'payment_terms',
            'remember_token',
        ], fn (string $column) => Schema::hasColumn('clients', $column)));

        if ($columnsToDrop === []) {
            return;
        }

        Schema::table('clients', function (Blueprint $table) use ($columnsToDrop) {
            $table->dropColumn($columnsToDrop);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        $columnsToAdd = array_values(array_filter([
            'tax_id',
            'business_permit',
            'credit_limit',
            'payment_terms',
            'remember_token',
        ], fn (string $column) => ! Schema::hasColumn('clients', $column)));

        if ($columnsToAdd === []) {
            return;
        }

        Schema::table('clients', function (Blueprint $table) use ($columnsToAdd) {
            foreach ($columnsToAdd as $column) {
                match ($column) {
                    'tax_id' => $table->string('tax_id', 50)->nullable(),
                    'business_permit' => $table->string('business_permit', 100)->nullable(),
                    'credit_limit' => $table->decimal('credit_limit', 15, 2)->default(0),
                    'payment_terms' => $table->string('payment_terms')->nullable(),
                    'remember_token' => $table->rememberToken(),
                };
            }
        });
    }
};