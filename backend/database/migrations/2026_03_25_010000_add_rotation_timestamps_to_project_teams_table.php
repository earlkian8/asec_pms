<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_teams', function (Blueprint $table) {
            $table->timestamp('released_at')->nullable()->after('assignment_status');
            $table->timestamp('reactivated_at')->nullable()->after('released_at');
        });
    }

    public function down(): void
    {
        Schema::table('project_teams', function (Blueprint $table) {
            $table->dropColumn(['released_at', 'reactivated_at']);
        });
    }
};
