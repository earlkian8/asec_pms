<?php

namespace App\Http\Controllers\Api\TaskManagement;

use App\Http\Controllers\Controller;
use App\Models\MilestoneMaterialUsage;
use App\Models\Notification;
use App\Models\Project;
use App\Models\ProjectMaterialAllocation;
use App\Models\ProjectMilestone;
use App\Models\ProjectTeam;
use App\Services\TaskManagementAuthorization;
use Illuminate\Http\Request;

class MilestonesController extends Controller
{
    public function index(Request $request, Project $project)
    {
        $user  = $request->user();
        $authz = app(TaskManagementAuthorization::class);

        if (!$authz->isAssignedToProject($user, $project)) {
            return response()->json(['success' => false, 'message' => 'Project not found or you do not have access to it'], 404);
        }

        $milestones = ProjectMilestone::query()
            ->where('project_id', $project->id)
            ->withCount([
                'tasks as totalTasks',
                'tasks as completedTasks' => fn ($q) => $q->where('status', 'completed'),
            ])
            ->with([
                'materialUsages' => fn ($q) => $q->with([
                    'allocation.inventoryItem',
                    'allocation.directSupply',
                    'recordedBy',
                ])->orderBy('created_at', 'desc'),
            ])
            ->orderBy('due_date', 'asc')
            ->get()
            ->map(fn (ProjectMilestone $m) => $this->formatMilestone($m))
            ->values();

        // Project allocations for dropdown (received - used = available)
        $projectAllocations = ProjectMaterialAllocation::where('project_id', $project->id)
            ->with(['inventoryItem', 'directSupply', 'milestoneUsages'])
            ->get()
            ->map(fn ($a) => [
                'id'           => $a->id,
                'name'         => $a->inventoryItem?->item_name ?? $a->directSupply?->supply_name ?? 'Unknown',
                'code'         => $a->inventoryItem?->item_code ?? $a->directSupply?->supply_code ?? '---',
                'unit'         => $a->inventoryItem?->unit_of_measure ?? $a->directSupply?->unit_of_measure ?? 'units',
                'isDirect'     => (bool) $a->direct_supply_id,
                'qtyAllocated' => (float) $a->quantity_allocated,
                'qtyReceived'  => (float) $a->quantity_received,
                'qtyUsed'      => (float) $a->milestoneUsages->sum('quantity_used'),
            ]);

        return response()->json([
            'success'            => true,
            'data'               => $milestones,
            'projectAllocations' => $projectAllocations,
        ]);
    }

    public function store(Request $request, Project $project)
    {
        $user  = $request->user();
        $authz = app(TaskManagementAuthorization::class);

        if (!$authz->isAssignedToProject($user, $project)) {
            return response()->json(['success' => false, 'message' => 'Project not found or you do not have access to it'], 404);
        }

        $data = $request->validate([
            'name'               => 'required|string|max:255',
            'description'        => 'nullable|string',
            'start_date'         => 'nullable|date',
            'due_date'           => 'nullable|date|after_or_equal:start_date',
            'billing_percentage' => 'nullable|numeric|min:0|max:100',
        ]);

        $milestone = $project->milestones()->create(array_merge($data, ['status' => 'pending']));

        return response()->json([
            'success' => true,
            'message' => 'Milestone created successfully',
            'data'    => $this->formatMilestone($milestone),
        ]);
    }

