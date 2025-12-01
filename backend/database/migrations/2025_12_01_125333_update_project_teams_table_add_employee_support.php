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
        Schema::table('project_teams', function (Blueprint $table) {
            // Drop the existing unique constraint first
            $table->dropUnique('project_user_role_unique');
        });

        // Drop foreign key constraint before modifying column
        Schema::table('project_teams', function (Blueprint $table) {
            $table->dropForeign(['user_id']);
        });

        Schema::table('project_teams', function (Blueprint $table) {
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
            DB::statement('ALTER TABLE project_teams ADD CONSTRAINT project_teams_user_or_employee_check CHECK ((user_id IS NULL) != (employee_id IS NULL))');
        }
        
        // Add partial unique indexes for users and employees separately (PostgreSQL syntax)
        // This ensures a user can only be assigned once per project/role, and same for employees
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS project_user_role_unique ON project_teams (project_id, user_id, role) WHERE user_id IS NOT NULL');
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS project_employee_role_unique ON project_teams (project_id, employee_id, role) WHERE employee_id IS NOT NULL');
        } else {
            // For other databases, use regular unique constraints (less ideal but works)
            Schema::table('project_teams', function (Blueprint $table) {
                $table->unique(['project_id', 'user_id', 'role'], 'project_user_role_unique');
                $table->unique(['project_id', 'employee_id', 'role'], 'project_employee_role_unique');
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Drop check constraint
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('ALTER TABLE project_teams DROP CONSTRAINT IF EXISTS project_teams_user_or_employee_check');
        }
        
        // Drop partial unique indexes
        if (DB::getDriverName() === 'pgsql') {
            DB::statement('DROP INDEX IF EXISTS project_user_role_unique');
            DB::statement('DROP INDEX IF EXISTS project_employee_role_unique');
        } else {
            Schema::table('project_teams', function (Blueprint $table) {
                try {
                    $table->dropUnique('project_user_role_unique');
                } catch (\Exception $e) {
                    // Index might not exist
                }
                try {
                    $table->dropUnique('project_employee_role_unique');
                } catch (\Exception $e) {
                    // Index might not exist
                }
            });
        }
        
        Schema::table('project_teams', function (Blueprint $table) {
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

        Schema::table('project_teams', function (Blueprint $table) {
            // Remove new columns
            $table->dropColumn(['employee_id', 'assignable_type']);
            
            // Make user_id not nullable again
            $table->unsignedBigInteger('user_id')->nullable(false)->change();
            
            // Re-add foreign key constraint
            $table->foreign('user_id')->references('id')->on('users')->onDelete('cascade');
            
            // Restore original unique constraint
            $table->unique(['project_id', 'user_id', 'role'], 'project_user_role_unique');
        });
    }
};
