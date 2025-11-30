<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class MaterialReceivingReport extends Model
{
    protected $fillable = [
        'project_material_allocation_id',
        'quantity_received',
        'received_by',
        'received_at',
        'condition',
        'notes',
    ];

    protected $casts = [
        'quantity_received' => 'decimal:2',
        'received_at' => 'datetime',
    ];

    public function materialAllocation()
    {
        return $this->belongsTo(ProjectMaterialAllocation::class, 'project_material_allocation_id');
    }

    public function receivedBy()
    {
        return $this->belongsTo(User::class, 'received_by');
    }
}
