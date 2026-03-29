<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('milestone_material_usages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_milestone_id')->constrained('project_milestones')->cascadeOnDelete();
            $table->foreignId('project_material_allocation_id')->constrained('project_material_allocations')->cascadeOnDelete();
            $table->decimal('quantity_used', 10, 2);
            $table->text('notes')->nullable();
            $table->foreignId('recorded_by')->nullable()->constrained('users')->nullOnDelete();
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('milestone_material_usages');
    }
};
