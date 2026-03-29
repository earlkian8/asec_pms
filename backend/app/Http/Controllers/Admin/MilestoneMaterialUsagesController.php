<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\MilestoneMaterialUsage;
use App\Models\Project;
use App\Models\ProjectMilestone;
use App\Traits\ActivityLogsTrait;
use Illuminate\Http\Request;

class MilestoneMaterialUsagesController extends Controller
{
    use ActivityLogsTrait;

    public function store(Project $project, ProjectMilestone $milestone, Request $request)
    {
        $data = $request->validate([
            'project_material_allocation_id' => ['required', 'exists:project_material_allocations,id'],
            'quantity_used'                  => ['required', 'numeric', 'min:0.01'],
            'notes'                          => ['nullable', 'string'],
        ]);

        // Ensure allocation belongs to this project
        $allocation = $milestone->project->materialAllocations()
            ->findOrFail($data['project_material_allocation_id']);

        // Guard: cannot use more than available (received - already used across all milestones)
        $totalUsed = $allocation->milestoneUsages()->sum('quantity_used');
        $available = (float) $allocation->quantity_received - (float) $totalUsed;
        if ((float) $data['quantity_used'] > $available) {
            return back()->withErrors(['quantity_used' => "Cannot use more than available stock ({$available} {$allocation->inventoryItem?->unit_of_measure ?? $allocation->directSupply?->unit_of_measure ?? 'units'})."]);
        }

        $data['project_milestone_id'] = $milestone->id;
        $data['recorded_by']          = auth()->id();

        $usage = MilestoneMaterialUsage::create($data);

        $itemName = $allocation->inventoryItem?->item_name
            ?? $allocation->directSupply?->supply_name
            ?? 'Material';

        $this->adminActivityLogs(
            'Milestone Material Usage', 'Created',
            "Recorded usage of \"{$itemName}\" ({$data['quantity_used']}) for milestone \"{$milestone->name}\" in project \"{$project->project_name}\""
        );

        return back()->with('success', 'Material usage recorded successfully.');
    }

    public function update(Project $project, ProjectMilestone $milestone, MilestoneMaterialUsage $usage, Request $request)
    {
        abort_if($usage->project_milestone_id !== $milestone->id, 404);

        $data = $request->validate([
            'project_material_allocation_id' => ['required', 'exists:project_material_allocations,id'],
            'quantity_used'                  => ['required', 'numeric', 'min:0.01'],
            'notes'                          => ['nullable', 'string'],
        ]);

        $milestone->project->materialAllocations()->findOrFail($data['project_material_allocation_id']);

        // Guard: exclude this usage's own qty when checking available
        $allocation  = $milestone->project->materialAllocations()->findOrFail($data['project_material_allocation_id']);
        $totalUsed   = $allocation->milestoneUsages()->where('id', '!=', $usage->id)->sum('quantity_used');
        $available   = (float) $allocation->quantity_received - (float) $totalUsed;
        if ((float) $data['quantity_used'] > $available) {
            return back()->withErrors(['quantity_used' => "Cannot use more than available stock ({$available} {$allocation->inventoryItem?->unit_of_measure ?? $allocation->directSupply?->unit_of_measure ?? 'units'})."]);
        }

        $usage->update($data);

        $this->adminActivityLogs(
            'Milestone Material Usage', 'Updated',
            "Updated material usage for milestone \"{$milestone->name}\" in project \"{$project->project_name}\""
        );

        return back()->with('success', 'Material usage updated successfully.');
    }

    public function destroy(Project $project, ProjectMilestone $milestone, MilestoneMaterialUsage $usage)
    {
        abort_if($usage->project_milestone_id !== $milestone->id, 404);

        $usage->delete();

        $this->adminActivityLogs(
            'Milestone Material Usage', 'Deleted',
            "Deleted material usage from milestone \"{$milestone->name}\" in project \"{$project->project_name}\""
        );

        return back()->with('success', 'Material usage deleted successfully.');
    }
}
