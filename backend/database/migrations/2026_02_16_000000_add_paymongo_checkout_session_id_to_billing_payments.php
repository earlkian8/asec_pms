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
            $table->string('paymongo_checkout_session_id')->nullable()->after('paymongo_payment_intent_id');
            $table->index('paymongo_checkout_session_id');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('billing_payments', function (Blueprint $table) {
            $table->dropIndex(['paymongo_checkout_session_id']);
            $table->dropColumn('paymongo_checkout_session_id');
        });
    }
};
