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
        Schema::create('project_teams', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects', 'id')->onDelete('cascade');
            $table->foreignId('employee_id')->constrained('employees', 'id')->onDelete('cascade');
            $table->string('role', 50);
            $table->decimal('hourly_rate', 10, 2)->nullable();
            $table->date('start_date')->nullable();
            $table->date('end_date')->nullable();
            $table->boolean('is_active')->default(true);
            $table->timestamps();

            // Unique constraint for project, user, and role combination
            $table->unique(['project_id', 'employee_id', 'role'], 'project_user_role_unique');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_teams');
    }
};
