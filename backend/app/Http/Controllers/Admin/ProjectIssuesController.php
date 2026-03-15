<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectIssue;
use App\Models\ProjectMilestone;
use App\Models\ProjectTask;
use App\Traits\ActivityLogsTrait;
use App\Traits\ClientNotificationTrait;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProjectIssuesController extends Controller
{
    use ActivityLogsTrait, ClientNotificationTrait, NotificationTrait;

    /**
     * When an issue is added to a task, the milestone should move to in_progress
     * if it was still pending.
     */
    private function autoProgressMilestone(ProjectMilestone $milestone): void
    {
        if ($milestone->status === 'pending') {
            $milestone->update(['status' => 'in_progress']);
        }
    }

    /**
     * Normalise an `assigned_to` value that may arrive as:
     *   - null / empty string / "none" / 0      → null
     *   - a plain integer or numeric string      → (int)
     *   - an array (decoded object)              → extract 'id'
     *   - a JSON string representing a user obj  → extract 'id'
     *   - an array of raw values (object spread) → first numeric element assumed to be id
     */
    private function resolveAssignedTo(mixed $value): ?int
    {
        if ($value === null || $value === '' || $value === 'none' || $value === 0 || $value === '0') {
            return null;
        }

        if (is_int($value) || (is_string($value) && ctype_digit(ltrim($value, '-')))) {
            $int = (int) $value;
            return $int > 0 ? $int : null;
        }

        if (is_array($value)) {
            if (array_key_exists('id', $value)) {
                $id = $value['id'];
                return is_numeric($id) && (int)$id > 0 ? (int)$id : null;
            }
            foreach ($value as $element) {
                if (is_int($element) || (is_string($element) && ctype_digit(ltrim((string)$element, '-')))) {
                    $int = (int) $element;
                    return $int > 0 ? $int : null;
                }
            }
            return null;
        }

        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $id = $decoded['id'] ?? null;
                return is_numeric($id) && (int)$id > 0 ? (int)$id : null;
            }
        }

        return null;
    }

    public function store(Request $request)
    {
        $request->merge([
            'assigned_to' => $this->resolveAssignedTo($request->input('assigned_to')),
        ]);

        $data = $request->validate([
            'project_id'           => 'required|exists:projects,id',
            'project_milestone_id' => 'nullable|exists:project_milestones,id',
            'project_task_id'      => 'nullable|exists:project_tasks,id',
            'title'                => 'required|string|max:255',
            'description'          => 'nullable|string',
            'priority'             => ['required', Rule::in(['low', 'medium', 'high', 'critical'])],
            'status'               => ['required', Rule::in(['open', 'in_progress', 'resolved', 'closed'])],
            'assigned_to'          => 'nullable|exists:users,id',
            'due_date'             => 'nullable|date',
        ]);

        $issue = ProjectIssue::create([
            'project_id'           => $data['project_id'],
            'project_milestone_id' => $data['project_milestone_id'] ?? null,
            'project_task_id'      => $data['project_task_id']      ?? null,
            'title'                => $data['title'],
            'description'          => $data['description']          ?? null,
            'priority'             => $data['priority'],
            'status'               => $data['status'],
            'reported_by'          => auth()->id(),
            'assigned_to'          => $data['assigned_to']          ?? null,
            'due_date'             => $data['due_date']             ?? null,
        ]);

        // ── Auto-status: issue added to a task → milestone moves to in_progress ──
        if (!empty($data['project_task_id'])) {
            $task = ProjectTask::with('milestone')->find($data['project_task_id']);
            if ($task && $task->milestone) {
                $this->autoProgressMilestone($task->milestone);
            }
        } elseif (!empty($data['project_milestone_id'])) {
            // Issue added directly to a milestone (no task) — same rule applies
            $milestone = ProjectMilestone::find($data['project_milestone_id']);
            if ($milestone) {
                $this->autoProgressMilestone($milestone);
            }
        }

        $project = Project::findOrFail($data['project_id']);

        $this->adminActivityLogs('Project Issue', 'Created', 'Created issue "' . $data['title'] . '" for project "' . $project->project_name . '"');
        $this->notifyProjectIssue($project, $data['title']);

        $assignedText = $data['assigned_to'] ? ' and assigned' : '';
        $this->createSystemNotification('issue', 'New Project Issue', "A new issue '{$data['title']}' has been reported{$assignedText} for project '{$project->project_name}'.", $project, route('project-management.view', $project->id));

        return back()->with('success', 'Issue created successfully');
    }

    public function update(Project $project, ProjectIssue $issue, Request $request)
    {
        if ($issue->project_id !== $project->id) {
            abort(404);
        }

        $request->merge([
            'assigned_to' => $this->resolveAssignedTo($request->input('assigned_to')),
        ]);

        $data = $request->validate([
            'project_milestone_id' => 'nullable|exists:project_milestones,id',
            'project_task_id'      => 'nullable|exists:project_tasks,id',
            'title'                => 'required|string|max:255',
            'description'          => 'nullable|string',
            'priority'             => ['required', Rule::in(['low', 'medium', 'high', 'critical'])],
            'status'               => ['required', Rule::in(['open', 'in_progress', 'resolved', 'closed'])],
            'assigned_to'          => 'nullable|exists:users,id',
            'due_date'             => 'nullable|date',
        ]);

        if (in_array($data['status'], ['resolved', 'closed']) && !$issue->resolved_at) {
            $data['resolved_at'] = now();
        } elseif (!in_array($data['status'], ['resolved', 'closed'])) {
            $data['resolved_at'] = null;
        }

        $issue->update($data);

        $this->adminActivityLogs('Project Issue', 'Updated', 'Updated issue "' . $issue->title . '" for project "' . $project->project_name . '"');
        $this->createSystemNotification('issue', 'Issue Updated', "Issue '{$issue->title}' has been updated for project '{$project->project_name}'.", $project, route('project-management.view', $project->id));

        return back()->with('success', 'Issue updated successfully');
    }

    public function destroy(Project $project, ProjectIssue $issue)
    {
        if ($issue->project_id !== $project->id) {
            abort(404);
        }

        $issueTitle = $issue->title;
        $issue->delete();

        $this->adminActivityLogs('Project Issue', 'Deleted', 'Deleted issue "' . $issueTitle . '" from project "' . $project->project_name . '"');
        $this->createSystemNotification('issue', 'Issue Deleted', "Issue '{$issueTitle}' has been deleted from project '{$project->project_name}'.", $project, route('project-management.view', $project->id));

        return back()->with('success', 'Issue deleted successfully');
    }
}