<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('client_update_request_views', function (Blueprint $table) {
            $table->id();
            $table->foreignId('client_update_request_id')
                  ->constrained('client_update_requests')
                  ->onDelete('cascade');
            $table->foreignId('user_id')
                  ->constrained('users')
                  ->onDelete('cascade');
            $table->timestamp('viewed_at')->useCurrent();
            $table->timestamps();

            // One view record per user per request
            $table->unique(['client_update_request_id', 'user_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('client_update_request_views');
    }
};