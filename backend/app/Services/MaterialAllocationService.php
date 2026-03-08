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

        return [
            'project' => $project->load('client'),
            'allocations' => $allocations,
            'search' => $search,
            'statusFilter' => $statusFilter,
        ];
    }
}
