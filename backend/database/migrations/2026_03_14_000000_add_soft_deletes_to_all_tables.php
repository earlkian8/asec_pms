<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * Add soft deletes (deleted_at) to all application tables that
     * do not yet have a soft delete column.
     */
    public function up(): void
    {
        $tables = [
            'material_receiving_reports',
            'project_issues',
            'inventory_transactions',
            'project_teams',
            'project_milestones',
            'projects',
            'progress_updates',
            'users',
            'password_reset_tokens',
            'sessions',
            'client_update_requests',
            'inventory_items',
            'project_labor_costs',
            'project_files',
            'cache',
            'cache_locks',
            'messages',
            'jobs',
            'job_batches',
            'failed_jobs',
            'clients',
            'billing_payments',
            'billings',
            'client_notifications',
            'notifications',
            'activity_logs',
            'employees',
            'chats',
            'project_tasks',
            'project_material_allocations',
            'project_miscellaneous_expenses',
            // client_types and project_types already use softDeletes
            'personal_access_tokens',
        ];

        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName) && !Schema::hasColumn($tableName, 'deleted_at')) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->softDeletes();
                });
            }
        }
    }

    /**
     * Reverse the migrations.
     *
     * Drop soft delete columns that were added by this migration.
     */
    public function down(): void
    {
        $tables = [
            'material_receiving_reports',
            'project_issues',
            'inventory_transactions',
            'project_teams',
            'project_milestones',
            'projects',
            'progress_updates',
            'users',
            'password_reset_tokens',
            'sessions',
            'client_update_requests',
            'inventory_items',
            'project_labor_costs',
            'project_files',
            'cache',
            'cache_locks',
            'messages',
            'jobs',
            'job_batches',
            'failed_jobs',
            'clients',
            'billing_payments',
            'billings',
            'client_notifications',
            'notifications',
            'activity_logs',
            'employees',
            'chats',
            'project_tasks',
            'project_material_allocations',
            'project_miscellaneous_expenses',
            'personal_access_tokens',
        ];

        foreach ($tables as $tableName) {
            if (Schema::hasTable($tableName) && Schema::hasColumn($tableName, 'deleted_at')) {
                Schema::table($tableName, function (Blueprint $table) {
                    $table->dropSoftDeletes();
                });
            }
        }
    }
};

