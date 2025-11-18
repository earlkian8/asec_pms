<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryItem extends Model
{
    use HasFactory;

    protected $fillable = [
        'item_code',
        'item_name',
        'description',
        'category',
        'unit_of_measure',
        'current_stock',
        'min_stock_level',
        'unit_price',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'current_stock' => 'decimal:2',
        'min_stock_level' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'is_active' => 'boolean',
    ];

    public function transactions()
    {
        return $this->hasMany(InventoryTransaction::class);
    }

    public function materialAllocations()
    {
        return $this->hasMany(ProjectMaterialAllocation::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // Calculate current stock from transactions
    public function calculateCurrentStock()
    {
        $stockIn = $this->transactions()
            ->where('transaction_type', 'stock_in')
            ->sum('quantity');
        
        $stockOut = $this->transactions()
            ->where('transaction_type', 'stock_out')
            ->sum('quantity');
        
        return $stockIn - $stockOut;
    }

    // Check if stock is low
    public function isLowStock()
    {
        if (!$this->min_stock_level) {
            return false;
        }
        return $this->current_stock <= $this->min_stock_level;
    }
}
