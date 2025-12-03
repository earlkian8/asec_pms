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
        Schema::table('billing_payments', function (Blueprint $table) {
            $table->string('paymongo_payment_intent_id')->nullable()->after('payment_code');
            $table->string('paymongo_payment_method_id')->nullable()->after('paymongo_payment_intent_id');
            $table->enum('payment_status', ['pending', 'paid', 'failed', 'cancelled'])->default('pending')->after('payment_method');
            $table->string('paymongo_source_id')->nullable()->after('payment_status');
            $table->json('paymongo_metadata')->nullable()->after('paymongo_source_id');
            $table->boolean('paid_by_client')->default(false)->after('paymongo_metadata');
            
            $table->index('paymongo_payment_intent_id');
            $table->index('payment_status');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('billing_payments', function (Blueprint $table) {
            $table->dropIndex(['paymongo_payment_intent_id']);
            $table->dropIndex(['payment_status']);
            $table->dropColumn([
                'paymongo_payment_intent_id',
                'paymongo_payment_method_id',
                'payment_status',
                'paymongo_source_id',
                'paymongo_metadata',
                'paid_by_client',
            ]);
        });
    }
};
