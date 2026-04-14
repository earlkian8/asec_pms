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
        Schema::table('clients', function (Blueprint $table) {
            if (!Schema::hasColumn('clients', 'region')) {
                $table->string('region', 150)->nullable()->after('address');
            }
            if (!Schema::hasColumn('clients', 'city_municipality')) {
                $table->string('city_municipality', 150)->nullable()->after('province');
            }
            if (!Schema::hasColumn('clients', 'barangay')) {
                $table->string('barangay', 150)->nullable()->after('city_municipality');
            }
            if (!Schema::hasColumn('clients', 'zip_code')) {
                $table->string('zip_code', 20)->nullable()->after('postal_code');
            }
        });

        DB::table('clients')->whereNull('city_municipality')->update([
            'city_municipality' => DB::raw('city'),
        ]);

        DB::table('clients')->whereNull('zip_code')->update([
            'zip_code' => DB::raw('postal_code'),
        ]);
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('clients', function (Blueprint $table) {
            if (Schema::hasColumn('clients', 'zip_code')) {
                $table->dropColumn('zip_code');
            }
            if (Schema::hasColumn('clients', 'barangay')) {
                $table->dropColumn('barangay');
            }
            if (Schema::hasColumn('clients', 'city_municipality')) {
                $table->dropColumn('city_municipality');
            }
            if (Schema::hasColumn('clients', 'region')) {
                $table->dropColumn('region');
            }
        });
    }
};