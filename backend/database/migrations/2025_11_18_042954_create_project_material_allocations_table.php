<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Create project_material_allocations table first
        if (!Schema::hasTable('project_material_allocations')) {
            Schema::create('project_material_allocations', function (Blueprint $table) {
                $table->id();
                $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
                $table->foreignId('inventory_item_id')->constrained('inventory_items')->onDelete('cascade');
                $table->decimal('quantity_allocated', 10, 2);
                $table->decimal('quantity_received', 10, 2)->default(0);
                $table->decimal('quantity_remaining', 10, 2)->nullable();
                $table->enum('status', ['pending', 'partial', 'received'])->default('pending');
                $table->foreignId('allocated_by')->nullable()->constrained('users')->onDelete('set null');
                $table->timestamp('allocated_at')->useCurrent();
                $table->text('notes')->nullable();
                $table->timestamps();
            });
        }

        // Note: inventory_transactions table already exists, so we skip creating it
        // If it needs the project_material_allocation_id column, add it separately
        if (Schema::hasTable('inventory_transactions') && !Schema::hasColumn('inventory_transactions', 'project_material_allocation_id')) {
            Schema::table('inventory_transactions', function (Blueprint $table) {
                $table->foreignId('project_material_allocation_id')->nullable()->after('project_id')->constrained('project_material_allocations')->onDelete('set null');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('inventory_transactions');
        Schema::dropIfExists('project_material_allocations');
    }
};
