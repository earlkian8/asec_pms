<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Adds an explicit `assignment_status` column to `project_teams`.
     * Values: 'active' | 'completed' | 'released'
     *
     * - active    : person is currently working on the project (blocks other assignments)
     * - completed : end_date passed and the scheduler auto-transitioned them
     * - released  : admin manually released them (replaces hard-delete)
     *
     * All existing rows are migrated to 'active' by default.
     */
    public function up(): void
    {
        Schema::table('project_teams', function (Blueprint $table) {
            $table->string('assignment_status', 20)
                  ->default('active')
                  ->after('is_active')
                  ->comment('active | completed | released');
        });

        // Migrate existing rows: active if is_active = true AND (no end_date OR end_date >= today),
        // otherwise completed.
        DB::statement("
            UPDATE project_teams
            SET assignment_status = CASE
                WHEN is_active = true
                     AND (end_date IS NULL OR end_date >= CURRENT_DATE)
                THEN 'active'
                ELSE 'completed'
            END
            WHERE deleted_at IS NULL
        ");
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('project_teams', function (Blueprint $table) {
            $table->dropColumn('assignment_status');
        });
    }
};
