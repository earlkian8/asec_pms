<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_boq_items', function (Blueprint $table) {
            $table->string('resource_type', 20)->nullable()->after('total_cost');
            $table->foreignId('planned_inventory_item_id')->nullable()->after('resource_type')->constrained('inventory_items')->nullOnDelete();
            $table->foreignId('planned_direct_supply_id')->nullable()->after('planned_inventory_item_id')->constrained('direct_supplies')->nullOnDelete();
            $table->foreignId('planned_user_id')->nullable()->after('planned_direct_supply_id')->constrained('users')->nullOnDelete();
            $table->foreignId('planned_employee_id')->nullable()->after('planned_user_id')->constrained('employees')->nullOnDelete();

            $table->index('resource_type');
            $table->index('planned_inventory_item_id');
            $table->index('planned_direct_supply_id');
            $table->index('planned_user_id');
            $table->index('planned_employee_id');
        });
    }

    public function down(): void
    {
        Schema::table('project_boq_items', function (Blueprint $table) {
            $table->dropIndex(['resource_type']);
            $table->dropIndex(['planned_inventory_item_id']);
            $table->dropIndex(['planned_direct_supply_id']);
            $table->dropIndex(['planned_user_id']);
            $table->dropIndex(['planned_employee_id']);

            $table->dropConstrainedForeignId('planned_employee_id');
            $table->dropConstrainedForeignId('planned_user_id');
            $table->dropConstrainedForeignId('planned_direct_supply_id');
            $table->dropConstrainedForeignId('planned_inventory_item_id');
            $table->dropColumn('resource_type');
        });
    }
};
