<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('permission_delegations', function (Blueprint $table) {
            $table->id();
            $table->foreignId('granted_by')->constrained('users')->cascadeOnDelete();
            $table->foreignId('granted_to')->constrained('users')->cascadeOnDelete();
            $table->timestamps();

            $table->unique(['granted_by', 'granted_to']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('permission_delegations');
    }
};
