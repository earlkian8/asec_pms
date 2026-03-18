<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AssignmentStatus;
use App\Http\Controllers\Controller;
use App\Models\Employee;
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

    // ─── Store ────────────────────────────────────────────────────────────────

    public function store(Request $request, Project $project)
    {
        $validated = $request->validate([
            'assignables'               => ['required', 'array', 'min:1'],
            'assignables.*.id'          => ['required'],
            'assignables.*.type'        => ['required', 'in:user,employee'],
            'assignables.*.role'        => ['required', 'string', 'max:50'],
            'assignables.*.hourly_rate' => ['required', 'numeric', 'min:0'],
            'assignables.*.start_date'  => ['required', 'date'],
            'assignables.*.end_date'    => ['required', 'date', 'after_or_equal:assignables.*.start_date'],
        ]);

        // Validate IDs based on type
        foreach ($validated['assignables'] as $index => $assignable) {
            if (!isset($assignable['id']) || !isset($assignable['type'])) {
                return redirect()->back()->withErrors([
                    "assignables.{$index}.id" => 'Invalid assignable data provided.',
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
                    "assignables.{$index}.type" => 'Invalid assignable type. Must be "user" or "employee".',
                ])->withInput();
            }
        }

        // Validate assignment dates against project dates
        if ($project->start_date || $project->planned_end_date) {
            foreach ($validated['assignables'] as $index => $assignable) {
                if ($assignable['start_date']) {
                    if ($project->start_date && $assignable['start_date'] < $project->start_date) {
                        return redirect()->back()->withErrors([
                            "assignables.{$index}.start_date" => "Start date cannot be before project start date ({$project->start_date})",
                        ])->withInput();
                    }
                    if ($project->planned_end_date && $assignable['start_date'] > $project->planned_end_date) {
                        return redirect()->back()->withErrors([
                            "assignables.{$index}.start_date" => "Start date cannot be after project end date ({$project->planned_end_date})",
                        ])->withInput();
                    }
                }
                if ($assignable['end_date']) {
                    if ($project->start_date && $assignable['end_date'] < $project->start_date) {
                        return redirect()->back()->withErrors([
                            "assignables.{$index}.end_date" => "End date cannot be before project start date ({$project->start_date})",
                        ])->withInput();
                    }
                    if ($project->planned_end_date && $assignable['end_date'] > $project->planned_end_date) {
                        return redirect()->back()->withErrors([
                            "assignables.{$index}.end_date" => "End date cannot be after project end date ({$project->planned_end_date})",
                        ])->withInput();
                    }
                }
            }
        }

        $added   = 0;
        $skipped = 0;

        foreach ($validated['assignables'] as $index => $assignable) {
            if (!isset($assignable['id']) || !isset($assignable['type']) || !isset($assignable['role'])) {
                $skipped++;
                continue;
            }

            // ── Single-assignment constraint (employees only) ─────────────────
            // Users (contractors) are exempt — they can work on multiple projects.
            if ($assignable['type'] === 'employee') {
                $isOccupied = ProjectTeam::occupied()
                    ->where('employee_id', $assignable['id'])
                    ->exists();

                if ($isOccupied) {
                    $name = $this->resolveAssignableName($assignable);
                    return redirect()->back()->withErrors([
                        "assignables.{$index}.id" =>
                            "{$name} already has an active project assignment. They must be released or their assignment must complete before being assigned to another project.",
                    ])->withInput();
                }
            }

            // Skip if already in this project with the same role
            $exists = ProjectTeam::where('project_id', $project->id)
                ->where('role', $assignable['role'])
                ->where(function ($query) use ($assignable) {
                    if ($assignable['type'] === 'user') {
                        $query->where('user_id', $assignable['id'])->whereNull('employee_id');
                    } elseif ($assignable['type'] === 'employee') {
                        $query->where('employee_id', $assignable['id'])->whereNull('user_id');
                    }
                })
                ->exists();

            if ($exists) {
                $skipped++;
                continue;
            }

            try {
                $teamMember = ProjectTeam::create([
                    'project_id'        => $project->id,
                    'user_id'           => $assignable['type'] === 'user' ? (int) $assignable['id'] : null,
                    'employee_id'       => $assignable['type'] === 'employee' ? (int) $assignable['id'] : null,
                    'assignable_type'   => $assignable['type'],
                    'role'              => $assignable['role'],
                    'hourly_rate'       => $assignable['hourly_rate'],
                    'start_date'        => $assignable['start_date'],
                    'end_date'          => $assignable['end_date'] ?? null,
                    'is_active'         => true,
                    'assignment_status' => AssignmentStatus::Active->value,
                ]);

                $assignableName = $this->resolveAssignableName($assignable);

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

        return redirect()->back()->with('success', "{$added} team member(s) assigned successfully.");
    }

    // ─── Release (replaces hard-delete) ──────────────────────────────────────

    /**
     * Releasing a team member sets their status to 'released' (historical record preserved).
     * The person immediately becomes available for assignment to another project.
     *
     * Bulk release is supported via an `ids` array in the request body.
     */
    public function destroy(Request $request, Project $project, ProjectTeam $projectTeam = null)
    {
        // Bulk release
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
                $this->releaseTeamMember($team, $project);
            }

            return redirect()->back()->with('success', 'Selected team members released successfully. They are now available for other projects.');
        }

        // Single release
        if (!$projectTeam || $projectTeam->project_id !== $project->id) {
            abort(404);
        }

        $this->releaseTeamMember($projectTeam, $project);

        return redirect()->back()->with('success', 'Team member released successfully. They are now available for other projects.');
    }

    // ─── Handle Status ────────────────────────────────────────────────────────

    /**
     * Toggle assignment status between active <-> released.
     * "Pausing" someone on a project sets them to released (available elsewhere).
     * "Re-activating" brings them back to active on this project (blocks other assignments again).
     */
    public function handleStatus(Request $request, Project $project, ProjectTeam $projectTeam)
    {
        if ($projectTeam->project_id !== $project->id) {
            abort(404);
        }

        $request->validate([
            'assignment_status' => ['required', 'string', 'in:' . implode(',', AssignmentStatus::values())],
        ]);

        $newStatus = AssignmentStatus::from($request->assignment_status);

        // If re-activating an employee, guard against double-booking.
        // Users (contractors) are exempt from this check.
        if ($newStatus === AssignmentStatus::Active && $projectTeam->assignable_type === 'employee') {
            $conflict = ProjectTeam::occupied()
                ->where('id', '!=', $projectTeam->id)
                ->where('employee_id', $projectTeam->employee_id)
                ->exists();

            if ($conflict) {
                return redirect()->back()->with('error',
                    "{$projectTeam->assignable_name} already has an active assignment on another project. Release them there first."
                );
            }
        }

        $oldStatus = $projectTeam->assignment_status->label();
        $projectTeam->update(['assignment_status' => $newStatus->value]);
        $newStatusLabel = $newStatus->label();
        $assignableName = $projectTeam->assignable_name;

        $this->adminActivityLogs(
            'Project Team',
            'Update Status',
            "Updated {$assignableName} assignment status from {$oldStatus} to {$newStatusLabel} in Project {$project->project_name}"
        );

        $this->createSystemNotification(
            'general',
            'Assignment Status Updated',
            "{$assignableName}'s assignment status has been updated to {$newStatusLabel} in project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );

        return redirect()->back()->with('success', "Assignment status updated to {$newStatusLabel}.");
    }

    // ─── Update ───────────────────────────────────────────────────────────────

    public function update(Request $request, Project $project, ProjectTeam $projectTeam)
    {
        if ($projectTeam->project_id !== $project->id) {
            abort(404);
        }

        $validated = $request->validate([
            'role'              => ['required', 'string', 'max:50'],
            'hourly_rate'       => ['required', 'numeric', 'min:0'],
            'start_date'        => ['required', 'date'],
            'end_date'          => ['required', 'date', 'after_or_equal:start_date'],
            'is_active'         => ['required', 'boolean'],
            'assignment_status' => ['sometimes', 'string', 'in:' . implode(',', AssignmentStatus::values())],
        ]);

        // Validate dates against project dates
        if ($project->start_date || $project->planned_end_date) {
            if ($validated['start_date']) {
                if ($project->start_date && $validated['start_date'] < $project->start_date) {
                    return redirect()->back()->withErrors([
                        'start_date' => "Start date cannot be before project start date ({$project->start_date})",
                    ])->withInput();
                }
                if ($project->planned_end_date && $validated['start_date'] > $project->planned_end_date) {
                    return redirect()->back()->withErrors([
                        'start_date' => "Start date cannot be after project end date ({$project->planned_end_date})",
                    ])->withInput();
                }
            }
            if ($validated['end_date']) {
                if ($project->start_date && $validated['end_date'] < $project->start_date) {
                    return redirect()->back()->withErrors([
                        'end_date' => "End date cannot be before project start date ({$project->start_date})",
                    ])->withInput();
                }
                if ($project->planned_end_date && $validated['end_date'] > $project->planned_end_date) {
                    return redirect()->back()->withErrors([
                        'end_date' => "End date cannot be after project end date ({$project->planned_end_date})",
                    ])->withInput();
                }
            }
        }

        // If updating an employee to 'active', guard against double-booking
        // Users (contractors) are exempt
        if (
            isset($validated['assignment_status'])
            && $validated['assignment_status'] === AssignmentStatus::Active->value
            && $projectTeam->assignable_type === 'employee'
        ) {
            $conflict = ProjectTeam::occupied()
                ->where('id', '!=', $projectTeam->id)
                ->where('employee_id', $projectTeam->employee_id)
                ->exists();

            if ($conflict) {
                return redirect()->back()->withErrors([
                    'assignment_status' => "{$projectTeam->assignable_name} already has an active assignment on another project.",
                ])->withInput();
            }
        }

        $oldAssignable = $projectTeam->assignable_name;
        $oldRole       = $projectTeam->role;
        $oldRate       = $projectTeam->hourly_rate;
        $oldDates      = ($projectTeam->start_date ?? '---') . ' - ' . ($projectTeam->end_date ?? '---');
        $oldStatus     = $projectTeam->assignment_status->label();

        $projectTeam->update($validated);
        $projectTeam->refresh();

        $newRole   = $validated['role'];
        $newRate   = $validated['hourly_rate'] ?? '---';
        $newDates  = ($validated['start_date'] ?? '---') . ' - ' . ($validated['end_date'] ?? '---');
        $newStatus = $projectTeam->assignment_status->label();

        $this->adminActivityLogs(
            'Project Team',
            'Update',
            "Updated team member {$oldAssignable} in Project {$project->project_name}: " .
            "Role: {$oldRole} → {$newRole}, " .
            "Rate: {$oldRate} → {$newRate}, " .
            "Dates: {$oldDates} → {$newDates}, " .
            "Status: {$oldStatus} → {$newStatus}"
        );

        $this->createSystemNotification(
            'general',
            'Team Member Updated',
            "Team member {$oldAssignable} has been updated in project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );

        return redirect()->back()->with('success', 'Team member updated successfully.');
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    /**
     * Set a team member's assignment_status to 'released' and unassign their tasks.
     * The DB row is KEPT — this is the rotation/history mechanism.
     */
    private function releaseTeamMember(ProjectTeam $team, Project $project): void
    {
        $assignableName = $team->assignable_name;
        $role           = $team->role;

        // Unassign open tasks (only applicable for user-type team members)
        if ($team->user_id) {
            ProjectTask::where('assigned_to', $team->user_id)
                ->whereHas('milestone', function ($query) use ($project) {
                    $query->where('project_id', $project->id);
                })
                ->update(['assigned_to' => null]);
        }

        $team->update(['assignment_status' => AssignmentStatus::Released->value]);

        $this->adminActivityLogs(
            'Project Team',
            'Release',
            "Released {$assignableName} ({$role}) from Project {$project->project_name} - now available for other projects"
        );

        $this->createSystemNotification(
            'general',
            'Team Member Released',
            "{$assignableName} ({$role}) has been released from project '{$project->project_name}' and is now available for re-assignment.",
            $project,
            route('project-management.view', $project->id)
        );
    }

    // ─── Force Remove (real delete) ───────────────────────────────────────

    /**
     * Permanently remove a team member from the project (hard delete).
     * Use this when someone was assigned by mistake.
     */
    public function forceRemove(Request $request, Project $project, ProjectTeam $projectTeam)
    {
        if ($projectTeam->project_id !== $project->id) {
            abort(404);
        }

        $assignableName = $projectTeam->assignable_name;
        $role           = $projectTeam->role;

        // Unassign open tasks first
        if ($projectTeam->user_id) {
            ProjectTask::where('assigned_to', $projectTeam->user_id)
                ->whereHas('milestone', function ($query) use ($project) {
                    $query->where('project_id', $project->id);
                })
                ->update(['assigned_to' => null]);
        }

        $projectTeam->forceDelete();

        $this->adminActivityLogs(
            'Project Team',
            'Remove',
            "Permanently removed {$assignableName} ({$role}) from Project {$project->project_name}"
        );

        $this->createSystemNotification(
            'general',
            'Team Member Removed',
            "{$assignableName} ({$role}) has been permanently removed from project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );

        return redirect()->back()->with('success', "{$assignableName} has been permanently removed from the project.");
    }

    /**
     * Resolve a display name from an assignable array (used before the model is created).
     */
    private function resolveAssignableName(array $assignable): string
    {
        if ($assignable['type'] === 'user') {
            return User::find($assignable['id'])?->name ?? 'Unknown User';
        }

        $employee = Employee::find($assignable['id']);
        return $employee ? trim($employee->first_name . ' ' . $employee->last_name) : 'Unknown Employee';
    }
}
