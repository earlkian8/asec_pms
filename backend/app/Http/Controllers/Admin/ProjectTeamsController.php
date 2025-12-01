<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectTeam;
use App\Models\ProjectTask;
use App\Models\User;
use App\Traits\ActivityLogsTrait;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;

class ProjectTeamsController extends Controller
{
    use ActivityLogsTrait, NotificationTrait;

    public function store(Request $request, Project $project)
    {
        $validated = $request->validate([
            'assignables'            => ['required', 'array', 'min:1'],
            'assignables.*.id'       => ['required'],
            'assignables.*.type'     => ['required', 'in:user,employee'],
            'assignables.*.role'     => ['required', 'string', 'max:50'],
            'assignables.*.hourly_rate' => ['required', 'numeric', 'min:0'],
            'assignables.*.start_date'  => ['required', 'date'],
            'assignables.*.end_date'    => ['nullable', 'date', 'after_or_equal:assignables.*.start_date'],
        ]);
        
        // Validate IDs based on type
        foreach ($validated['assignables'] as $index => $assignable) {
            if (!isset($assignable['id']) || !isset($assignable['type'])) {
                return redirect()->back()->withErrors([
                    "assignables.{$index}.id" => 'Invalid assignable data provided.'
                ])->withInput();
            }
            
            if ($assignable['type'] === 'user') {
                $request->validate([
                    "assignables.{$index}.id" => ['required', 'integer', 'exists:users,id'],
                ]);
            } elseif ($assignable['type'] === 'employee') {
                $request->validate([
                    "assignables.{$index}.id" => ['required', 'integer', 'exists:employees,id'],
                ]);
            } else {
                return redirect()->back()->withErrors([
                    "assignables.{$index}.type" => 'Invalid assignable type. Must be "user" or "employee".'
                ])->withInput();
            }
        }

        // Validate dates against project dates
        if ($project->start_date || $project->planned_end_date) {
            foreach ($validated['assignables'] as $index => $assignable) {
                if ($assignable['start_date']) {
                    if ($project->start_date && $assignable['start_date'] < $project->start_date) {
                        return redirect()->back()->withErrors([
                            "assignables.{$index}.start_date" => "Start date cannot be before project start date ({$project->start_date})"
                        ])->withInput();
                    }
                    if ($project->planned_end_date && $assignable['start_date'] > $project->planned_end_date) {
                        return redirect()->back()->withErrors([
                            "assignables.{$index}.start_date" => "Start date cannot be after project end date ({$project->planned_end_date})"
                        ])->withInput();
                    }
                }
                if ($assignable['end_date']) {
                    if ($project->start_date && $assignable['end_date'] < $project->start_date) {
                        return redirect()->back()->withErrors([
                            "assignables.{$index}.end_date" => "End date cannot be before project start date ({$project->start_date})"
                        ])->withInput();
                    }
                    if ($project->planned_end_date && $assignable['end_date'] > $project->planned_end_date) {
                        return redirect()->back()->withErrors([
                            "assignables.{$index}.end_date" => "End date cannot be after project end date ({$project->planned_end_date})"
                        ])->withInput();
                    }
                }
            }
        }

        $added = 0;
        $skipped = 0;
        foreach ($validated['assignables'] as $assignable) {
            // Validate assignable data
            if (!isset($assignable['id']) || !isset($assignable['type']) || !isset($assignable['role'])) {
                $skipped++;
                continue;
            }
            
            // Check if already exists
            $exists = ProjectTeam::where('project_id', $project->id)
                ->where('role', $assignable['role'])
                ->where(function ($query) use ($assignable) {
                    if ($assignable['type'] === 'user') {
                        $query->where('user_id', $assignable['id'])
                              ->whereNull('employee_id');
                    } elseif ($assignable['type'] === 'employee') {
                        $query->where('employee_id', $assignable['id'])
                              ->whereNull('user_id');
                    }
                })
                ->exists();

            if ($exists) {
                $skipped++;
                continue; // skip duplicates
            }

            try {
                $teamMember = ProjectTeam::create([
                    'project_id'      => $project->id,
                    'user_id'        => $assignable['type'] === 'user' ? (int)$assignable['id'] : null,
                    'employee_id'    => $assignable['type'] === 'employee' ? (int)$assignable['id'] : null,
                    'assignable_type' => $assignable['type'],
                    'role'            => $assignable['role'],
                    'hourly_rate'     => $assignable['hourly_rate'],
                    'start_date'      => $assignable['start_date'],
                    'end_date'        => $assignable['end_date'] ?? null,
                    'is_active'       => true,
                ]);

                // System-wide notification for team member added
                $assignableName = $assignable['type'] === 'user' 
                    ? User::find($assignable['id'])?->name 
                    : \App\Models\Employee::find($assignable['id'])?->first_name . ' ' . \App\Models\Employee::find($assignable['id'])?->last_name;
                
                if ($assignableName) {
                    $this->createSystemNotification(
                        'general',
                        'Team Member Added',
                        "{$assignableName} has been added to project '{$project->project_name}' as {$assignable['role']}.",
                        $project,
                        route('project-management.view', $project->id)
                    );
                }

                $added++;
            } catch (\Exception $e) {
                \Log::error('Error creating project team member: ' . $e->getMessage());
                $skipped++;
                continue;
            }
        }
        
        if ($skipped > 0 && $added === 0) {
            return redirect()->back()->with('error', "No team members were added. {$skipped} member(s) were skipped (may already exist or have invalid data).");
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

            $teams = ProjectTeam::with(['user', 'employee'])
                ->where('project_id', $project->id)
                ->whereIn('id', $validated['ids'])
                ->get();

            foreach ($teams as $team) {
                $assignableName = $team->assignable_name;
                $role     = $team->role;

                // Unassign all tasks assigned to this team member in this project (only for users, not employees)
                if ($team->user_id) {
                    ProjectTask::where('assigned_to', $team->user_id)
                        ->whereHas('milestone', function ($query) use ($project) {
                            $query->where('project_id', $project->id);
                        })
                        ->update(['assigned_to' => null]);
                }

                $this->adminActivityLogs(
                    'Project Team',
                    'Delete',
                    "Removed {$assignableName} ({$role}) from Project {$project->project_name}"
                );

                $team->delete();

                // System-wide notification for team member removal
                $this->createSystemNotification(
                    'general',
                    'Team Member Removed',
                    "{$assignableName} ({$role}) has been removed from project '{$project->project_name}'.",
                    $project,
                    route('project-management.view', $project->id)
                );
            }

            return redirect()->back()->with('success', 'Selected team members removed successfully.');
        }

        // Otherwise, it's a single destroy
        if (!$projectTeam || $projectTeam->project_id !== $project->id) {
            abort(404);
        }

        $assignableName = $projectTeam->assignable_name;
        $role     = $projectTeam->role;

        // Unassign all tasks assigned to this team member in this project (only for users, not employees)
        if ($projectTeam->user_id) {
            ProjectTask::where('assigned_to', $projectTeam->user_id)
                ->whereHas('milestone', function ($query) use ($project) {
                    $query->where('project_id', $project->id);
                })
                ->update(['assigned_to' => null]);
        }

        $projectTeam->delete();

        $this->adminActivityLogs(
            'Project Team',
            'Delete',
            "Removed {$assignableName} ({$role}) from Project {$project->project_name}"
        );

        // System-wide notification for team member removal
        $this->createSystemNotification(
            'general',
            'Team Member Removed',
            "{$assignableName} ({$role}) has been removed from project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
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

        $assignableName = $projectTeam->assignable_name;

        $this->adminActivityLogs(
            'Project Team',
            'Update Status',
            'Updated ' . $assignableName . ' status to ' . $status . ' in Project ' . $project->project_name
        );

        // System-wide notification for team member status update
        $this->createSystemNotification(
            'general',
            'Team Member Status Updated',
            "{$assignableName} status has been updated to {$status} in project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
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
            'hourly_rate' => ['required', 'numeric', 'min:0'],
            'start_date'  => ['required', 'date'],
            'end_date'    => ['nullable', 'date', 'after_or_equal:start_date'],
            'is_active'   => ['required', 'boolean'],
        ]);

        // Validate dates against project dates
        if ($project->start_date || $project->planned_end_date) {
            if ($validated['start_date']) {
                if ($project->start_date && $validated['start_date'] < $project->start_date) {
                    return redirect()->back()->withErrors([
                        'start_date' => "Start date cannot be before project start date ({$project->start_date})"
                    ])->withInput();
                }
                if ($project->planned_end_date && $validated['start_date'] > $project->planned_end_date) {
                    return redirect()->back()->withErrors([
                        'start_date' => "Start date cannot be after project end date ({$project->planned_end_date})"
                    ])->withInput();
                }
            }
            if ($validated['end_date']) {
                if ($project->start_date && $validated['end_date'] < $project->start_date) {
                    return redirect()->back()->withErrors([
                        'end_date' => "End date cannot be before project start date ({$project->start_date})"
                    ])->withInput();
                }
                if ($project->planned_end_date && $validated['end_date'] > $project->planned_end_date) {
                    return redirect()->back()->withErrors([
                        'end_date' => "End date cannot be after project end date ({$project->planned_end_date})"
                    ])->withInput();
                }
            }
        }

        // Save old values for logging
        $oldAssignable = $projectTeam->assignable_name;
        $oldRole   = $projectTeam->role;
        $oldRate   = $projectTeam->hourly_rate;
        $oldDates  = ($projectTeam->start_date ?? '---') . ' - ' . ($projectTeam->end_date ?? '---');
        $oldStatus = $projectTeam->is_active ? 'Active' : 'Inactive';

        $projectTeam->update($validated);

        $projectTeam->refresh();

        $newRole   = $validated['role'];
        $newRate   = $validated['hourly_rate'] ?? '---';
        $newDates  = ($validated['start_date'] ?? '---') . ' - ' . ($validated['end_date'] ?? '---');
        $newStatus = $validated['is_active'] ? 'Active' : 'Inactive';

        $this->adminActivityLogs(
            'Project Team',
            'Update',
            "Updated team member {$oldAssignable} in Project {$project->project_name}: " .
            "Role: {$oldRole} → {$newRole}, " .
            "Rate: {$oldRate} → {$newRate}, " .
            "Dates: {$oldDates} → {$newDates}, " .
            "Status: {$oldStatus} → {$newStatus}"
        );

        // System-wide notification for team member update
        $this->createSystemNotification(
            'general',
            'Team Member Updated',
            "Team member {$oldAssignable} has been updated in project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );

        return redirect()->back()->with('success', 'Team member updated successfully.');
    }
}
