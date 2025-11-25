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
        // For PostgreSQL, Laravel creates a CHECK constraint for enums
        // We need to drop the old constraint and create a new one
        if (DB::getDriverName() === 'pgsql') {
            // Drop the existing check constraint
            DB::statement('ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_project_type_check');
            
            // Add the new check constraint with all allowed values
            DB::statement("
                ALTER TABLE projects 
                ADD CONSTRAINT projects_project_type_check 
                CHECK (project_type IN (
                    'design', 'construction', 'consultancy', 'maintenance', 
                    'installation', 'commissioning', 'inspection', 'renovation', 
                    'site_layout', 'surveying', 'relocation', 'excavation', 
                    'structural', 'civil', 'mechanical', 'electrical', 
                    'environmental', 'geotechnical'
                ))
            ");
        } else {
            // For other databases, modify the column directly
            Schema::table('projects', function (Blueprint $table) {
                $table->enum('project_type', [
                    'design', 'construction', 'consultancy', 'maintenance', 
                    'installation', 'commissioning', 'inspection', 'renovation', 
                    'site_layout', 'surveying', 'relocation', 'excavation', 
                    'structural', 'civil', 'mechanical', 'electrical', 
                    'environmental', 'geotechnical'
                ])->change();
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
            DB::statement('ALTER TABLE projects DROP CONSTRAINT IF EXISTS projects_project_type_check');
            
            // Restore the original constraint
            DB::statement("
                ALTER TABLE projects 
                ADD CONSTRAINT projects_project_type_check 
                CHECK (project_type IN (
                    'design', 'construction', 'consultancy', 'maintenance', 
                    'installation', 'commissioning', 'inspection', 'renovation', 
                    'site_layout', 'surveying', 'relocation', 'excavation'
                ))
            ");
        } else {
            Schema::table('projects', function (Blueprint $table) {
                $table->enum('project_type', [
                    'design', 'construction', 'consultancy', 'maintenance', 
                    'installation', 'commissioning', 'inspection', 'renovation', 
                    'site_layout', 'surveying', 'relocation', 'excavation'
                ])->change();
            });
        }
    }
};

