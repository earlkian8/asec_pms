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
        Schema::create('project_miscellaneous_expenses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('project_id')->constrained('projects')->onDelete('cascade');
            $table->string('expense_type', 100); // e.g., 'transportation', 'meals', 'supplies', 'equipment', 'other'
            $table->string('expense_name', 255); // Name/description of the expense
            $table->date('expense_date');
            $table->decimal('amount', 12, 2);
            $table->text('description')->nullable();
            $table->text('notes')->nullable();
            $table->string('receipt_number', 100)->nullable(); // Receipt or invoice number
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();

            // Indexes for faster queries
            $table->index(['project_id', 'expense_date']);
            $table->index('expense_type');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('project_miscellaneous_expenses');
    }
};
