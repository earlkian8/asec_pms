<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('project_labor_costs', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');

            // Assignable — user or employee
            $table->foreignId('user_id')->nullable()->constrained('users')->onDelete('cascade');
            // $table->foreignId('employee_id')->nullable()->constrained('employees')->onDelete('cascade');
            // $table->string('assignable_type')->default('user'); // 'user' | 'employee'

            // Payroll period
            $table->date('period_start');
            $table->date('period_end');
            $table->string('status')->default('draft'); // 'draft' | 'submitted'

            // Pay computation
            $table->decimal('daily_rate', 10, 2)->default(0);
            $table->json('attendance')->nullable(); // { "2026-11-01": "P", "2026-11-02": "A", "2026-11-03": "HD" }
            $table->decimal('days_present', 8, 2)->default(0); // computed and stored
            $table->decimal('gross_pay', 12, 2)->default(0);   // computed and stored

            $table->text('description')->nullable();
            $table->text('notes')->nullable();
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();

            $table->index(['project_id', 'status']);
            $table->index(['project_id', 'period_start', 'period_end']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('project_labor_costs');
    }
};