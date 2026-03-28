<?php

namespace App\Http\Controllers\Api\TaskManagement;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\Project;
use App\Models\ProjectMilestone;
use App\Services\TaskManagementAuthorization;
use Illuminate\Http\Request;

class MilestonesController extends Controller
{
    public function index(Request $request, Project $project)
    {
        $user = $request->user();
        $authz = app(TaskManagementAuthorization::class);

        if (!$authz->isAssignedToProject($user, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Project not found or you do not have access to it',
            ], 404);
        }

        $milestones = ProjectMilestone::query()
            ->where('project_id', $project->id)
            ->withCount([
                'tasks as totalTasks',
                'tasks as completedTasks' => function ($q) {
                    $q->where('status', 'completed');
                },
            ])
            ->orderBy('due_date', 'asc')
            ->get()
            ->map(function (ProjectMilestone $m) {
                $total = (int) ($m->totalTasks ?? 0);
                $completed = (int) ($m->completedTasks ?? 0);
                $progress = $total > 0 ? round(($completed / $total) * 100) : ($m->status === 'completed' ? 100 : 0);

                return [
                    'id' => $m->id,
                    'projectId' => $m->project_id,
                    'name' => $m->name,
                    'description' => $m->description,
                    'startDate' => $m->start_date,
                    'dueDate' => $m->due_date,
                    'billingPercentage' => $m->billing_percentage,
                    'status' => $m->status,
                    'totalTasks' => $total,
                    'completedTasks' => $completed,
                    'progress' => $progress,
                    'createdAt' => $m->created_at?->toISOString(),
                    'updatedAt' => $m->updated_at?->toISOString(),
                ];
            })
            ->values();

        return response()->json([
            'success' => true,
            'data' => $milestones,
        ]);
    }

    public function store(Request $request, Project $project)
    {
        $user = $request->user();
        $authz = app(TaskManagementAuthorization::class);

        if (!$authz->isAssignedToProject($user, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Project not found or you do not have access to it',
            ], 404);
        }

        $data = $request->validate([
            'name'               => 'required|string|max:255',
            'description'        => 'nullable|string',
            'start_date'         => 'nullable|date',
            'due_date'           => 'nullable|date|after_or_equal:start_date',
            'billing_percentage' => 'nullable|numeric|min:0|max:100',
        ]);

        // Billing % cap guard (same as admin)
        if ($project->billing_type === 'milestone' && !empty($data['billing_percentage'])) {
            $existingTotal = $project->milestones()->sum('billing_percentage');
            $newTotal = $existingTotal + floatval($data['billing_percentage']);
            if ($newTotal > 100) {
                $remaining = max(0, 100 - $existingTotal);
                return response()->json([
                    'success' => false,
                    'message' => 'Billing percentage would exceed 100%',
                    'errors' => [
                        'billing_percentage' => [
                            "Total billing percentage would exceed 100%. Current total: {$existingTotal}%. You can only assign up to " . number_format($remaining, 2) . "% more.",
                        ],
                    ],
                ], 422);
            }
        }

        $milestone = $project->milestones()->create(array_merge($data, ['status' => 'pending']));

        return response()->json([
            'success' => true,
            'message' => 'Milestone created successfully',
            'data' => [
                'id' => $milestone->id,
                'projectId' => $milestone->project_id,
                'name' => $milestone->name,
                'description' => $milestone->description,
                'startDate' => $milestone->start_date,
                'dueDate' => $milestone->due_date,
                'billingPercentage' => $milestone->billing_percentage,
                'status' => $milestone->status,
                'createdAt' => $milestone->created_at?->toISOString(),
                'updatedAt' => $milestone->updated_at?->toISOString(),
            ],
        ]);
    }

    public function update(Request $request, Project $project, ProjectMilestone $milestone)
    {
        $user = $request->user();
        $authz = app(TaskManagementAuthorization::class);

        if ($milestone->project_id !== $project->id || !$authz->isAssignedToProject($user, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Milestone not found or you do not have access to it',
            ], 404);
        }

        $data = $request->validate([
            'name'               => 'required|string|max:255',
            'description'        => 'nullable|string',
            'start_date'         => 'nullable|date',
            'due_date'           => 'nullable|date|after_or_equal:start_date',
            'billing_percentage' => 'nullable|numeric|min:0|max:100',
        ]);

        // Billing % cap guard (same as admin, exclude current milestone)
        if ($project->billing_type === 'milestone' && !empty($data['billing_percentage'])) {
            $existingTotal = $project->milestones()
                ->where('id', '!=', $milestone->id)
                ->sum('billing_percentage');

            $newTotal = $existingTotal + floatval($data['billing_percentage']);
            if ($newTotal > 100) {
                $remaining = max(0, 100 - $existingTotal);
                return response()->json([
                    'success' => false,
                    'message' => 'Billing percentage would exceed 100%',
                    'errors' => [
                        'billing_percentage' => [
                            "Total billing percentage would exceed 100%. Other milestones total: {$existingTotal}%. You can only assign up to " . number_format($remaining, 2) . "% to this milestone.",
                        ],
                    ],
                ], 422);
            }
        }

        // Auto-compute milestone status from its tasks (never manually set)
        $tasks = $milestone->tasks()->get(['status']);
        $taskCount = $tasks->count();

        if ($taskCount === 0) {
            // No tasks: stay at pending
            $computedStatus = 'pending';
        } elseif ($tasks->every(fn ($t) => $t->status === 'completed')) {
            $computedStatus = 'completed';
        } elseif ($tasks->contains(fn ($t) => in_array($t->status, ['in_progress', 'completed']))) {
            $computedStatus = 'in_progress';
        } else {
            $computedStatus = 'pending';
        }

        $milestone->update(array_merge($data, ['status' => $computedStatus]));

        // Notify project team if milestone just completed
        if ($computedStatus === 'completed' && $milestone->status !== 'completed' && $project) {
            $teamUserIds = \App\Models\ProjectTeam::where('project_id', $project->id)
                ->whereNotNull('user_id')
                ->pluck('user_id')->unique();
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
            'data' => [
                'id' => $milestone->id,
                'projectId' => $milestone->project_id,
                'name' => $milestone->name,
                'description' => $milestone->description,
                'startDate' => $milestone->start_date,
                'dueDate' => $milestone->due_date,
                'billingPercentage' => $milestone->billing_percentage,
                'status' => $milestone->status,
                'createdAt' => $milestone->created_at?->toISOString(),
                'updatedAt' => $milestone->updated_at?->toISOString(),
            ],
        ]);
    }

    public function destroy(Request $request, Project $project, ProjectMilestone $milestone)
    {
        $user = $request->user();
        $authz = app(TaskManagementAuthorization::class);

        if ($milestone->project_id !== $project->id || !$authz->isAssignedToProject($user, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Milestone not found or you do not have access to it',
            ], 404);
        }

        $milestone->delete();

        return response()->json([
            'success' => true,
            'message' => 'Milestone deleted successfully',
        ]);
    }
}

