<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectMilestone;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Traits\ActivityLogsTrait;

class ProjectMilestonesController extends Controller
{
    use ActivityLogsTrait;

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

        $milestone->update($data);

        $this->adminActivityLogs(
            'Milestone',
            'Updated',
            'Updated milestone "' . $milestone->name . '" for project "' . $project->project_name . '"'
        );

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
