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
        // First, update any existing 'planning' records to 'active'
        DB::table('projects')
            ->where('status', 'planning')
            ->update(['status' => 'active']);

        // For PostgreSQL, Laravel creates a CHECK constraint for enums
        // We need to drop the old constraint and create a new one
        if (DB::getDriverName() === 'pgsql') {
            // Drop the existing check constraint
            DB::statement('ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check');
            
            // Add the new check constraint without 'planning'
            DB::statement("
                ALTER TABLE projects 
                ADD CONSTRAINT projects_status_check 
                CHECK (status IN ('active', 'on_hold', 'completed', 'cancelled'))
            ");
            
            // Update the default value
            DB::statement("ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'active'");
        } else {
            // For other databases, modify the column directly
            Schema::table('projects', function (Blueprint $table) {
                $table->enum('status', ['active', 'on_hold', 'completed', 'cancelled'])
                    ->default('active')
                    ->change();
            });
        }
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        if (DB::getDriverName() === 'pgsql') {
            // Drop the new constraint
            DB::statement('ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_status_check');
            
            // Restore the original constraint with 'planning'
            DB::statement("
                ALTER TABLE projects 
                ADD CONSTRAINT projects_status_check 
                CHECK (status IN ('planning', 'active', 'on_hold', 'completed', 'cancelled'))
            ");
            
            // Restore the default value
            DB::statement("ALTER TABLE projects ALTER COLUMN status SET DEFAULT 'planning'");
        } else {
            Schema::table('projects', function (Blueprint $table) {
                $table->enum('status', ['planning', 'active', 'on_hold', 'completed', 'cancelled'])
                    ->default('planning')
                    ->change();
            });
        }
    }
};

