<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

return new class extends Migration {
    public function up(): void
    {
        Schema::table('project_boq_items', function (Blueprint $table) {
            $table->decimal('material_cost', 14, 2)->default(0)->after('unit_cost');
            $table->decimal('labor_cost', 14, 2)->default(0)->after('material_cost');
        });

        // Backfill: aggregate resources into material_cost / labor_cost.
        // Portable across MySQL/Postgres: compute via correlated subqueries.
        DB::statement("
            UPDATE project_boq_items pbi
            SET
                material_cost = COALESCE((
                    SELECT SUM(r.total_cost)
                    FROM project_boq_item_resources r
                    WHERE r.project_boq_item_id = pbi.id
                      AND r.resource_category = 'material'
                      AND r.deleted_at IS NULL
                ), 0),
                labor_cost = COALESCE((
                    SELECT SUM(r.total_cost)
                    FROM project_boq_item_resources r
                    WHERE r.project_boq_item_id = pbi.id
                      AND r.resource_category = 'labor'
                      AND r.deleted_at IS NULL
                ), 0)
            WHERE pbi.deleted_at IS NULL
        ");

        // Recompute total_cost / unit_cost from the backfilled material + labor.
        DB::statement("
            UPDATE project_boq_items
            SET
                total_cost = material_cost + labor_cost,
                unit_cost  = CASE WHEN quantity > 0
                                  THEN (material_cost + labor_cost) / quantity
                                  ELSE 0 END
            WHERE deleted_at IS NULL
              AND (material_cost > 0 OR labor_cost > 0)
        ");
    }

    public function down(): void
    {
        Schema::table('project_boq_items', function (Blueprint $table) {
            $table->dropColumn(['material_cost', 'labor_cost']);
        });
    }
};
