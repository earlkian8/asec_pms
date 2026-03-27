<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectMaterialAllocation;

class MaterialAllocationService
{
    public function getProjectMaterialAllocationsData(Project $project)
    {
        $search = request('search');
        $statusFilter = request('status_filter', 'all');

        // Load material allocations with related data and pagination
        $allocations = ProjectMaterialAllocation::where('project_id', $project->id)
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereHas('inventoryItem', function ($itemQuery) use ($search) {
                        $itemQuery->where('item_name', 'like', "%{$search}%")
                            ->orWhere('item_code', 'like', "%{$search}%");
                    })
                    ->orWhere('notes', 'like', "%{$search}%");
                });
            })
            ->when($statusFilter !== 'all', function ($query) use ($statusFilter) {
                $query->where('status', $statusFilter);
            })
            ->with([
                'inventoryItem',
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
            ->get(['id', 'inventory_item_id', 'quantity_allocated', 'quantity_received']);

        $totalAllocatedCost = $allAllocations->sum(fn ($a) =>
            ($a->quantity_allocated ?? 0) * ($a->inventoryItem->unit_price ?? 0)
        );
        $totalReceivedCost = $allAllocations->sum(fn ($a) =>
            ($a->quantity_received ?? 0) * ($a->inventoryItem->unit_price ?? 0)
        );
        $contractAmount   = (float) ($project->contract_amount ?? 0);
        $budgetRemaining  = $contractAmount - $totalAllocatedCost;

        return [
            'project'      => $project->load('client'),
            'allocations'  => $allocations,
            'search'       => $search,
            'statusFilter' => $statusFilter,
            'budgetSummary' => [
                'contract_amount'      => $contractAmount,
                'total_allocated_cost' => $totalAllocatedCost,
                'total_received_cost'  => $totalReceivedCost,
                'budget_remaining'     => $budgetRemaining,
            ],
        ];
    }
}
