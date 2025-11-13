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
        Schema::create('projects', function (Blueprint $table) {
            $table->id();
            $table->string('project_code', 50)->unique();
            $table->string('project_name', 255);
            $table->foreignId('client_id')->constrained('clients', 'id')->onDelete('cascade');

            $table->enum('project_type', ['design', 'construction', 'consultancy', 'maintenance']);
            $table->enum('status', ['planning', 'active', 'on_hold', 'completed', 'cancelled'])->default('planning');
            $table->enum('priority', ['low', 'medium', 'high', 'critical'])->default('medium');

            $table->decimal('contract_amount', 15, 2)->default(0);
            $table->date('start_date')->nullable();
            $table->date('planned_end_date')->nullable();
            $table->date('actual_end_date')->nullable();
            $table->decimal('completion_percentage', 5, 2)->default(0);
            $table->text('location')->nullable();
            $table->text('description')->nullable();
            $table->boolean('is_billable')->default(true);
            $table->enum('billing_type', ['fixed_price', 'milestone'])->default('fixed_price');

            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('projects');
    }
};