    public function update(Request $request, Project $project, ProjectMilestone $milestone)
    {
        $user  = $request->user();
        $authz = app(TaskManagementAuthorization::class);

        if ($milestone->project_id !== $project->id || !$authz->isAssignedToProject($user, $project)) {
            return response()->json(['success' => false, 'message' => 'Milestone not found or you do not have access to it'], 404);
        }

        $data = $request->validate([
            'name'               => 'required|string|max:255',
            'description'        => 'nullable|string',
            'start_date'         => 'nullable|date',
            'due_date'           => 'nullable|date|after_or_equal:start_date',
            'billing_percentage' => 'nullable|numeric|min:0|max:100',
        ]);

        // Auto-compute status from tasks
        $tasks       = $milestone->tasks()->get(['status']);
        $taskCount   = $tasks->count();
        if ($taskCount === 0) {
            $computedStatus = 'pending';
        } elseif ($tasks->every(fn ($t) => $t->status === 'completed')) {
            $computedStatus = 'completed';
        } elseif ($tasks->contains(fn ($t) => in_array($t->status, ['in_progress', 'completed']))) {
            $computedStatus = 'in_progress';
        } else {
            $computedStatus = 'pending';
        }

        $milestone->update(array_merge($data, ['status' => $computedStatus]));

        if ($computedStatus === 'completed' && $milestone->wasChanged('status')) {
            $teamUserIds = ProjectTeam::where('project_id', $project->id)
                ->whereNotNull('user_id')->pluck('user_id')->unique();
            foreach ($teamUserIds as $uid) {
                Notification::create([
                    'user_id'    => $uid,
                    'project_id' => $project->id,
                    'type'       => 'milestone',
                    'title'      => 'Milestone Completed',
                    'message'    => "Milestone '{$milestone->name}' has been completed in project '{$project->project_name}'.",
                    'read'       => false,
                ]);
            }
        }

        return response()->json([
            'success' => true,
            'message' => 'Milestone updated successfully',
            'data'    => $this->formatMilestone($milestone->fresh(['materialUsages.allocation.inventoryItem', 'materialUsages.allocation.directSupply', 'materialUsages.recordedBy'])),
        ]);
    }

    public function destroy(Request $request, Project $project, ProjectMilestone $milestone)
    {
        $user  = $request->user();
        $authz = app(TaskManagementAuthorization::class);

        if ($milestone->project_id !== $project->id || !$authz->isAssignedToProject($user, $project)) {
            return response()->json(['success' => false, 'message' => 'Milestone not found or you do not have access to it'], 404);
        }

        $milestone->delete();

        return response()->json(['success' => true, 'message' => 'Milestone deleted successfully']);
    }

    // ── Material Usage ────────────────────────────────────────────────────────

    public function storeMaterialUsage(Request $request, Project $project, ProjectMilestone $milestone)
    {
        $user  = $request->user();
        $authz = app(TaskManagementAuthorization::class);

        if ($milestone->project_id !== $project->id || !$authz->isAssignedToProject($user, $project)) {
            return response()->json(['success' => false, 'message' => 'Milestone not found or you do not have access to it'], 404);
        }

        $data = $request->validate([
            'project_material_allocation_id' => ['required', 'exists:project_material_allocations,id'],
            'quantity_used'                  => ['required', 'numeric', 'min:0.01'],
            'notes'                          => ['nullable', 'string'],
        ]);

        $allocation = $project->materialAllocations()->findOrFail($data['project_material_allocation_id']);

        $totalUsed = $allocation->milestoneUsages()->sum('quantity_used');
        $available = (float) $allocation->quantity_received - (float) $totalUsed;
        $unit      = $allocation->inventoryItem?->unit_of_measure ?? $allocation->directSupply?->unit_of_measure ?? 'units';

        if ((float) $data['quantity_used'] > $available) {
            return response()->json([
                'success' => false,
                'message' => "Cannot use more than available stock ({$available} {$unit}).",
                'errors'  => ['quantity_used' => ["Cannot use more than available stock ({$available} {$unit})."]],
            ], 422);
        }

        $usage = MilestoneMaterialUsage::create([
            'project_milestone_id'           => $milestone->id,
            'project_material_allocation_id' => $data['project_material_allocation_id'],
            'quantity_used'                  => $data['quantity_used'],
            'notes'                          => $data['notes'] ?? null,
            'recorded_by'                    => $user->id,
        ]);

        $usage->load(['allocation.inventoryItem', 'allocation.directSupply', 'recordedBy']);

        return response()->json([
            'success' => true,
            'message' => 'Material usage recorded successfully.',
            'data'    => $this->formatUsage($usage),
        ]);
    }

