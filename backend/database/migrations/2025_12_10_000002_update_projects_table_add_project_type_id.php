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
        // First, create the project_type_id column
        Schema::table('projects', function (Blueprint $table) {
            $table->foreignId('project_type_id')->nullable()->after('client_id')->constrained('project_types')->onDelete('set null');
        });

        // Migrate existing project_type enum values to project_types table and update projects
        // $projectTypes = [
        //     'design', 'construction', 'consultancy', 'maintenance', 'installation',
        //     'commissioning', 'inspection', 'renovation', 'site_layout', 'surveying',
        //     'relocation', 'excavation', 'structural', 'civil', 'mechanical',
        //     'electrical', 'environmental', 'geotechnical'
        // ];

        // foreach ($projectTypes as $type) {
        //     $projectTypeId = DB::table('project_types')->insertGetId([
        //         'name' => ucfirst(str_replace('_', ' ', $type)),
        //         'description' => null,
        //         'is_active' => true,
        //         'created_at' => now(),
        //         'updated_at' => now(),
        //     ]);

        //     // Update projects with this project_type
        //     DB::table('projects')
        //         ->where('project_type', $type)
        //         ->update(['project_type_id' => $projectTypeId]);
        // }

        // Drop the old enum column after migration
        Schema::table('projects', function (Blueprint $table) {
            $table->dropColumn('project_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        // Add back the enum column
        Schema::table('projects', function (Blueprint $table) {
            $table->enum('project_type', [
                'design', 'construction', 'consultancy', 'maintenance', 'installation',
                'commissioning', 'inspection', 'renovation', 'site_layout', 'surveying',
                'relocation', 'excavation', 'structural', 'civil', 'mechanical',
                'electrical', 'environmental', 'geotechnical'
            ])->nullable()->after('client_id');
        });

        // Migrate data back (simplified - just set first available type)
        DB::table('projects')
            ->whereNotNull('project_type_id')
            ->update(['project_type' => 'construction']);

        // Drop the foreign key and column
        Schema::table('projects', function (Blueprint $table) {
            $table->dropForeign(['project_type_id']);
            $table->dropColumn('project_type_id');
        });
    }
};

