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
        Schema::table('projects', function (Blueprint $table) {
            // Project documents
            $table->string('building_permit', 500)->nullable()->after('billing_type');
            $table->string('business_permit', 500)->nullable()->after('building_permit');
            $table->string('environmental_compliance', 500)->nullable()->after('business_permit');
            $table->string('contractor_license', 500)->nullable()->after('environmental_compliance');
            $table->string('surety_bond', 500)->nullable()->after('contractor_license');
            $table->string('signed_contract', 500)->nullable()->after('surety_bond');
            $table->string('notice_to_proceed', 500)->nullable()->after('signed_contract');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn([
                'building_permit',
                'business_permit',
                'environmental_compliance',
                'contractor_license',
                'surety_bond',
                'signed_contract',
                'notice_to_proceed',
            ]);
        });
    }
};