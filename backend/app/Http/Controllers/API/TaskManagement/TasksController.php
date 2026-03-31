<?php

namespace App\Http\Controllers\Api\TaskManagement;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use App\Models\ProjectMilestone;
use App\Models\ProjectTask;
use App\Services\TaskManagementAuthorization;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class TasksController extends Controller
{
    /**
     * Sync milestone status based on its current tasks.
     * Mirrors the admin logic (without notifications).
     */
    private function syncMilestoneStatus(ProjectMilestone $milestone): void
    {
        $tasks = $milestone->tasks()->get();

        if ($tasks->isEmpty()) {
            if ($milestone->status === 'completed') {
                $milestone->update(['status' => 'in_progress']);
            }
            return;
        }

        $allCompleted = $tasks->every(fn ($t) => $t->status === 'completed');
        $anyActive = $tasks->contains(fn ($t) => in_array($t->status, ['in_progress', 'completed']));

        if ($allCompleted) {
            if ($milestone->status !== 'completed') {
                $milestone->update(['status' => 'completed']);
            }
        } elseif ($anyActive) {
            if ($milestone->status !== 'in_progress') {
                $milestone->update(['status' => 'in_progress']);
            }
        }
    }

    public function index(Request $request, ProjectMilestone $milestone)
    {
        $user = $request->user();
        $milestone->load('project');

        $authz = app(TaskManagementAuthorization::class);
        if (!$milestone->project || !$authz->isAssignedToProject($user, $milestone->project)) {
            return response()->json([
                'success' => false,
                'message' => 'Milestone not found or you do not have access to it',
            ], 404);
        }

        $tasks = $milestone->tasks()
            ->with('assignedUser')
            ->orderBy('due_date', 'asc')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (ProjectTask $t) => [
                'id' => $t->id,
                'projectMilestoneId' => $t->project_milestone_id,
                'title' => $t->title,
                'description' => $t->description,
                'assignedTo' => $t->assigned_to,
                'assignedToName' => $t->assignedUser?->name ?? 'Unassigned',
                'dueDate' => $t->due_date,
                'status' => $t->status,
                'createdAt' => $t->created_at?->toISOString(),
                'updatedAt' => $t->updated_at?->toISOString(),
            ])
            ->values();

        return response()->json([
            'success' => true,
            'data' => $tasks,
        ]);
    }

    public function store(Request $request, ProjectMilestone $milestone)
    {
        $user = $request->user();
        $milestone->load('project');

        $authz = app(TaskManagementAuthorization::class);
        if (!$milestone->project || !$authz->isAssignedToProject($user, $milestone->project)) {
            return response()->json([
                'success' => false,
                'message' => 'Milestone not found or you do not have access to it',
            ], 404);
        }

        // Only null out assigned_to if it's explicitly empty string, 'none', or boolean false
        // Do NOT use empty() — empty(0) is true in PHP and would wipe out valid user IDs
        $rawAssignedTo = $request->input('assigned_to');
        if (is_string($rawAssignedTo) && in_array(trim($rawAssignedTo), ['', 'none'])) {
            $request->merge(['assigned_to' => null]);
        }

        $data = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'assigned_to' => 'nullable|exists:users,id',
            'due_date'    => 'nullable|date',
            'status'      => ['required', Rule::in(['pending', 'in_progress', 'completed'])],
        ]);

        $task = ProjectTask::create([
            'project_milestone_id' => $milestone->id,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'assigned_to' => $data['assigned_to'] ?? null,
            'due_date' => $data['due_date'] ?? null,
            'status' => $data['status'],
        ]);

        $task->load('assignedUser');
        $this->syncMilestoneStatus($milestone);

        // Notify the assigned user (new task)
        if ($task->assigned_to && $milestone->project) {
            Notification::create([
                'user_id'    => $task->assigned_to,
                'project_id' => $milestone->project->id,
                'type'       => 'task',
                'title'      => 'New Task Assigned',
                'message'    => "You have been assigned to task '{$task->title}' in milestone '{$milestone->name}' for project '{$milestone->project->project_name}'.",
                'read'       => false,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Task created successfully',
            'data' => [
                'id' => $task->id,
                'projectMilestoneId' => $task->project_milestone_id,
                'title' => $task->title,
                'description' => $task->description,
                'assignedTo' => $task->assigned_to,
                'assignedToName' => $task->assignedUser?->name,
                'dueDate' => $task->due_date,
                'status' => $task->status,
                'createdAt' => $task->created_at?->toISOString(),
                'updatedAt' => $task->updated_at?->toISOString(),
            ],
        ]);
    }

    public function update(Request $request, ProjectMilestone $milestone, ProjectTask $task)
    {
        $user = $request->user();
        $milestone->load('project');

        if ((int) $task->project_milestone_id !== (int) $milestone->id) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found',
            ], 404);
        }

        $authz = app(TaskManagementAuthorization::class);
        if (!$milestone->project || !$authz->isAssignedToProject($user, $milestone->project)) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or you do not have access to it',
            ], 404);
        }

        // Only null out assigned_to if it's explicitly empty string or 'none'
        $rawAssignedTo = $request->input('assigned_to');
        if (is_string($rawAssignedTo) && in_array(trim($rawAssignedTo), ['', 'none'])) {
            $request->merge(['assigned_to' => null]);
        }

        $oldAssignedTo = $task->assigned_to;

        $data = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'assigned_to' => 'nullable|exists:users,id',
            'due_date'    => 'nullable|date',
            'status'      => ['required', Rule::in(['pending', 'in_progress', 'completed'])],
        ]);

        if ($data['status'] === 'completed') {
            if ($task->progressUpdates()->count() === 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot mark task as completed without a progress update',
                    'errors' => [
                        'status' => ['Cannot mark task as completed. Please add at least one progress update first.'],
                    ],
                ], 422);
            }
        }

        $task->update([
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'assigned_to' => $data['assigned_to'] ?? null,
            'due_date' => $data['due_date'] ?? null,
            'status' => $data['status'],
        ]);

        $task->load('assignedUser');
        $this->syncMilestoneStatus($milestone);

        // Notify newly assigned user (assignment change)
        if (isset($data['assigned_to']) && $data['assigned_to'] && $data['assigned_to'] !== $oldAssignedTo && $milestone->project) {
            Notification::create([
                'user_id'    => $data['assigned_to'],
                'project_id' => $milestone->project->id,
                'type'       => 'task',
                'title'      => 'Task Assigned to You',
                'message'    => "You have been assigned to task '{$task->title}' in milestone '{$milestone->name}' for project '{$milestone->project->project_name}'.",
                'read'       => false,
            ]);
        }

        return response()->json([
            'success' => true,
            'message' => 'Task updated successfully',
            'data' => [
                'id' => $task->id,
                'projectMilestoneId' => $task->project_milestone_id,
                'title' => $task->title,
                'description' => $task->description,
                'assignedTo' => $task->assigned_to,
                'assignedToName' => $task->assignedUser?->name,
                'dueDate' => $task->due_date,
                'status' => $task->status,
                'createdAt' => $task->created_at?->toISOString(),
                'updatedAt' => $task->updated_at?->toISOString(),
            ],
        ]);
    }

    public function destroy(Request $request, ProjectMilestone $milestone, ProjectTask $task)
    {
        $user = $request->user();
        $milestone->load('project');

        if ((int) $task->project_milestone_id !== (int) $milestone->id) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found',
            ], 404);
        }

        $authz = app(TaskManagementAuthorization::class);
        if (!$milestone->project || !$authz->isAssignedToProject($user, $milestone->project)) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or you do not have access to it',
            ], 404);
        }

        $task->delete();

        $milestone->refresh();
        $this->syncMilestoneStatus($milestone);

        return response()->json([
            'success' => true,
            'message' => 'Task deleted successfully',
        ]);
    }
}

