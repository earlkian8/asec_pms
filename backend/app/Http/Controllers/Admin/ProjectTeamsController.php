<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectTeam;
use App\Models\ProjectTask;
use App\Traits\ActivityLogsTrait;
use Illuminate\Http\Request;

class ProjectTeamsController extends Controller
{
    use ActivityLogsTrait;

    public function store(Request $request, Project $project)
    {
        $validated = $request->validate([
            'users'            => ['required', 'array', 'min:1'],
            'users.*.id'       => ['required', 'exists:users,id'],
            'users.*.role'     => ['required', 'string', 'max:50'],
            'users.*.hourly_rate' => ['required', 'numeric', 'min:0'],
            'users.*.start_date'  => ['required', 'date'],
            'users.*.end_date'    => ['nullable', 'date', 'after_or_equal:users.*.start_date'],
        ]);

        // Validate dates against project dates
        if ($project->start_date || $project->planned_end_date) {
            foreach ($validated['users'] as $index => $user) {
                if ($user['start_date']) {
                    if ($project->start_date && $user['start_date'] < $project->start_date) {
                        return redirect()->back()->withErrors([
                            "users.{$index}.start_date" => "Start date cannot be before project start date ({$project->start_date})"
                        ])->withInput();
                    }
                    if ($project->planned_end_date && $user['start_date'] > $project->planned_end_date) {
                        return redirect()->back()->withErrors([
                            "users.{$index}.start_date" => "Start date cannot be after project end date ({$project->planned_end_date})"
                        ])->withInput();
                    }
                }
                if ($user['end_date']) {
                    if ($project->start_date && $user['end_date'] < $project->start_date) {
                        return redirect()->back()->withErrors([
                            "users.{$index}.end_date" => "End date cannot be before project start date ({$project->start_date})"
                        ])->withInput();
                    }
                    if ($project->planned_end_date && $user['end_date'] > $project->planned_end_date) {
                        return redirect()->back()->withErrors([
                            "users.{$index}.end_date" => "End date cannot be after project end date ({$project->planned_end_date})"
                        ])->withInput();
                    }
                }
            }
        }

        $added = 0;
        foreach ($validated['users'] as $user) {
            $exists = ProjectTeam::where('project_id', $project->id)
                ->where('user_id', $user['id'])
                ->exists();

            if ($exists) {
                continue; // skip duplicates
            }

            ProjectTeam::create([
                'project_id'   => $project->id,
                'user_id'     => $user['id'],
                'role'         => $user['role'],
                'hourly_rate'  => $user['hourly_rate'],
                'start_date'   => $user['start_date'],
                'end_date'     => $user['end_date'],
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

            $teams = ProjectTeam::with('user')
                ->where('project_id', $project->id)
                ->whereIn('id', $validated['ids'])
                ->get();

            foreach ($teams as $team) {
                $userName = $team->user->name;
                $role     = $team->role;

                // Unassign all tasks assigned to this team member in this project
                ProjectTask::where('assigned_to', $team->user_id)
                    ->whereHas('milestone', function ($query) use ($project) {
                        $query->where('project_id', $project->id);
                    })
                    ->update(['assigned_to' => null]);

                $this->adminActivityLogs(
                    'Project Team',
                    'Delete',
                    "Removed {$userName} ({$role}) from Project {$project->project_name}"
                );

                $team->delete();
            }

            return redirect()->back()->with('success', 'Selected team members removed successfully.');
        }

        // Otherwise, it's a single destroy
        if (!$projectTeam || $projectTeam->project_id !== $project->id) {
            abort(404);
        }

        $userName = $projectTeam->user->name;
        $role     = $projectTeam->role;

        // Unassign all tasks assigned to this team member in this project
        ProjectTask::where('assigned_to', $projectTeam->user_id)
            ->whereHas('milestone', function ($query) use ($project) {
                $query->where('project_id', $project->id);
            })
            ->update(['assigned_to' => null]);

        $projectTeam->delete();

        $this->adminActivityLogs(
            'Project Team',
            'Delete',
            "Removed {$userName} ({$role}) from Project {$project->project_name}"
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

        $userName = $projectTeam->user->name;

        $this->adminActivityLogs(
            'Project Team',
            'Update Status',
            'Updated ' . $userName . ' status to ' . $status . ' in Project ' . $project->project_name
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
        $oldUser   = $projectTeam->user?->name;
        $oldRole   = $projectTeam->role;
        $oldRate   = $projectTeam->hourly_rate;
        $oldDates  = ($projectTeam->start_date ?? '---') . ' - ' . ($projectTeam->end_date ?? '---');
        $oldStatus = $projectTeam->is_active ? 'Active' : 'Inactive';

        $projectTeam->update($validated);

        $user = $projectTeam->user;

        $newRole   = $validated['role'];
        $newRate   = $validated['hourly_rate'] ?? '---';
        $newDates  = ($validated['start_date'] ?? '---') . ' - ' . ($validated['end_date'] ?? '---');
        $newStatus = $validated['is_active'] ? 'Active' : 'Inactive';

        $this->adminActivityLogs(
            'Project Team',
            'Update',
            "Updated team member {$oldUser} in Project {$project->project_name}: " .
            "Role: {$oldRole} → {$newRole}, " .
            "Rate: {$oldRate} → {$newRate}, " .
            "Dates: {$oldDates} → {$newDates}, " .
            "Status: {$oldStatus} → {$newStatus}"
        );

        return redirect()->back()->with('success', 'Team member updated successfully.');
    }
}
