<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class MilestoneMaterialUsage extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'project_milestone_id',
        'project_material_allocation_id',
        'quantity_used',
        'notes',
        'recorded_by',
    ];

    protected $casts = [
        'quantity_used' => 'decimal:2',
    ];

    public function milestone()
    {
        return $this->belongsTo(ProjectMilestone::class, 'project_milestone_id');
    }

    public function allocation()
    {
        return $this->belongsTo(ProjectMaterialAllocation::class, 'project_material_allocation_id');
    }

    public function recordedBy()
    {
        return $this->belongsTo(User::class, 'recorded_by');
    }
}
