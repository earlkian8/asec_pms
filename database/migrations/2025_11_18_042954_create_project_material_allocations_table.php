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
        Schema::create('project_material_allocations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            $table->foreignId('inventory_item_id')->constrained('inventory_items')->onDelete('cascade');
            $table->decimal('quantity_allocated', 10, 2);
            $table->decimal('quantity_received', 10, 2)->default(0);
            $table->decimal('quantity_remaining', 10, 2)->virtualAs('quantity_allocated - quantity_received');
            $table->enum('status', ['pending', 'partial', 'received'])->default('pending');
            $table->foreignId('allocated_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('allocated_at')->useCurrent();
            $table->text('notes')->nullable();
            $table->timestamps();
        });

        // Create inventory_transactions table (references project_material_allocations)
        Schema::create('inventory_transactions', function (Blueprint $table) {
            $table->id();
            $table->foreignId('inventory_item_id')->constrained('inventory_items')->onDelete('cascade');
            $table->enum('transaction_type', ['stock_in', 'stock_out']);
            $table->enum('stock_out_type', ['project_use', 'damage', 'other'])->nullable(); // Only for stock_out
            $table->decimal('quantity', 10, 2);
            $table->decimal('unit_price', 10, 2)->nullable();
            $table->foreignId('project_id')->nullable()->constrained('projects')->onDelete('set null'); // Only for project_use
            $table->foreignId('project_material_allocation_id')->nullable()->constrained('project_material_allocations')->onDelete('set null');
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->date('transaction_date')->default(now());
            $table->timestamps();
        });
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
