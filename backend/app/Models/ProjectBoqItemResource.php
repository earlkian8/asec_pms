<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProjectBoqItemResource extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'project_boq_item_id',
        'resource_category',
        'source_type',
        'inventory_item_id',
        'direct_supply_id',
        'user_id',
        'employee_id',
        'resource_name',
        'unit',
        'quantity',
        'unit_price',
        'total_cost',
        'remarks',
        'sort_order',
    ];

    protected $casts = [
        'quantity' => 'decimal:4',
        'unit_price' => 'decimal:2',
        'total_cost' => 'decimal:2',
        'sort_order' => 'integer',
    ];

    protected static function booted(): void
    {
        static::saving(function (self $resource) {
            if ($resource->isDirty(['quantity', 'unit_price']) || !$resource->exists) {
                $resource->total_cost = round((float) $resource->quantity * (float) $resource->unit_price, 2);
            }
        });
    }

    public function boqItem()
    {
        return $this->belongsTo(ProjectBoqItem::class, 'project_boq_item_id');
    }

    public function inventoryItem()
    {
        return $this->belongsTo(InventoryItem::class, 'inventory_item_id');
    }

    public function directSupply()
    {
        return $this->belongsTo(DirectSupply::class, 'direct_supply_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }
}
