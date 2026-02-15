<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectIssue;
use App\Traits\ActivityLogsTrait;
use App\Traits\ClientNotificationTrait;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProjectIssuesController extends Controller
{
    use ActivityLogsTrait, ClientNotificationTrait, NotificationTrait;

    // Store issue
    public function store(Request $request)
    {
        $data = $request->validate([
            'project_id' => 'required|exists:projects,id',
            'project_milestone_id' => 'nullable|exists:project_milestones,id',
            'project_task_id' => 'nullable|exists:project_tasks,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => ['required', Rule::in(['low', 'medium', 'high', 'critical'])],
            'status' => ['required', Rule::in(['open', 'in_progress', 'resolved', 'closed'])],
            'assigned_to' => 'nullable|exists:users,id',
            'due_date' => 'nullable|date',
        ]);

        $issue = ProjectIssue::create([
            'project_id' => $data['project_id'],
            'project_milestone_id' => $data['project_milestone_id'] ?? null,
            'project_task_id' => $data['project_task_id'] ?? null,
            'title' => $data['title'],
            'description' => $data['description'] ?? null,
            'priority' => $data['priority'],
            'status' => $data['status'],
            'reported_by' => auth()->id(),
            'assigned_to' => $data['assigned_to'] ?? null,
            'due_date' => $data['due_date'] ?? null,
        ]);

        $project = Project::findOrFail($data['project_id']);

        $this->adminActivityLogs(
            'Project Issue',
            'Created',
            'Created issue "'.$data['title'].'" for project "'.$project->project_name.'"'
        );

        // Create notification for client
        $this->notifyProjectIssue($project, $data['title']);

        // System-wide notification for new issue
        $assignedText = $data['assigned_to'] ? ' and assigned' : '';
        $this->createSystemNotification(
            'issue',
            'New Project Issue',
            "A new issue '{$data['title']}' has been reported{$assignedText} for project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );

        return back()->with('success', 'Issue created successfully');
    }

    // Update issue
    public function update(Project $project, ProjectIssue $issue, Request $request)
    {
        if ($issue->project_id !== $project->id) {
            abort(404);
        }

        $data = $request->validate([
            'project_milestone_id' => 'nullable|exists:project_milestones,id',
            'project_task_id' => 'nullable|exists:project_tasks,id',
            'title' => 'required|string|max:255',
            'description' => 'nullable|string',
            'priority' => ['required', Rule::in(['low', 'medium', 'high', 'critical'])],
            'status' => ['required', Rule::in(['open', 'in_progress', 'resolved', 'closed'])],
            'assigned_to' => 'nullable|exists:users,id',
            'due_date' => 'nullable|date',
        ]);

        // Set resolved_at if status is resolved or closed
        if (in_array($data['status'], ['resolved', 'closed']) && ! $issue->resolved_at) {
            $data['resolved_at'] = now();
        } elseif (! in_array($data['status'], ['resolved', 'closed'])) {
            $data['resolved_at'] = null;
        }

        // Ensure assigned_to is null if empty
        if (isset($data['assigned_to']) && empty($data['assigned_to'])) {
            $data['assigned_to'] = null;
        }

        $oldAssignedTo = $issue->assigned_to;
        $oldStatus = $issue->status;

        $issue->update($data);

        $this->adminActivityLogs(
            'Project Issue',
            'Updated',
            'Updated issue "'.$issue->title.'" for project "'.$project->project_name.'"'
        );

        // System-wide notification for issue update
        $this->createSystemNotification(
            'issue',
            'Issue Updated',
            "Issue '{$issue->title}' has been updated for project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );

        return back()->with('success', 'Issue updated successfully');
    }

    // Delete issue
    public function destroy(Project $project, ProjectIssue $issue)
    {
        if ($issue->project_id !== $project->id) {
            abort(404);
        }

        $issueTitle = $issue->title;
        $issue->delete();

        $this->adminActivityLogs(
            'Project Issue',
            'Deleted',
            'Deleted issue "'.$issueTitle.'" from project "'.$project->project_name.'"'
        );

        // System-wide notification for issue deletion
        $this->createSystemNotification(
            'issue',
            'Issue Deleted',
            "Issue '{$issueTitle}' has been deleted from project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );

        return back()->with('success', 'Issue deleted successfully');
    }
}
