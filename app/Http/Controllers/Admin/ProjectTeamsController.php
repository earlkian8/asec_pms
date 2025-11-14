<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectTeam;
use App\Traits\ActivityLogsTrait;
use Illuminate\Http\Request;

class ProjectTeamsController extends Controller
{
    use ActivityLogsTrait;

    public function store(Request $request, Project $project)
    {
        $validated = $request->validate([
            'employees'            => ['required', 'array', 'min:1'],
            'employees.*.id'       => ['required', 'exists:employees,id'],
            'employees.*.role'     => ['required', 'string', 'max:50'],
            'employees.*.hourly_rate' => ['nullable', 'numeric', 'min:0'],
            'employees.*.start_date'  => ['nullable', 'date'],
            'employees.*.end_date'    => ['nullable', 'date', 'after_or_equal:employees.*.start_date'],
        ]);

        $added = 0;
        foreach ($validated['employees'] as $emp) {
            $exists = ProjectTeam::where('project_id', $project->id)
                ->where('employee_id', $emp['id'])
                ->exists();

            if ($exists) {
                continue; // skip duplicates
            }

            ProjectTeam::create([
                'project_id'   => $project->id,
                'employee_id'  => $emp['id'],
                'role'         => $emp['role'],
                'hourly_rate'  => $emp['hourly_rate'],
                'start_date'   => $emp['start_date'],
                'end_date'     => $emp['end_date'],
                'is_active'    => true,
            ]);

            $added++;
        }

        return redirect()->back()->with('success', "$added team member(s) assigned successfully.");
    }

    public function destroy(Request $request, Project $project, ProjectTeam $projectTeam = null)
    {
        // If request has "ids", then it's a bulk destroy
        if ($request->has('ids') && is_array($request->ids)) {
            $validated = $request->validate([
                'ids'   => 'required|array|min:1',
                'ids.*' => 'integer|exists:project_teams,id',
            ]);

            $teams = ProjectTeam::with('employee')
                ->where('project_id', $project->id)
                ->whereIn('id', $validated['ids'])
                ->get();

            foreach ($teams as $team) {
                $employeeName = $team->employee->first_name . ' ' . $team->employee->last_name;
                $role         = $team->role;

                $this->adminActivityLogs(
                    'Project Team',
                    'Delete',
                    "Removed {$employeeName} ({$role}) from Project {$project->project_name}"
                );

                $team->delete();
            }

            return redirect()->back()->with('success', 'Selected team members removed successfully.');
        }

        // Otherwise, it's a single destroy
        if (!$projectTeam || $projectTeam->project_id !== $project->id) {
            abort(404);
        }

        $employeeName = $projectTeam->employee->first_name . ' ' . $projectTeam->employee->last_name;
        $role         = $projectTeam->role;

        $projectTeam->delete();

        $this->adminActivityLogs(
            'Project Team',
            'Delete',
            "Removed {$employeeName} ({$role}) from Project {$project->project_name}"
        );

        return redirect()->back()->with('success', 'Team member removed successfully.');
    }


    public function handleStatus(Request $request, Project $project, ProjectTeam $projectTeam)
    {
        if ($projectTeam->project_id !== $project->id) {
            abort(404);
        }

        $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $status = $request->boolean('is_active') ? 'active' : 'inactive';

        $projectTeam->update([
            'is_active' => $request->boolean('is_active'),
        ]);

        $employeeName = $projectTeam->employee->first_name . ' ' . $projectTeam->employee->last_name;

        $this->adminActivityLogs(
            'Project Team',
            'Update Status',
            'Updated ' . $employeeName . ' status to ' . $status . ' in Project ' . $project->project_name
        );

        return redirect()->back()->with('success', 'Team member status updated successfully.');
    }
    public function update(Request $request, Project $project, ProjectTeam $projectTeam)
    {
        if ($projectTeam->project_id !== $project->id) {
            abort(404);
        }

        $validated = $request->validate([
            'role'        => ['required', 'string', 'max:50'],
            'hourly_rate' => ['nullable', 'numeric', 'min:0'],
            'start_date'  => ['nullable', 'date'],
            'end_date'    => ['nullable', 'date', 'after_or_equal:start_date'],
            'is_active'   => ['required', 'boolean'],
        ]);

        // Save old values for logging
        $oldEmployee = $projectTeam->employee?->first_name . ' ' . $projectTeam->employee?->last_name;
        $oldRole     = $projectTeam->role;
        $oldRate     = $projectTeam->hourly_rate;
        $oldDates    = ($projectTeam->start_date ?? '---') . ' - ' . ($projectTeam->end_date ?? '---');
        $oldStatus   = $projectTeam->is_active ? 'Active' : 'Inactive';

        $projectTeam->update($validated);

        $employee = $projectTeam->employee; // stays the same

        $newRole   = $validated['role'];
        $newRate   = $validated['hourly_rate'] ?? '---';
        $newDates  = ($validated['start_date'] ?? '---') . ' - ' . ($validated['end_date'] ?? '---');
        $newStatus = $validated['is_active'] ? 'Active' : 'Inactive';

        $this->adminActivityLogs(
            'Project Team',
            'Update',
            "Updated team member {$oldEmployee} in Project {$project->project_name}: " .
            "Role: {$oldRole} → {$newRole}, " .
            "Rate: {$oldRate} → {$newRate}, " .
            "Dates: {$oldDates} → {$newDates}, " .
            "Status: {$oldStatus} → {$newStatus}"
        );

        return redirect()->back()->with('success', 'Team member updated successfully.');
    }
}
