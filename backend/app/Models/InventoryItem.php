<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class InventoryItem extends Model
{
    use HasFactory, SoftDeletes;

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
        'is_archived',       // ← new
        'archived_at',       // ← new
        'created_by',
    ];

    protected $casts = [
        'current_stock'   => 'decimal:2',
        'min_stock_level' => 'decimal:2',
        'unit_price'      => 'decimal:2',
        'is_active'       => 'boolean',
        'is_archived'     => 'boolean',   // ← new
        'archived_at'     => 'datetime',  // ← new
    ];

    // -------------------------------------------------------------------------
    // Relationships
    // -------------------------------------------------------------------------

    public function transactions()
    {
        return $this->hasMany(InventoryTransaction::class, 'inventory_item_id');
    }

    public function materialAllocations()
    {
        return $this->hasMany(ProjectMaterialAllocation::class);
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // -------------------------------------------------------------------------
    // Business logic
    // -------------------------------------------------------------------------

    /**
     * Calculate current stock from transactions.
     *
     * Stock In transactions always add to stock.
     * Stock Out transactions deduct stock immediately EXCEPT for 'project_use'
     * which is only deducted once a receiving report is created (marked via notes).
     */
    public function calculateCurrentStock(): float|int
    {
        try {
            $stockIn = $this->transactions()
                ->where('transaction_type', 'stock_in')
                ->sum('quantity');

            $stockOut = $this->transactions()
                ->where('transaction_type', 'stock_out')
                ->where(function ($query) {
                    $query->where('stock_out_type', '!=', 'project_use')
                          ->orWhere(function ($q) {
                              // Include project_use transactions only after a receiving report is created
                              $q->where('stock_out_type', 'project_use')
                                ->where('notes', 'like', '%[RECEIVING_REPORT_ID:%');
                          });
                })
                ->sum('quantity');

            return $stockIn - $stockOut;
        } catch (\Exception $e) {
            return $this->current_stock ?? 0;
        }
    }

    /**
     * Check if the item's current stock is at or below the minimum stock level.
     */
    public function isLowStock(): bool
    {
        if (!$this->min_stock_level) {
            return false;
        }
        return $this->current_stock <= $this->min_stock_level;
    }

    // -------------------------------------------------------------------------
    // Scopes
    // -------------------------------------------------------------------------

    /**
     * Scope: active (non-archived) items only.
     */
    public function scopeActive($query)
    {
        return $query->where('is_archived', false);
    }

    /**
     * Scope: archived items only.
     */
    public function scopeArchived($query)
    {
        return $query->where('is_archived', true);
    }
}