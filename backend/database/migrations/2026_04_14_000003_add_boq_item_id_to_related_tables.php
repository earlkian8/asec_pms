<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Tables that get an optional link back to a BOQ item.
     * Using nullable + nullOnDelete so existing rows and projects
     * without a BOQ continue to work unchanged.
     */
    private array $tables = [
        'project_material_allocations',
        'project_milestones',
        'project_tasks',
        'project_labor_costs',
        'progress_updates',
    ];

    public function up(): void
    {
        foreach ($this->tables as $tableName) {
            if (!Schema::hasTable($tableName) || Schema::hasColumn($tableName, 'boq_item_id')) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) {
                $table->foreignId('boq_item_id')
                    ->nullable()
                    ->after('id')
                    ->constrained('project_boq_items')
                    ->nullOnDelete();
            });
        }
    }

    public function down(): void
    {
        foreach ($this->tables as $tableName) {
            if (!Schema::hasTable($tableName) || !Schema::hasColumn($tableName, 'boq_item_id')) {
                continue;
            }

            Schema::table($tableName, function (Blueprint $table) {
                $table->dropConstrainedForeignId('boq_item_id');
            });
        }
    }
};
