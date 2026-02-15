<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectLaborCost;
use App\Traits\ActivityLogsTrait;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;

class ProjectLaborCostsController extends Controller
{
    use ActivityLogsTrait, NotificationTrait;

    // Store labor cost
    public function store(Project $project, Request $request)
    {
        $data = $request->validate([
            'assignable_id' => ['required', 'integer'],
            'assignable_type' => ['required', 'in:user,employee'],
            'work_date' => ['required', 'date'],
            'hours_worked' => ['required', 'numeric', 'min:0.01'],
            'hourly_rate' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string'],
        ]);

        // Validate ID based on type
        if ($data['assignable_type'] === 'user') {
            $request->validate([
                'assignable_id' => ['exists:users,id'],
            ]);
            $data['user_id'] = $data['assignable_id'];
            $data['employee_id'] = null;
        } else {
            $request->validate([
                'assignable_id' => ['exists:employees,id'],
            ]);
            $data['employee_id'] = $data['assignable_id'];
            $data['user_id'] = null;
        }

        $data['project_id'] = $project->id;
        $data['created_by'] = auth()->id();
        unset($data['assignable_id']); // Remove assignable_id as it's not a column

        $laborCost = ProjectLaborCost::create($data);
        $laborCost->load(['user', 'employee']);

        $assignableName = $laborCost->assignable_name;

        $this->adminActivityLogs(
            'Labor Cost',
            'Created',
            'Created labor cost entry for '.$assignableName.' - '.$data['hours_worked'].' hours on '.$data['work_date'].' for project "'.$project->project_name.'"'
        );

        // System-wide notification for labor cost
        $this->createSystemNotification(
            'general',
            'Labor Cost Added',
            "A labor cost entry has been added for {$assignableName}: {$data['hours_worked']} hours on {$data['work_date']} for project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );

        return back()->with('success', 'Labor cost entry created successfully.');
    }

    // Update labor cost
    public function update(Project $project, Request $request, ProjectLaborCost $laborCost)
    {
        $data = $request->validate([
            'assignable_id' => ['required', 'integer'],
            'assignable_type' => ['required', 'in:user,employee'],
            'work_date' => ['required', 'date'],
            'hours_worked' => ['required', 'numeric', 'min:0.01'],
            'hourly_rate' => ['required', 'numeric', 'min:0'],
            'description' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string'],
        ]);

        // Validate ID based on type
        if ($data['assignable_type'] === 'user') {
            $request->validate([
                'assignable_id' => ['exists:users,id'],
            ]);
            $data['user_id'] = $data['assignable_id'];
            $data['employee_id'] = null;
        } else {
            $request->validate([
                'assignable_id' => ['exists:employees,id'],
            ]);
            $data['employee_id'] = $data['assignable_id'];
            $data['user_id'] = null;
        }

        unset($data['assignable_id']); // Remove assignable_id as it's not a column

        $laborCost->update($data);
        $laborCost->load(['user', 'employee']);

        $assignableName = $laborCost->assignable_name;

        $this->adminActivityLogs(
            'Labor Cost',
            'Updated',
            'Updated labor cost entry for '.$assignableName.' for project "'.$project->project_name.'"'
        );

        // System-wide notification for labor cost update
        $this->createSystemNotification(
            'general',
            'Labor Cost Updated',
            "Labor cost entry for {$assignableName} has been updated for project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );

        return back()->with('success', 'Labor cost entry updated successfully.');
    }

    // Delete labor cost
    public function destroy(Project $project, ProjectLaborCost $laborCost)
    {
        $laborCost->load(['user', 'employee']);
        $assignableName = $laborCost->assignable_name;
        $workDate = $laborCost->work_date;

        $laborCost->delete();

        $this->adminActivityLogs(
            'Labor Cost',
            'Deleted',
            'Deleted labor cost entry for '.$assignableName.' on '.$workDate.' from project "'.$project->project_name.'"'
        );

        // System-wide notification for labor cost deletion
        $this->createSystemNotification(
            'general',
            'Labor Cost Deleted',
            "Labor cost entry for {$assignableName} on {$workDate} has been deleted from project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );

        return back()->with('success', 'Labor cost entry deleted successfully.');
    }
}
