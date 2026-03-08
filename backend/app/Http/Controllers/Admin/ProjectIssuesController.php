<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectIssue;
use App\Models\User;
use App\Traits\ActivityLogsTrait;
use App\Traits\ClientNotificationTrait;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProjectIssuesController extends Controller
{
    use ActivityLogsTrait, ClientNotificationTrait, NotificationTrait;

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

        // Plain integer or numeric string — happy path
        if (is_int($value) || (is_string($value) && ctype_digit(ltrim($value, '-')))) {
            $int = (int) $value;
            return $int > 0 ? $int : null;
        }

        // Associative array — decoded object like { id: 1, name: "...", email: "..." }
        if (is_array($value)) {
            // Associative: has an 'id' key
            if (array_key_exists('id', $value)) {
                $id = $value['id'];
                return is_numeric($id) && (int)$id > 0 ? (int)$id : null;
            }
            // Indexed/sequential array (object values spread): first numeric element is the id
            foreach ($value as $element) {
                if (is_int($element) || (is_string($element) && ctype_digit(ltrim((string)$element, '-')))) {
                    $int = (int) $element;
                    return $int > 0 ? $int : null;
                }
            }
            return null;
        }

        // JSON string representing a user object
        if (is_string($value)) {
            $decoded = json_decode($value, true);
            if (json_last_error() === JSON_ERROR_NONE && is_array($decoded)) {
                $id = $decoded['id'] ?? null;
                return is_numeric($id) && (int)$id > 0 ? (int)$id : null;
            }
        }

        return null;
    }

    // Store issue
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

        $project = Project::findOrFail($data['project_id']);

        $this->adminActivityLogs('Project Issue', 'Created', 'Created issue "' . $data['title'] . '" for project "' . $project->project_name . '"');
        $this->notifyProjectIssue($project, $data['title']);

        $assignedText = $data['assigned_to'] ? ' and assigned' : '';
        $this->createSystemNotification('issue', 'New Project Issue', "A new issue '{$data['title']}' has been reported{$assignedText} for project '{$project->project_name}'.", $project, route('project-management.view', $project->id));

        return back()->with('success', 'Issue created successfully');
    }

    // Update issue
    public function update(Project $project, ProjectIssue $issue, Request $request)
    {
        if ($issue->project_id !== $project->id) {
            abort(404);
        }

        // Normalise assigned_to BEFORE validation — it may arrive as a full user
        // object, a JSON string, or an indexed array of user-object values.
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

        // Stamp resolved_at when transitioning to resolved / closed
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

    // Delete issue
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