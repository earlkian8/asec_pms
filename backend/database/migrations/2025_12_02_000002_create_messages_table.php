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
        Schema::create('messages', function (Blueprint $table) {
            $table->id();
            $table->foreignId('chat_id')->constrained('chats')->onDelete('cascade');
            $table->enum('sender_type', ['client', 'admin']); // 'client' or 'admin'
            $table->foreignId('sender_id')->nullable(); // Can be client_id or user_id
            $table->text('message');
            $table->boolean('read')->default(false);
            $table->timestamp('read_at')->nullable();
            $table->timestamps();
            
            // Indexes for faster queries
            $table->index(['chat_id', 'created_at']);
            $table->index(['chat_id', 'read']);
            $table->index(['sender_type', 'sender_id']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('messages');
    }
};

