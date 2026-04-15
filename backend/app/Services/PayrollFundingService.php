<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectLaborCost;
use Illuminate\Support\Facades\DB;

class PayrollFundingService
{
    /**
     * Compute available contract budget for additional payroll reservations.
     */
    public function getAvailablePayrollBudget(Project $project, ?int $excludeLaborCostId = null): float
    {
        $contractAmount = (float) ($project->contract_amount ?? 0);

        $laborQuery = ProjectLaborCost::query()
            ->where('project_id', $project->id)
            ->whereIn('status', [
                ProjectLaborCost::STATUS_SUBMITTED,
                ProjectLaborCost::STATUS_APPROVED,
                ProjectLaborCost::STATUS_PAID,
            ]);

        if ($excludeLaborCostId) {
            $laborQuery->where('id', '!=', $excludeLaborCostId);
        }

        $laborSpent = (float) $laborQuery->sum('gross_pay');

        $materialSpent = (float) DB::table('material_receiving_reports as mrr')
            ->join('project_material_allocations as pma', 'mrr.project_material_allocation_id', '=', 'pma.id')
            ->leftJoin('inventory_items as ii', 'pma.inventory_item_id', '=', 'ii.id')
            ->leftJoin('direct_supplies as ds', 'pma.direct_supply_id', '=', 'ds.id')
            ->whereNull('mrr.deleted_at')
            ->whereNull('pma.deleted_at')
            ->where('pma.project_id', $project->id)
            ->sum(DB::raw('mrr.quantity_received * COALESCE(pma.unit_price, ii.unit_price, ds.unit_price, 0)'));

        $miscSpent = (float) DB::table('project_miscellaneous_expenses')
            ->where('project_id', $project->id)
            ->whereNull('deleted_at')
            ->sum('amount');

        return round($contractAmount - ($laborSpent + $materialSpent + $miscSpent), 2);
    }

    /**
     * Validate if the project can reserve/pay the requested payroll amount.
     * Returns null when valid, else a human-readable error message.
     */
    public function validateFunding(Project $project, float $requestedPayrollAmount, ?int $excludeLaborCostId = null): ?string
    {
        $available = $this->getAvailablePayrollBudget($project, $excludeLaborCostId);

        if ($requestedPayrollAmount > $available) {
            return 'Insufficient project budget for this payroll. Available: PHP ' . number_format(max(0, $available), 2)
                . ', requested: PHP ' . number_format($requestedPayrollAmount, 2) . '.';
        }

        return null;
    }
}
