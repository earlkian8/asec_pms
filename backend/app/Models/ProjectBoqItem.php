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
        'material_cost',
        'labor_cost',
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
        'quantity'      => 'decimal:4',
        'unit_cost'     => 'decimal:2',
        'material_cost' => 'decimal:2',
        'labor_cost'    => 'decimal:2',
        'total_cost'    => 'decimal:2',
        'planned_inventory_item_id' => 'integer',
        'planned_direct_supply_id' => 'integer',
        'planned_user_id' => 'integer',
        'planned_employee_id' => 'integer',
        'sort_order' => 'integer',
    ];

    protected static function booted(): void
    {
        // Standard BOQ shape: when resources are loaded, derive
        // material/labor/unit/total from them. Quantity & unit stay
        // user-controlled so the BOQ reads like a real cost proposal.
        static::saving(function (self $item) {
            if ($item->relationLoaded('resources') && $item->resources->count() > 0) {
                $material = (float) $item->resources
                    ->where('resource_category', 'material')->sum('total_cost');
                $labor    = (float) $item->resources
                    ->where('resource_category', 'labor')->sum('total_cost');
                $unitCost = round($material + $labor, 2);
                $quantity = (float) $item->quantity;
                $quantity = $quantity > 0 ? $quantity : 1;
                $total    = round($unitCost * $quantity, 2);

                $item->material_cost = round($material, 2);
                $item->labor_cost    = round($labor, 2);
                $item->total_cost    = $total;
                $item->unit_cost     = $unitCost;
                $item->quantity      = $quantity;
                return;
            }

            if ($item->isDirty(['quantity', 'unit_cost']) || !$item->exists) {
                $item->total_cost = round((float) $item->quantity * (float) $item->unit_cost, 2);
            }
        });
    }

    /**
     * Recompute material/labor/unit/total from current persisted resources.
     * Use after syncing resources outside the saving hook.
     */
    public function recomputeFromResources(): void
    {
        $this->load('resources');
        $this->save();
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function section()
    {
        return $this->belongsTo(ProjectBoqSection::class, 'project_boq_section_id');
    }

    public function resources()
    {
        return $this->hasMany(ProjectBoqItemResource::class, 'project_boq_item_id')->orderBy('sort_order');
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
     * Actual material = sum of quantity_used * unit_price across milestone usages.
     * Actual labor = submitted payroll only.
     */
    public function plannedVsActual(): array
    {
        $plannedMaterial = (float) $this->material_cost;
        $plannedLabor    = (float) $this->labor_cost;
        $planned         = (float) $this->total_cost;

        $materialActual = (float) $this->materialAllocations()
            ->with('milestoneUsages')
            ->get()
            ->sum(fn ($a) => $a->milestoneUsages->sum('quantity_used') * (float) ($a->unit_price ?? 0));

        $laborActual = (float) $this->laborCosts()
            ->where('status', 'submitted')
            ->sum('gross_pay');

        $totalActual = $materialActual + $laborActual;
        $variance    = $planned - $totalActual;
        $variancePct = $planned > 0 ? round(($variance / $planned) * 100, 2) : null;

        return [
            'planned_material' => round($plannedMaterial, 2),
            'planned_labor'    => round($plannedLabor, 2),
            'planned_cost'     => round($planned, 2),
            'material_actual'  => round($materialActual, 2),
            'labor_actual'     => round($laborActual, 2),
            'total_actual'     => round($totalActual, 2),
            'variance'         => round($variance, 2),
            'variance_pct'     => $variancePct,
        ];
    }
}
