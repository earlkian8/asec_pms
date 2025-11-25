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
        Schema::create('material_receiving_reports', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_material_allocation_id')->constrained('project_material_allocations')->onDelete('cascade');
            $table->decimal('quantity_received', 10, 2);
            $table->foreignId('received_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamp('received_at')->useCurrent();
            $table->string('condition')->nullable(); // e.g., "Good", "Damaged"
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('material_receiving_reports');
    }
};
