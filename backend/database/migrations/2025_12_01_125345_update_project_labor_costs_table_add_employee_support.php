<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Facades\DB;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        // Drop foreign key constraint before modifying column
        Schema::table('project_labor_costs', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });

        Schema::table('project_labor_costs', function (Blueprint $table) {
            // Make user_id nullable to support both users and employees
            $table->unsignedBigInteger('user_id')->nullable()->change();
            
            // Re-add foreign key constraint
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            
            // Add employee_id column
            $table->foreignId('employee_id')->nullable()->after('user_id')->constrained('employees', 'id')->onDelete('cascade');
            
            // Add type column to distinguish between user and employee
            $table->string('assignable_type')->default('user')->after('employee_id'); // 'user' or 'employee'
        });
        
        // Add check constraint to ensure only one of user_id or employee_id is set
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE project_labor_costs ADD CONSTRAINT project_labor_costs_user_or_employee_check CHECK ((user_id IS NULL) != (employee_id IS NULL))');
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop check constraint
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE project_labor_costs DROP CONSTRAINT IF EXISTS project_labor_costs_user_or_employee_check');
        }
        
        Schema::table('project_labor_costs', function (Blueprint $table) {
            // Drop foreign keys
            try {
                $table->dropForeign(['user_id']);
            } catch (\Exception $e) {
                // Foreign key might not exist
            }
            try {
                $table->dropForeign(['employee_id']);
            } catch (\Exception $e) {
                // Foreign key might not exist
            }
        });

        Schema::table('project_labor_costs', function (Blueprint $table) {
            // Remove new columns
            $table->dropColumn(['employee_id', 'assignable_type']);
            
            // Make user_id not nullable again
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
            
            // Re-add foreign key constraint
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
        });
    }
};
