<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProjectMilestone;
use App\Models\ProjectTask;
use App\Models\User;
use App\Traits\ActivityLogsTrait;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProjectTasksController extends Controller
{
    use ActivityLogsTrait, NotificationTrait;

    /**
     * Sync milestone status based on its current tasks:
     *
     * - All tasks completed            → milestone = completed
     * - Some tasks incomplete          → milestone = in_progress (reverts from completed)
     * - No tasks + milestone completed → milestone = in_progress (new task was just added)
     * - Milestone still pending        → leave it (progress update / issue handles that)
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
        $anyActive    = $tasks->contains(fn ($t) => in_array($t->status, ['in_progress', 'completed']));

        if ($allCompleted) {
            // Every task done → auto-complete milestone
            if ($milestone->status !== 'completed') {
                $milestone->update(['status' => 'completed']);
            }
        } elseif ($anyActive) {
            // At least one task is in_progress or completed but not all done
            // → milestone must be in_progress regardless of where it was
            if ($milestone->status !== 'in_progress') {
                $milestone->update(['status' => 'in_progress']);
            }
        }
        // If no tasks are active at all (all still pending), leave milestone alone
    }

    public function store(Request $request)
    {
        $requestData = $request->all();
        if (isset($requestData['assigned_to']) && (empty($requestData['assigned_to']) || $requestData['assigned_to'] === 'none' || $requestData['assigned_to'] === 0)) {
            $request->merge(['assigned_to' => null]);
        }

        $data = $request->validate([
            'title'                => 'required|string|max:255',
            'description'          => 'nullable|string',
            'project_milestone_id' => 'required|exists:project_milestones,id',
            'assigned_to'          => 'nullable|exists:users,id',
            'due_date'             => 'nullable|date',
            'status'               => ['required', Rule::in(['pending','in_progress','completed'])],
        ]);

        $milestone = ProjectMilestone::with('project')->findOrFail($data['project_milestone_id']);

        $task = ProjectTask::create([
            'project_milestone_id' => $data['project_milestone_id'],
            'title'                => $data['title'],
            'description'          => $data['description'] ?? null,
            'assigned_to'          => $data['assigned_to'] ?? null,
            'due_date'             => $data['due_date'] ?? null,
            'status'               => $data['status'],
        ]);

        // ── Auto-status: new task added → if milestone was completed, revert to in_progress ──
        $this->syncMilestoneStatus($milestone);

        $this->adminActivityLogs(
            'Task', 'Created',
            'Created task "' . $data['title'] . '" for milestone "' . $milestone->name . '"'
        );

        if ($milestone->project) {
            $this->createSystemNotification(
                'task', 'New Task Created',
                "A new task '{$data['title']}' has been created in milestone '{$milestone->name}' for project '{$milestone->project->project_name}'.",
                $milestone->project,
                route('project-management.view', $milestone->project->id)
            );
        }

        return back()->with('success', 'Task created successfully');
    }

    public function update(ProjectMilestone $milestone, ProjectTask $task, Request $request)
    {
        $requestData = $request->all();
        if (isset($requestData['assigned_to']) && (empty($requestData['assigned_to']) || $requestData['assigned_to'] === 'none' || $requestData['assigned_to'] === 0)) {
            $request->merge(['assigned_to' => null]);
        }

        $data = $request->validate([
            'title'       => 'required|string|max:255',
            'description' => 'nullable|string',
            'assigned_to' => 'nullable|exists:users,id',
            'due_date'    => 'nullable|date',
            'status'      => ['required', Rule::in(['pending','in_progress','completed'])],
        ]);

        $data['assigned_to'] = $data['assigned_to'] ?? null;
        $oldAssignedTo = $task->assigned_to;
        $milestone->load('project');

        // Cannot mark as completed without at least 1 progress update
        if ($data['status'] === 'completed') {
            if ($task->progressUpdates()->count() === 0) {
                return back()->withErrors([
                    'status' => 'Cannot mark task as completed. Please add at least one progress update first.'
                ]);
            }
        }

        $task->update($data);

        // ── Auto-status: task status changed → sync milestone ──
        $this->syncMilestoneStatus($milestone);

        $this->adminActivityLogs(
            'Task', 'Updated',
            'Updated task "' . $task->title . '" for milestone "' . $milestone->name . '"'
        );

        if ($oldAssignedTo !== $data['assigned_to'] && $data['assigned_to'] && $milestone->project) {
            $user = User::find($data['assigned_to']);
            $userName = $user ? $user->name : 'Unknown';
            $this->createSystemNotification(
                'task', 'Task Assignment Updated',
                "Task '{$task->title}' has been assigned to {$userName} in milestone '{$milestone->name}' for project '{$milestone->project->project_name}'.",
                $milestone->project,
                route('project-management.view', $milestone->project->id)
            );
        }

        return back()->with('success', 'Task updated successfully');
    }

    public function updateStatus(ProjectMilestone $milestone, ProjectTask $task, Request $request)
    {
        if ($task->project_milestone_id !== $milestone->id) {
            abort(404);
        }

        $data = $request->validate([
            'status' => ['required', Rule::in(['pending','in_progress','completed'])],
        ]);

        // Cannot mark as completed without at least 1 progress update
        if ($data['status'] === 'completed') {
            if ($task->progressUpdates()->count() === 0) {
                return back()->withErrors([
                    'status' => 'Cannot mark task as completed. Please add at least one progress update first.'
                ]);
            }
        }

        $oldStatus = $task->status;
        $task->update($data);
        $milestone->load('project');

        // ── Auto-status: task status changed → sync milestone ──
        $this->syncMilestoneStatus($milestone);

        $this->adminActivityLogs(
            'Task', 'Updated Status',
            'Updated task "' . $task->title . '" status from "' . $oldStatus . '" to "' . $data['status'] . '" for milestone "' . $milestone->name . '"'
        );

        if ($milestone->project) {
            $this->createSystemNotification(
                'task', 'Task Status Updated',
                "Task '{$task->title}' status has been changed from " . ucfirst(str_replace('_', ' ', $oldStatus)) . " to " . ucfirst(str_replace('_', ' ', $data['status'])) . " in milestone '{$milestone->name}' for project '{$milestone->project->project_name}'.",
                $milestone->project,
                route('project-management.view', $milestone->project->id)
            );
        }

        return back()->with('success', 'Task status updated successfully');
    }

    public function destroy(ProjectMilestone $milestone, ProjectTask $task)
    {
        $taskTitle = $task->title;
        $task->delete();

        // ── Auto-status: task deleted → re-sync milestone ──
        // Re-query milestone so task count is fresh after deletion
        $milestone->refresh();
        $this->syncMilestoneStatus($milestone);

        $this->adminActivityLogs(
            'Task', 'Deleted',
            'Deleted task "' . $taskTitle . '" from milestone "' . $milestone->name . '"'
        );

        $milestone->load('project');
        if ($milestone->project) {
            $this->createSystemNotification(
                'task', 'Task Deleted',
                "Task '{$taskTitle}' has been deleted from milestone '{$milestone->name}' for project '{$milestone->project->project_name}'.",
                $milestone->project,
                route('project-management.view', $milestone->project->id)
            );
        }

        return back()->with('success', 'Task deleted successfully');
    }
}