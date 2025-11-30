<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectMilestone;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Traits\ActivityLogsTrait;
use App\Traits\ClientNotificationTrait;

class ProjectMilestonesController extends Controller
{
    use ActivityLogsTrait, ClientNotificationTrait;

    // Store new milestone
    public function store(Project $project, Request $request)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
            'billing_percentage' => 'nullable|numeric|min:0|max:100',
            'status' => ['required', Rule::in(['pending','in_progress','completed'])],
        ]);

        $milestone = $project->milestones()->create($data);

        $this->adminActivityLogs(
            'Milestone',
            'Created',
            'Created milestone "' . $milestone->name . '" for project "' . $project->project_name . '"'
        );

        // Create notification for client
        $this->notifyMilestoneStatusChange($project, $milestone->name, $milestone->status);

    }

    // Update milestone
    public function update(Project $project, Request $request, ProjectMilestone $milestone)
    {
        $data = $request->validate([
            'name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'start_date' => 'nullable|date',
            'due_date' => 'nullable|date|after_or_equal:start_date',
            'billing_percentage' => 'nullable|numeric|min:0|max:100',
            'status' => ['required', Rule::in(['pending','in_progress','completed'])],
        ]);

        // Validate: Cannot mark as completed unless all tasks are completed
        if ($data['status'] === 'completed') {
            $tasks = $milestone->tasks;
            $totalTasks = $tasks->count();
            
            if ($totalTasks > 0) {
                $completedTasks = $tasks->where('status', 'completed')->count();
                $incompleteTasks = $totalTasks - $completedTasks;
                
                if ($incompleteTasks > 0) {
                    return back()->withErrors([
                        'status' => "Cannot mark milestone as completed. {$incompleteTasks} task(s) still need to be completed."
                    ]);
                }
            }
        }

        $oldStatus = $milestone->status;
        $milestone->update($data);

        $this->adminActivityLogs(
            'Milestone',
            'Updated',
            'Updated milestone "' . $milestone->name . '" for project "' . $project->project_name . '"'
        );

        // Create notification for client if status changed
        if ($oldStatus !== $data['status']) {
            if ($data['status'] === 'completed') {
                $this->notifyMilestoneCompleted($project, $milestone->name);
            } else {
                $this->notifyMilestoneStatusChange($project, $milestone->name, $data['status']);
            }
        }

    }

    // Delete milestone
    public function destroy(Project $project, ProjectMilestone $milestone)
    {
        $milestoneName = $milestone->name;
        $milestone->delete();

        $this->adminActivityLogs(
            'Milestone',
            'Deleted',
            'Deleted milestone "' . $milestoneName . '" from project "' . $project->project_name . '"'
        );

    }
}
