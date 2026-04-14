<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProjectBoqItem extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'project_id',
        'project_boq_section_id',
        'item_code',
        'description',
        'unit',
        'quantity',
        'unit_cost',
        'total_cost',
        'resource_type',
        'planned_inventory_item_id',
        'planned_direct_supply_id',
        'planned_user_id',
        'planned_employee_id',
        'remarks',
        'sort_order',
    ];

    protected $casts = [
        'quantity'   => 'decimal:4',
        'unit_cost'  => 'decimal:2',
        'total_cost' => 'decimal:2',
        'planned_inventory_item_id' => 'integer',
        'planned_direct_supply_id' => 'integer',
        'planned_user_id' => 'integer',
        'planned_employee_id' => 'integer',
        'sort_order' => 'integer',
    ];

    protected static function booted(): void
    {
        // Keep total_cost consistent with quantity * unit_cost so callers
        // don't have to remember to recompute when they edit one side.
        static::saving(function (self $item) {
            if ($item->isDirty(['quantity', 'unit_cost']) || !$item->exists) {
                $item->total_cost = round((float) $item->quantity * (float) $item->unit_cost, 2);
            }
        });
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function section()
    {
        return $this->belongsTo(ProjectBoqSection::class, 'project_boq_section_id');
    }

    public function plannedInventoryItem()
    {
        return $this->belongsTo(InventoryItem::class, 'planned_inventory_item_id');
    }

    public function plannedDirectSupply()
    {
        return $this->belongsTo(DirectSupply::class, 'planned_direct_supply_id');
    }

    public function plannedUser()
    {
        return $this->belongsTo(User::class, 'planned_user_id');
    }

    public function plannedEmployee()
    {
        return $this->belongsTo(Employee::class, 'planned_employee_id');
    }

    public function materialAllocations()
    {
        return $this->hasMany(ProjectMaterialAllocation::class, 'boq_item_id');
    }

    public function milestones()
    {
        return $this->hasMany(ProjectMilestone::class, 'boq_item_id');
    }

    public function tasks()
    {
        return $this->hasMany(ProjectTask::class, 'boq_item_id');
    }

    public function laborCosts()
    {
        return $this->hasMany(ProjectLaborCost::class, 'boq_item_id');
    }

    public function progressUpdates()
    {
        return $this->hasMany(ProgressUpdate::class, 'boq_item_id');
    }

    /**
     * Roll up planned vs actual for the details page.
     * Actual material = sum of received qty * unit price.
     * Actual labor = sum of labor cost totals tagged to this BOQ item.
     */
    public function plannedVsActual(): array
    {
        $planned = (float) $this->total_cost;

        $materialActual = (float) $this->materialAllocations()
            ->get()
            ->sum(fn ($a) => (float) ($a->unit_price ?? 0) * (float) ($a->quantity_received ?? 0));

        $laborActual = (float) $this->laborCosts()->sum('gross_pay');

        $totalActual = $materialActual + $laborActual;

        return [
            'planned_cost'    => $planned,
            'material_actual' => $materialActual,
            'labor_actual'    => $laborActual,
            'total_actual'    => $totalActual,
            'variance'        => $planned - $totalActual,
        ];
    }
}
