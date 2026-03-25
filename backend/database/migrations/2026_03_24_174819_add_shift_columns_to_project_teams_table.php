<?php
 
use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;
 
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('project_teams', function (Blueprint $table) {
            $table->string('time_slot', 20)->nullable()->after('end_date');   // morning|afternoon|evening|fullday
            $table->string('work_hours', 20)->nullable()->after('time_slot'); // e.g. "08:00–12:00"
        });
    }
 
    public function down(): void
    {
        Schema::table('project_teams', function (Blueprint $table) {
            $table->dropColumn(['time_slot', 'work_hours']);
        });
    }
};