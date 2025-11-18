<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProjectMilestone;
use App\Models\ProjectTask;
use App\Traits\ActivityLogsTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class ProjectTasksController extends Controller
{
    use ActivityLogsTrait;

    // Store task
    public function store(Request $request)
    {
        $data = $request->validate([
            'title'        => 'required|string|max:255',
            'description'  => 'nullable|string',
            'project_milestone_id' => 'required|exists:project_milestones,id',
            'assigned_to'  => 'nullable|exists:users,id',
            'due_date'     => 'nullable|date',
            'status'       => ['required', Rule::in(['pending','in_progress','completed'])],
        ]);

        $milestone = ProjectMilestone::findOrFail($data['project_milestone_id']);
        $task = ProjectTask::create([
            'project_milestone_id' => $data['project_milestone_id'],
            'title'                => $data['title'],
            'description'          => $data['description'] ?? null,
            'assigned_to'          => $data['assigned_to'] ?? null,
            'due_date'             => $data['due_date'] ?? null,
            'status'               => $data['status'],
        ]);

        $this->adminActivityLogs(
            'Task',
            'Created',
            'Created task "' . $data['title'] . '" for milestone "' . $milestone->name . '"'
        );

        return back()->with('success', 'Task created successfully');
    }

    // Update task
    public function update(ProjectMilestone $milestone, ProjectTask $task, Request $request)
    {
        $data = $request->validate([
            'title'        => 'required|string|max:255',
            'description'  => 'nullable|string',
            'assigned_to'  => 'nullable|exists:users,id',
            'due_date'     => 'nullable|date',
            'status'       => ['required', Rule::in(['pending','in_progress','completed'])],
        ]);

        $task->update($data);

        $this->adminActivityLogs(
            'Task',
            'Updated',
            'Updated task "' . $task->title . '" for milestone "' . $milestone->name . '"'
        );

        return back()->with('success', 'Task updated successfully');
    }

    // Update task status
    public function updateStatus(ProjectMilestone $milestone, ProjectTask $task, Request $request)
    {
        if ($task->project_milestone_id !== $milestone->id) {
            abort(404);
        }

        $data = $request->validate([
            'status' => ['required', Rule::in(['pending','in_progress','completed'])],
        ]);

        $oldStatus = $task->status;
        $task->update($data);

        $this->adminActivityLogs(
            'Task',
            'Updated Status',
            'Updated task "' . $task->title . '" status from "' . $oldStatus . '" to "' . $data['status'] . '" for milestone "' . $milestone->name . '"'
        );

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
            'Deleted task "' . $taskTitle . '" from milestone "' . $milestone->name . '"'
        );

        return back()->with('success', 'Task deleted successfully');
    }
}
