<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ProjectMaterialAllocation extends Model
{
    protected $fillable = [
        'project_id',
        'inventory_item_id',
        'quantity_allocated',
        'quantity_received',
        'quantity_remaining',
        'status',
        'allocated_by',
        'allocated_at',
        'notes',
    ];

    protected $casts = [
        'quantity_allocated' => 'decimal:2',
        'quantity_received' => 'decimal:2',
        'allocated_at' => 'datetime',
    ];

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function inventoryItem()
    {
        return $this->belongsTo(InventoryItem::class);
    }

    public function allocatedBy()
    {
        return $this->belongsTo(User::class, 'allocated_by');
    }

    public function receivingReports()
    {
        return $this->hasMany(MaterialReceivingReport::class);
    }

    public function transactions()
    {
        return $this->hasMany(InventoryTransaction::class);
    }

    // Auto-calculate quantity_remaining before saving
    protected static function boot()
    {
        parent::boot();

        static::saving(function ($model) {
            if ($model->quantity_allocated !== null && $model->quantity_received !== null) {
                $model->quantity_remaining = $model->quantity_allocated - $model->quantity_received;
            }
        });
    }

    // Calculate quantity remaining (fallback if not saved)
    public function getQuantityRemainingAttribute($value)
    {
        if ($value !== null) {
            return $value;
        }

        return $this->quantity_allocated - $this->quantity_received;
    }

    // Update status based on received quantity
    public function updateStatus()
    {
        if ($this->quantity_received >= $this->quantity_allocated) {
            $this->status = 'received';
        } elseif ($this->quantity_received > 0) {
            $this->status = 'partial';
        } else {
            $this->status = 'pending';
        }
        $this->save();
    }
}
