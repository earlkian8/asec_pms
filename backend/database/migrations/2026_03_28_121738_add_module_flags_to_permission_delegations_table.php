<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('permission_delegations', function (Blueprint $table) {
            $table->boolean('task_access')->default(true)->after('granted_to');
            $table->boolean('project_access')->default(false)->after('task_access');
        });
    }

    public function down(): void
    {
        Schema::table('permission_delegations', function (Blueprint $table) {
            $table->dropColumn(['task_access', 'project_access']);
        });
    }
};
