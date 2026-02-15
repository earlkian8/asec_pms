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

    // Store task
    public function store(Request $request)
    {
        // Normalize assigned_to before validation
        $requestData = $request->all();
        if (isset($requestData['assigned_to']) && (empty($requestData['assigned_to']) || $requestData['assigned_to'] === 'none' || $requestData['assigned_to'] === 0)) {
            $requestData['assigned_to'] = null;
            $request->merge(['assigned_to' => null]);
        }

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'project_milestone_id' => 'required|exists:project_milestones,id',
            'assigned_to' => 'nullable|exists:users,id',
            'due_date' => 'nullable|date',
            'status' => ['required', Rule::in(['pending', 'in_progress', 'completed'])],
        ]);

        $milestone = ProjectMilestone::with('project')->findOrFail($data['project_milestone_id']);
        $task = ProjectTask::create([
            'project_milestone_id' => $data['project_milestone_id'],
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'assigned_to' => $data['assigned_to'] ?? null,
            'due_date' => $data['due_date'] ?? null,
            'status' => $data['status'],
        ]);

        $this->adminActivityLogs(
            'Task',
            'Created',
            'Created task "'.$data['title'].'" for milestone "'.$milestone->name.'"'
        );

        // System-wide notification for new task
        if ($milestone->project) {
            $this->createSystemNotification(
                'task',
                'New Task Created',
                "A new task '{$data['title']}' has been created in milestone '{$milestone->name}' for project '{$milestone->project->project_name}'.",
                $milestone->project,
                route('project-management.view', $milestone->project->id)
            );
        }

        return back()->with('success', 'Task created successfully');
    }

    // Update task
    public function update(ProjectMilestone $milestone, ProjectTask $task, Request $request)
    {
        // Normalize assigned_to before validation
        $requestData = $request->all();
        if (isset($requestData['assigned_to']) && (empty($requestData['assigned_to']) || $requestData['assigned_to'] === 'none' || $requestData['assigned_to'] === 0)) {
            $requestData['assigned_to'] = null;
            $request->merge(['assigned_to' => null]);
        }

        $data = $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'assigned_to' => 'nullable|exists:users,id',
            'due_date' => 'nullable|date',
            'status' => ['required', Rule::in(['pending', 'in_progress', 'completed'])],
        ]);

        // Ensure assigned_to is null if empty
        $data['assigned_to'] = $data['assigned_to'] ?? null;

        $oldAssignedTo = $task->assigned_to;
        $milestone->load('project');

        // Validate: Cannot mark as completed without at least 1 progress update
        if ($data['status'] === 'completed') {
            $progressUpdatesCount = $task->progressUpdates()->count();
            if ($progressUpdatesCount === 0) {
                return back()->withErrors([
                    'status' => 'Cannot mark task as completed. Please add at least one progress update first.',
                ]);
            }
        }

        $task->update($data);

        $this->adminActivityLogs(
            'Task',
            'Updated',
            'Updated task "'.$task->title.'" for milestone "'.$milestone->name.'"'
        );

        // System-wide notification if assignment changed
        if ($oldAssignedTo !== $data['assigned_to'] && $data['assigned_to'] && $milestone->project) {
            $user = User::find($data['assigned_to']);
            $userName = $user ? $user->name : 'Unknown';
            $this->createSystemNotification(
                'task',
                'Task Assignment Updated',
                "Task '{$task->title}' has been assigned to {$userName} in milestone '{$milestone->name}' for project '{$milestone->project->project_name}'.",
                $milestone->project,
                route('project-management.view', $milestone->project->id)
            );
        }

        return back()->with('success', 'Task updated successfully');
    }

    // Update task status
    public function updateStatus(ProjectMilestone $milestone, ProjectTask $task, Request $request)
    {
        if ($task->project_milestone_id !== $milestone->id) {
            abort(404);
        }

        $data = $request->validate([
            'status' => ['required', Rule::in(['pending', 'in_progress', 'completed'])],
        ]);

        // Validate: Cannot mark as completed without at least 1 progress update
        if ($data['status'] === 'completed') {
            $progressUpdatesCount = $task->progressUpdates()->count();
            if ($progressUpdatesCount === 0) {
                return back()->withErrors([
                    'status' => 'Cannot mark task as completed. Please add at least one progress update first.',
                ]);
            }
        }

        $oldStatus = $task->status;
        $task->update($data);
        $milestone->load('project');

        $this->adminActivityLogs(
            'Task',
            'Updated Status',
            'Updated task "'.$task->title.'" status from "'.$oldStatus.'" to "'.$data['status'].'" for milestone "'.$milestone->name.'"'
        );

        // System-wide notification for task status change
        if ($milestone->project) {
            $this->createSystemNotification(
                'task',
                'Task Status Updated',
                "Task '{$task->title}' status has been changed from ".ucfirst(str_replace('_', ' ', $oldStatus)).' to '.ucfirst(str_replace('_', ' ', $data['status']))." in milestone '{$milestone->name}' for project '{$milestone->project->project_name}'.",
                $milestone->project,
                route('project-management.view', $milestone->project->id)
            );
        }

        return back()->with('success', 'Task status updated successfully');
    }

    // Delete task
    public function destroy(ProjectMilestone $milestone, ProjectTask $task)
    {
        $taskTitle = $task->title;
        $task->delete();

        $this->adminActivityLogs(
            'Task',
            'Deleted',
            'Deleted task "'.$taskTitle.'" from milestone "'.$milestone->name.'"'
        );

        // System-wide notification for task deletion
        $milestone->load('project');
        if ($milestone->project) {
            $this->createSystemNotification(
                'task',
                'Task Deleted',
                "Task '{$taskTitle}' has been deleted from milestone '{$milestone->name}' for project '{$milestone->project->project_name}'.",
                $milestone->project,
                route('project-management.view', $milestone->project->id)
            );
        }

        return back()->with('success', 'Task deleted successfully');
    }
}
