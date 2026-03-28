<?php

namespace App\Services;

use App\Models\DirectSupply;
use App\Models\Project;
use App\Models\ProjectMaterialAllocation;

class MaterialAllocationService
{
    public function getProjectMaterialAllocationsData(Project $project)
    {
        $search = request('search');
        $statusFilter = request('status_filter', 'all');

        $allocations = ProjectMaterialAllocation::where('project_id', $project->id)
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereHas('inventoryItem', function ($itemQuery) use ($search) {
                        $itemQuery->where('item_name', 'like', "%{$search}%")
                            ->orWhere('item_code', 'like', "%{$search}%");
                    })
                    ->orWhereHas('directSupply', function ($dsQuery) use ($search) {
                        $dsQuery->where('supply_name', 'like', "%{$search}%")
                            ->orWhere('supply_code', 'like', "%{$search}%");
                    })
                    ->orWhere('notes', 'like', "%{$search}%");
                });
            })
            ->when($statusFilter !== 'all', function ($query) use ($statusFilter) {
                $query->where('status', $statusFilter);
            })
            ->with([
                'inventoryItem',
                'directSupply',
                'allocatedBy',
                'receivingReports' => function ($query) {
                    $query->with('receivedBy')->orderBy('received_at', 'desc');
                }
            ])
            ->withCount('receivingReports')
            ->orderBy('allocated_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        // Budget summary — computed from ALL allocations (not just current page)
        $allAllocations = ProjectMaterialAllocation::where('project_id', $project->id)
            ->with('inventoryItem:id,unit_price')
            ->get(['id', 'inventory_item_id', 'direct_supply_id', 'unit_price', 'quantity_allocated', 'quantity_received']);

        $totalAllocatedCost = $allAllocations->sum(function ($a) {
            $price = $a->unit_price ?? $a->inventoryItem?->unit_price ?? 0;
            return ($a->quantity_allocated ?? 0) * $price;
        });
        $totalReceivedCost = $allAllocations->sum(function ($a) {
            $price = $a->unit_price ?? $a->inventoryItem?->unit_price ?? 0;
            return ($a->quantity_received ?? 0) * $price;
        });
        $contractAmount  = (float) ($project->contract_amount ?? 0);
        $budgetRemaining = $contractAmount - $totalAllocatedCost;

        $directSupplyItems = DirectSupply::where('is_active', true)
            ->orderBy('supply_name')
            ->get(['id', 'supply_code', 'supply_name', 'unit_of_measure', 'unit_price', 'supplier_name']);

        return [
            'project'           => $project->load('client'),
            'allocations'       => $allocations,
            'search'            => $search,
            'statusFilter'      => $statusFilter,
            'directSupplyItems' => $directSupplyItems,
            'budgetSummary'     => [
                'contract_amount'      => $contractAmount,
                'total_allocated_cost' => $totalAllocatedCost,
                'total_received_cost'  => $totalReceivedCost,
                'budget_remaining'     => $budgetRemaining,
            ],
        ];
    }
}
