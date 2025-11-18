<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectLaborCost;
use App\Models\ProjectTeam;
use Illuminate\Http\Request;
use App\Traits\ActivityLogsTrait;

class ProjectLaborCostsController extends Controller
{
    use ActivityLogsTrait;

    // Store labor cost
    public function store(Project $project, Request $request)
    {
        $data = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'work_date' => ['required', 'date'],
            'hours_worked' => ['required', 'numeric', 'min:0.01', 'max:24'],
            'hourly_rate' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string'],
        ]);

        $data['project_id'] = $project->id;
        $data['created_by'] = auth()->id();

        $laborCost = ProjectLaborCost::create($data);

        $this->adminActivityLogs(
            'Labor Cost',
            'Created',
            'Created labor cost entry for ' . $laborCost->user->name . ' - ' . $data['hours_worked'] . ' hours on ' . $data['work_date'] . ' for project "' . $project->project_name . '"'
        );

        return back()->with('success', 'Labor cost entry created successfully.');
    }

    // Update labor cost
    public function update(Project $project, Request $request, ProjectLaborCost $laborCost)
    {
        $data = $request->validate([
            'user_id' => ['required', 'exists:users,id'],
            'work_date' => ['required', 'date'],
            'hours_worked' => ['required', 'numeric', 'min:0.01', 'max:24'],
            'hourly_rate' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string'],
        ]);

        $laborCost->update($data);

        $this->adminActivityLogs(
            'Labor Cost',
            'Updated',
            'Updated labor cost entry for ' . $laborCost->user->name . ' for project "' . $project->project_name . '"'
        );

        return back()->with('success', 'Labor cost entry updated successfully.');
    }

    // Delete labor cost
    public function destroy(Project $project, ProjectLaborCost $laborCost)
    {
        $userName = $laborCost->user->name;
        $workDate = $laborCost->work_date;

        $laborCost->delete();

        $this->adminActivityLogs(
            'Labor Cost',
            'Deleted',
            'Deleted labor cost entry for ' . $userName . ' on ' . $workDate . ' from project "' . $project->project_name . '"'
        );

        return back()->with('success', 'Labor cost entry deleted successfully.');
    }
}

