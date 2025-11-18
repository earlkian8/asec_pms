<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class InventoryTransaction extends Model
{
    use HasFactory;

    protected $fillable = [
        'inventory_item_id',
        'transaction_type',
        'stock_out_type',
        'quantity',
        'unit_price',
        'project_id',
        'project_material_allocation_id',
        'notes',
        'created_by',
        'transaction_date',
    ];

    protected $casts = [
        'quantity' => 'decimal:2',
        'unit_price' => 'decimal:2',
        'transaction_date' => 'date',
    ];

    public function inventoryItem()
    {
        return $this->belongsTo(InventoryItem::class);
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function materialAllocation()
    {
        return $this->belongsTo(ProjectMaterialAllocation::class, 'project_material_allocation_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }
}
