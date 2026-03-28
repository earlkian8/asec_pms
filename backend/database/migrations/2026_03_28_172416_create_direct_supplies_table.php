<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('direct_supplies', function (Blueprint $table) {
            $table->id();
            $table->string('supply_code')->unique();
            $table->string('supply_name');
            $table->text('description')->nullable();
            $table->string('category')->nullable();
            $table->string('unit_of_measure')->default('pieces');
            $table->decimal('unit_price', 10, 2)->nullable();
            $table->string('supplier_name');
            $table->string('supplier_contact')->nullable();
            $table->boolean('is_active')->default(true);
            $table->foreignId('created_by')->nullable()->constrained('users')->onDelete('set null');
            $table->timestamps();
            $table->softDeletes();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('direct_supplies');
    }
};
