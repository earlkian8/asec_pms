<?php

namespace App\Http\Controllers\Admin;

use App\Enums\AssignmentStatus;
use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Project;
use App\Models\ProjectTeam;
use App\Models\ProjectTeamStatusLog;
use App\Models\ProjectTask;
use App\Models\User;
use App\Models\CompensationProfile;
use App\Traits\ActivityLogsTrait;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Log;

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
            'assignables.*.start_date'  => ['required', 'date'],
            'assignables.*.end_date'    => ['nullable', 'date', 'after_or_equal:assignables.*.start_date'],
        ]);

        foreach ($validated['assignables'] as $index => $assignable) {
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
                    "assignables.{$index}.type" => 'Invalid assignable type.',
                ])->withInput();
            }
        }

        // Validate assignment dates against project dates
        if ($project->start_date || $project->planned_end_date) {
            foreach ($validated['assignables'] as $index => $assignable) {
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
                if ($assignable['end_date'] && $project->start_date && $assignable['end_date'] < $project->start_date) {
                    return redirect()->back()->withErrors([
                        "assignables.{$index}.end_date" => "End date cannot be before project start date ({$project->start_date})",
                    ])->withInput();
                }
                if ($assignable['end_date'] && $project->planned_end_date && $assignable['end_date'] > $project->planned_end_date) {
                    return redirect()->back()->withErrors([
                        "assignables.{$index}.end_date" => "End date cannot be after project end date ({$project->planned_end_date})",
                    ])->withInput();
                }
            }
        }

        $added   = 0;
        $skipped = 0;

        foreach ($validated['assignables'] as $index => $assignable) {
            $compensation = $this->resolveCompensationForAssignable($assignable['type'], (int) $assignable['id']);
            // ── Occupation guard (employees only) ─────────────────────────────
            // if ($assignable['type'] === 'employee') {
            //     $occupiedIds = ProjectTeam::fullyOccupiedEmployeeIds();
            //     if (in_array($assignable['id'], $occupiedIds)) {
            //         $name = $this->resolveAssignableName($assignable);
            //         return redirect()->back()->withErrors([
            //             "assignables.{$index}.id" =>
            //                 "{$name} is currently active on another project. Release them first before assigning here.",
            //         ])->withInput();
            //     }
            // }

            // Skip duplicate — only if there's already an ACTIVE assignment for this person on this project
            $exists = ProjectTeam::where('project_id', $project->id)
                ->where('assignment_status', \App\Enums\AssignmentStatus::Active->value)
                ->where(function ($q) use ($assignable) {
                    if ($assignable['type'] === 'user') {
                        $q->where('user_id', $assignable['id'])->whereNull('employee_id');
                    } else {
                        $q->where('employee_id', $assignable['id'])->whereNull('user_id');
                    }
                })
                ->exists();

            if ($exists) {
                $skipped++;
                continue;
            }

            try {
                ProjectTeam::create([
                    'project_id'        => $project->id,
                    'user_id'           => $assignable['type'] === 'user'     ? (int) $assignable['id'] : null,
                    'employee_id'       => $assignable['type'] === 'employee' ? (int) $assignable['id'] : null,
                    'assignable_type'   => $assignable['type'],
                    'role'              => $assignable['role'],
                    'pay_type'          => $compensation['pay_type'],
                    'hourly_rate'       => $compensation['hourly_rate'],
                    'monthly_salary'    => $compensation['monthly_salary'],
                    'start_date'        => $assignable['start_date'],
                    'end_date'          => $assignable['end_date'] ?? null,
                    'is_active'         => true,
                    'assignment_status' => AssignmentStatus::Active->value,
                ]);

                $name = $this->resolveAssignableName($assignable);
                $this->createSystemNotification(
                    'general',
                    'Team Member Added',
                    "{$name} has been added to project '{$project->project_name}' as {$assignable['role']}.",
                    $project,
                    route('project-management.view', $project->id)
                );

                $added++;
            } catch (\Exception $e) {
                Log::error('Error creating project team member: ' . $e->getMessage());
                $skipped++;
            }
        }

        if ($skipped > 0 && $added === 0) {
            return redirect()->back()->with('error',
                "No team members were added. {$skipped} member(s) were skipped (already exist or invalid data)."
            );
        }

        $this->adminActivityLogs('Project Team', 'Add',
            "Added {$added} team member(s) to Project {$project->project_name}"
        );

        return redirect()->back()->with('success', "{$added} team member(s) assigned successfully.");
    }

    // ─── Update ───────────────────────────────────────────────────────────────

    public function update(Request $request, Project $project, ProjectTeam $projectTeam)
    {
        if ($projectTeam->project_id !== $project->id) {
            abort(404);
        }

        $validated = $request->validate([
            'role'              => ['required', 'string', 'max:50'],
            'start_date'        => ['required', 'date'],
            'end_date'          => ['required', 'date', 'after_or_equal:start_date'],
            'is_active'         => ['required', 'boolean'],
            'assignment_status' => ['sometimes', 'string', 'in:' . implode(',', AssignmentStatus::values())],
        ]);

        $assignableId = $projectTeam->assignable_type === 'employee'
            ? (int) $projectTeam->employee_id
            : (int) $projectTeam->user_id;
        $compensation = $this->resolveCompensationForAssignable($projectTeam->assignable_type, $assignableId);

        // Date range validation against project
        if ($project->start_date || $project->planned_end_date) {
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

        // If re-activating, check no other active assignment
        // if (
        //     isset($validated['assignment_status'])
        //     && $validated['assignment_status'] === AssignmentStatus::Active->value
        //     && $projectTeam->assignable_type === 'employee'
        // ) {
        //     $conflict = ProjectTeam::where('employee_id', $projectTeam->employee_id)
        //         ->where('assignment_status', AssignmentStatus::Active->value)
        //         ->where('id', '!=', $projectTeam->id)
        //         ->exists();

        //     if ($conflict) {
        //         return redirect()->back()->withErrors([
        //             'assignment_status' => "{$projectTeam->assignable_name} already has an active assignment on another project.",
        //         ])->withInput();
        //     }
        // }

        $old = [
            'role'   => $projectTeam->role,
            'rate'   => $projectTeam->hourly_rate,
            'dates'  => ($projectTeam->start_date ?? '—') . ' → ' . ($projectTeam->end_date ?? '—'),
            'status' => $projectTeam->assignment_status instanceof \BackedEnum
                ? $projectTeam->assignment_status->label()
                : $projectTeam->assignment_status,
        ];

        $projectTeam->update(array_merge($validated, [
            'pay_type' => $compensation['pay_type'],
            'hourly_rate' => $compensation['hourly_rate'],
            'monthly_salary' => $compensation['monthly_salary'],
        ]));
        $projectTeam->refresh();

        $this->adminActivityLogs('Project Team', 'Update',
            "Updated {$projectTeam->assignable_name} in Project {$project->project_name}: "
            . "Role: {$old['role']} → {$validated['role']}, "
            . "Rate: {$old['rate']} → {$validated['hourly_rate']}, "
            . "Status: {$old['status']} → {$projectTeam->assignment_status->label()}"
        );

        $this->createSystemNotification(
            'general', 'Team Member Updated',
            "{$projectTeam->assignable_name} has been updated in project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );

        return redirect()->back()->with('success', 'Team member updated successfully.');
    }

    private function resolveCompensationForAssignable(string $assignableType, int $assignableId): array
    {
        if ($assignableId <= 0) {
            abort(422, 'Invalid assignable id for compensation lookup.');
        }

        $profileType = $assignableType === 'user' ? User::class : Employee::class;

        $profile = CompensationProfile::query()
            ->where('profileable_type', $profileType)
            ->where('profileable_id', $assignableId)
            ->where('is_active', true)
            ->orderByDesc('effective_date')
            ->first();

        if (!$profile) {
            abort(422, 'Selected member has no active compensation profile.');
        }

        $resolvedPayType = $profile->pay_type === 'monthly' ? 'salary' : $profile->pay_type;

        return [
            'pay_type' => $resolvedPayType,
            'hourly_rate' => $profile->hourly_rate,
            'monthly_salary' => $profile->monthly_salary,
        ];
    }

    // ─── Bulk Status Update (release / reactivate) ───────────────────────────

    public function bulkStatus(Request $request, Project $project)
    {
        $request->validate([
            'ids'               => 'required|array|min:1',
            'ids.*'             => 'integer|exists:project_teams,id',
            'assignment_status' => ['required', 'string', 'in:' . implode(',', AssignmentStatus::values())],
        ]);

        $newStatus = AssignmentStatus::from($request->assignment_status);

        $teams = ProjectTeam::where('project_id', $project->id)
            ->whereIn('id', $request->ids)
            ->get();

        foreach ($teams as $team) {
            $updateData = ['assignment_status' => $newStatus->value];
            if ($newStatus === AssignmentStatus::Released) {
                $updateData['released_at'] = now();
                if ($team->user_id) {
                    ProjectTask::where('assigned_to', $team->user_id)
                        ->whereHas('milestone', fn ($q) => $q->where('project_id', $project->id))
                        ->update(['assigned_to' => null]);
                }
            } elseif ($newStatus === AssignmentStatus::Active) {
                $updateData['reactivated_at'] = now();
            }
            $team->update($updateData);

            if (in_array($newStatus->value, ['released', 'reactivated'])) {
                ProjectTeamStatusLog::create([
                    'project_team_id' => $team->id,
                    'project_id'      => $project->id,
                    'action'          => $newStatus->value,
                    'performed_by'    => auth()->id(),
                ]);
            }
        }

        $this->adminActivityLogs('Project Team', 'Bulk Status',
            "Bulk updated {$teams->count()} member(s) to {$newStatus->label()} in Project {$project->project_name}"
        );

        return redirect()->back()->with('success',
            "{$teams->count()} member(s) updated to {$newStatus->label()} successfully."
        );
    }

    // ─── Handle Status (toggle active ↔ released) ────────────────────────────

    public function handleStatus(Request $request, Project $project, ProjectTeam $projectTeam)
    {
        if ($projectTeam->project_id !== $project->id) {
            abort(404);
        }

        $request->validate([
            'assignment_status' => ['required', 'string', 'in:' . implode(',', AssignmentStatus::values())],
        ]);

        $newStatus = AssignmentStatus::from($request->assignment_status);

        // Re-activating an employee — check for conflicts
        // if ($newStatus === AssignmentStatus::Active && $projectTeam->assignable_type === 'employee') {
        //     $conflict = ProjectTeam::where('employee_id', $projectTeam->employee_id)
        //         ->where('assignment_status', AssignmentStatus::Active->value)
        //         ->where('id', '!=', $projectTeam->id)
        //         ->exists();

        //     if ($conflict) {
        //         return redirect()->back()->with('error',
        //             "{$projectTeam->assignable_name} already has an active assignment on another project. Release them there first."
        //         );
        //     }
        // }

        $oldLabel = $projectTeam->assignment_status instanceof \BackedEnum
            ? $projectTeam->assignment_status->label()
            : $projectTeam->assignment_status;

        // Record timestamps
        $updateData = ['assignment_status' => $newStatus->value];

        if ($newStatus === AssignmentStatus::Released) {
            $updateData['released_at'] = now();
        } elseif ($newStatus === AssignmentStatus::Active && $projectTeam->assignment_status === AssignmentStatus::Released) {
            $updateData['reactivated_at'] = now();
        }

        $projectTeam->update($updateData);

        // Record status change log
        if ($newStatus === AssignmentStatus::Released) {
            ProjectTeamStatusLog::create([
                'project_team_id' => $projectTeam->id,
                'project_id'      => $project->id,
                'action'          => 'released',
                'performed_by'    => auth()->id(),
            ]);
        } elseif ($newStatus === AssignmentStatus::Active) {
            ProjectTeamStatusLog::create([
                'project_team_id' => $projectTeam->id,
                'project_id'      => $project->id,
                'action'          => 'reactivated',
                'performed_by'    => auth()->id(),
            ]);
        }

        $this->adminActivityLogs('Project Team', 'Update Status',
            "Updated {$projectTeam->assignable_name} assignment status from {$oldLabel} to {$newStatus->label()} "
            . "in Project {$project->project_name}"
        );

        $this->createSystemNotification(
            'general', 'Assignment Status Updated',
            "{$projectTeam->assignable_name}'s status updated to {$newStatus->label()} in '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );

        return redirect()->back()->with('success', "Assignment status updated to {$newStatus->label()}.");
    }

    // ─── Destroy (bulk or single release) ────────────────────────────────────

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

            return redirect()->back()->with('success',
                'Selected team members released. They are now available for other projects.'
            );
        }

        // Single release
        if (!$projectTeam || $projectTeam->project_id !== $project->id) {
            abort(404);
        }

        $this->releaseTeamMember($projectTeam, $project);

        return redirect()->back()->with('success',
            'Team member released. They are now available for other projects.'
        );
    }

    // ─── Force Remove (permanent delete) ─────────────────────────────────────

    public function forceRemove(Request $request, Project $project, ProjectTeam $projectTeam = null)
    {
        // Bulk force-remove
        if ($request->has('ids') && is_array($request->ids)) {
            $validated = $request->validate([
                'ids'   => 'required|array|min:1',
                'ids.*' => 'integer|exists:project_teams,id',
            ]);

            $teams = ProjectTeam::where('project_id', $project->id)
                ->whereIn('id', $validated['ids'])
                ->get();

            foreach ($teams as $team) {
                if ($team->user_id) {
                    ProjectTask::where('assigned_to', $team->user_id)
                        ->whereHas('milestone', fn ($q) => $q->where('project_id', $project->id))
                        ->update(['assigned_to' => null]);
                }
                $team->forceDelete();
            }

            $this->adminActivityLogs('Project Team', 'Remove',
                "Permanently removed {$teams->count()} member(s) from Project {$project->project_name}"
            );

            return redirect()->back()->with('success',
                "{$teams->count()} team member(s) permanently removed from the project."
            );
        }

        // Single force-remove
        if (!$projectTeam || $projectTeam->project_id !== $project->id) {
            abort(404);
        }

        $name = $projectTeam->assignable_name;
        $role = $projectTeam->role;

        if ($projectTeam->user_id) {
            ProjectTask::where('assigned_to', $projectTeam->user_id)
                ->whereHas('milestone', fn ($q) => $q->where('project_id', $project->id))
                ->update(['assigned_to' => null]);
        }

        $projectTeam->forceDelete();

        $this->adminActivityLogs('Project Team', 'Remove',
            "Permanently removed {$name} ({$role}) from Project {$project->project_name}"
        );

        $this->createSystemNotification(
            'general', 'Team Member Removed',
            "{$name} ({$role}) has been permanently removed from '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );

        return redirect()->back()->with('success', "{$name} has been permanently removed from the project.");
    }

    // ─── History ──────────────────────────────────────────────────────────────

    /**
     * Return all ProjectTeam records for a given employee or user.
     * Used by the eye-icon "View Assignment History" modal.
     *
     * GET /project-management/project-teams/history?employee_id=X
     * GET /project-management/project-teams/history?user_id=X
     */
    public function history(Request $request)
    {
        $request->validate([
            'employee_id' => ['nullable', 'integer', 'exists:employees,id'],
            'user_id'     => ['nullable', 'integer', 'exists:users,id'],
        ]);

        if (!$request->employee_id && !$request->user_id) {
            return response()->json(['assignments' => []]);
        }

        $query = ProjectTeam::with(['project:id,project_name,start_date,planned_end_date'])
            ->orderByRaw("CASE WHEN assignment_status = 'active' THEN 0 ELSE 1 END")
            ->orderBy('created_at', 'desc');

        if ($request->employee_id) {
            $query->where('employee_id', $request->employee_id);
        } else {
            $query->where('user_id', $request->user_id);
        }

        $assignments = $query->get()->map(fn ($team) => [
            'id'                => $team->id,
            'project_id'        => $team->project_id,
            'project'           => $team->project ? [
                'id'               => $team->project->id,
                'project_name'     => $team->project->project_name,
                'start_date'       => $team->project->start_date,
                'planned_end_date' => $team->project->planned_end_date,
            ] : null,
            'role'              => $team->role,
            'pay_type'          => $team->pay_type ?? 'hourly',
            'hourly_rate'       => $team->hourly_rate,
            'monthly_salary'    => $team->monthly_salary,
            'start_date'        => $team->start_date,
            'end_date'          => $team->end_date,
            'assignment_status' => $team->assignment_status instanceof \BackedEnum
                ? $team->assignment_status->value
                : $team->assignment_status,
            'released_at'       => $team->released_at?->toISOString(),
            'reactivated_at'    => $team->reactivated_at?->toISOString(),
            'created_at'        => $team->created_at?->toISOString(),
        ]);

        return response()->json(['assignments' => $assignments]);
    }

    // ─── Status Logs ──────────────────────────────────────────────────────────

    /**
     * Return the release/reactivate log for a specific project team member.
     *
     * GET /project-management/project-teams/status-logs/{project}/team/{projectTeam}
     */
    public function statusLogs(Project $project, ProjectTeam $projectTeam)
    {
        if ($projectTeam->project_id !== $project->id) {
            abort(404);
        }

        $logs = ProjectTeamStatusLog::with('performer:id,first_name,last_name')
            ->where('project_team_id', $projectTeam->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn ($log) => [
                'id'           => $log->id,
                'action'       => $log->action,
                'performed_by' => $log->performer ? trim($log->performer->first_name . ' ' . $log->performer->last_name) : 'System',
                'created_at'   => $log->created_at?->toIso8601String(),
            ]);

        return response()->json(['logs' => $logs]);
    }

    // ─── Private Helpers ──────────────────────────────────────────────────────

    /**
     * Release a team member: sets assignment_status → released.
     * Row is KEPT for history. Unassigns open tasks for user-type members.
     */
    private function releaseTeamMember(ProjectTeam $team, Project $project): void
    {
        $name = $team->assignable_name;
        $role = $team->role;

        if ($team->user_id) {
            ProjectTask::where('assigned_to', $team->user_id)
                ->whereHas('milestone', fn ($q) => $q->where('project_id', $project->id))
                ->update(['assigned_to' => null]);
        }

        $team->update([
            'assignment_status' => AssignmentStatus::Released->value,
            'released_at'       => now(),
        ]);

        ProjectTeamStatusLog::create([
            'project_team_id' => $team->id,
            'project_id'      => $project->id,
            'action'          => 'released',
            'performed_by'    => auth()->id(),
        ]);

        $this->adminActivityLogs('Project Team', 'Release',
            "Released {$name} ({$role}) from Project {$project->project_name}"
        );

        $this->createSystemNotification(
            'general', 'Team Member Released',
            "{$name} ({$role}) has been released from '{$project->project_name}' and is now available.",
            $project,
            route('project-management.view', $project->id)
        );
    }

    /**
     * Resolve display name from assignable array (before model is created).
     */
    private function resolveAssignableName(array $assignable): string
    {
        if ($assignable['type'] === 'user') {
            return User::find($assignable['id'])?->name ?? 'Unknown User';
        }

        $employee = Employee::find($assignable['id']);
        return $employee
            ? trim($employee->first_name . ' ' . $employee->last_name)
            : 'Unknown Employee';
    }
}