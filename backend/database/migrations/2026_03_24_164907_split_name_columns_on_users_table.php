<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('first_name', 100)->after('id');
            $table->string('middle_name', 100)->nullable()->after('first_name');
            $table->string('last_name', 100)->after('middle_name');
        });

        // PostgreSQL-compatible name split
        DB::statement("
            UPDATE users
            SET
                first_name = TRIM(SPLIT_PART(TRIM(name), ' ', 1)),
                last_name = CASE
                    WHEN POSITION(' ' IN TRIM(name)) > 0
                    THEN TRIM(SUBSTRING(TRIM(name) FROM POSITION(' ' IN TRIM(name)) + 1))
                    ELSE TRIM(name)
                END
        ");

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn('name');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('name')->after('id')->default('');
        });

        // PostgreSQL uses CONCAT_WS natively — this one was already fine,
        // but NULLIF + TRIM is still correct here
        DB::statement("
            UPDATE users
            SET name = TRIM(CONCAT_WS(' ',
                NULLIF(TRIM(first_name), ''),
                NULLIF(TRIM(middle_name), ''),
                NULLIF(TRIM(last_name), '')
            ))
        ");

        Schema::table('users', function (Blueprint $table) {
            $table->dropColumn(['first_name', 'middle_name', 'last_name']);
        });
    }
};