<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_boq_item_resources', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_boq_item_id')->constrained('project_boq_items')->cascadeOnDelete();
            $table->string('resource_category', 20); // material|labor
            $table->string('source_type', 30); // inventory|direct_supply|user|employee
            $table->foreignId('inventory_item_id')->nullable()->constrained('inventory_items')->nullOnDelete();
            $table->foreignId('direct_supply_id')->nullable()->constrained('direct_supplies')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('employee_id')->nullable()->constrained('employees')->nullOnDelete();
            $table->string('resource_name', 255)->nullable();
            $table->string('unit', 30)->nullable();
            $table->decimal('quantity', 14, 4)->default(0);
            $table->decimal('unit_price', 14, 2)->default(0);
            $table->decimal('total_cost', 16, 2)->default(0);
            $table->text('remarks')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
            $table->softDeletes();

            $table->index(['project_boq_item_id', 'sort_order'], 'boq_item_resources_item_sort_idx');
            $table->index(['resource_category', 'source_type'], 'boq_item_resources_category_source_idx');
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_boq_item_resources');
    }
};
