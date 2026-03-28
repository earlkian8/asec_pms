<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('permission_delegations', function (Blueprint $table) {
            // true  = this row was created by a delegated user (cannot delegate further)
            // false = this row was created by an original authority (admin-assigned)
            $table->boolean('is_delegated')->default(false)->after('project_access');
        });
    }

    public function down(): void
    {
        Schema::table('permission_delegations', function (Blueprint $table) {
            $table->dropColumn('is_delegated');
        });
    }
};