    public function updateMaterialUsage(Request $request, Project $project, ProjectMilestone $milestone, MilestoneMaterialUsage $usage)
    {
        $user  = $request->user();
        $authz = app(TaskManagementAuthorization::class);

        if ($milestone->project_id !== $project->id || $usage->project_milestone_id !== $milestone->id || !$authz->isAssignedToProject($user, $project)) {
            return response()->json(['success' => false, 'message' => 'Not found or no access'], 404);
        }

        $data = $request->validate([
            'project_material_allocation_id' => ['required', 'exists:project_material_allocations,id'],
            'quantity_used'                  => ['required', 'numeric', 'min:0.01'],
            'notes'                          => ['nullable', 'string'],
        ]);

        $allocation = $project->materialAllocations()->findOrFail($data['project_material_allocation_id']);
        $totalUsed  = $allocation->milestoneUsages()->where('id', '!=', $usage->id)->sum('quantity_used');
        $available  = (float) $allocation->quantity_received - (float) $totalUsed;
        $unit       = $allocation->inventoryItem?->unit_of_measure ?? $allocation->directSupply?->unit_of_measure ?? 'units';

        if ((float) $data['quantity_used'] > $available) {
            return response()->json([
                'success' => false,
                'message' => "Cannot use more than available stock ({$available} {$unit}).",
                'errors'  => ['quantity_used' => ["Cannot use more than available stock ({$available} {$unit})."]],
            ], 422);
        }

        $usage->update($data);
        $usage->load(['allocation.inventoryItem', 'allocation.directSupply', 'recordedBy']);

        return response()->json([
            'success' => true,
            'message' => 'Material usage updated successfully.',
            'data'    => $this->formatUsage($usage),
        ]);
    }

    public function destroyMaterialUsage(Request $request, Project $project, ProjectMilestone $milestone, MilestoneMaterialUsage $usage)
    {
        $user  = $request->user();
        $authz = app(TaskManagementAuthorization::class);

        if ($milestone->project_id !== $project->id || $usage->project_milestone_id !== $milestone->id || !$authz->isAssignedToProject($user, $project)) {
            return response()->json(['success' => false, 'message' => 'Not found or no access'], 404);
        }

        $usage->delete();

        return response()->json(['success' => true, 'message' => 'Material usage deleted successfully.']);
    }

    // ── Formatters ────────────────────────────────────────────────────────────

    private function formatMilestone(ProjectMilestone $m): array
    {
        $total     = (int) ($m->totalTasks ?? $m->tasks()->count());
        $completed = (int) ($m->completedTasks ?? $m->tasks()->where('status', 'completed')->count());
        $progress  = $total > 0 ? round(($completed / $total) * 100) : ($m->status === 'completed' ? 100 : 0);

        $usages = $m->relationLoaded('materialUsages') ? $m->materialUsages : collect();

        return [
            'id'                => $m->id,
            'projectId'         => $m->project_id,
            'name'              => $m->name,
            'description'       => $m->description,
            'startDate'         => $m->start_date,
            'dueDate'           => $m->due_date,
            'billingPercentage' => $m->billing_percentage,
            'status'            => $m->status,
            'totalTasks'        => $total,
            'completedTasks'    => $completed,
            'progress'          => $progress,
            'materialUsages'    => $usages->map(fn ($u) => $this->formatUsage($u))->values(),
            'createdAt'         => $m->created_at?->toISOString(),
            'updatedAt'         => $m->updated_at?->toISOString(),
        ];
    }

    private function formatUsage(MilestoneMaterialUsage $u): array
    {
        $alloc  = $u->allocation;
        $isDs   = $alloc && $alloc->direct_supply_id;
        $item   = $alloc?->inventoryItem;
        $ds     = $alloc?->directSupply;

        return [
            'id'                           => $u->id,
            'projectMilestoneId'           => $u->project_milestone_id,
            'projectMaterialAllocationId'  => $u->project_material_allocation_id,
            'quantityUsed'                 => (float) $u->quantity_used,
            'notes'                        => $u->notes,
            'recordedBy'                   => $u->recordedBy?->name,
            'itemName'                     => $isDs ? ($ds?->supply_name ?? 'Direct Supply') : ($item?->item_name ?? 'Unknown'),
            'itemCode'                     => $isDs ? ($ds?->supply_code ?? '---') : ($item?->item_code ?? '---'),
            'unit'                         => $isDs ? ($ds?->unit_of_measure ?? 'units') : ($item?->unit_of_measure ?? 'units'),
            'isDirect'                     => (bool) $isDs,
            'createdAt'                    => $u->created_at?->toISOString(),
        ];
    }
}
