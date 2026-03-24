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
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;

class ProjectTeamsController extends Controller
{
    use ActivityLogsTrait, NotificationTrait;

    // ─── Shift definitions ────────────────────────────────────────────────────

    private function shiftHours(): array
    {
        return [
            'morning'   => ['start' => 8,  'end' => 12, 'label' => '08:00–12:00'],
            'afternoon' => ['start' => 13, 'end' => 17, 'label' => '13:00–17:00'],
            'evening'   => ['start' => 18, 'end' => 22, 'label' => '18:00–22:00'],
        ];
    }

    private function shiftsOverlap(string $a, string $b): bool
    {
        $hours = $this->shiftHours();

        if (!isset($hours[$a], $hours[$b])) {
            return true; // unknown shifts = assume overlap (safe default)
        }

        return $hours[$a]['start'] < $hours[$b]['end']
            && $hours[$b]['start'] < $hours[$a]['end'];
    }

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

        $added   = 0;
        $skipped = 0;

        foreach ($validated['assignables'] as $index => $assignable) {
            // ── Occupation guard (employees only) ─────────────────────────────
            if ($assignable['type'] === 'employee') {
                $occupiedIds = ProjectTeam::fullyOccupiedEmployeeIds();
                if (in_array($assignable['id'], $occupiedIds)) {
                    $name = $this->resolveAssignableName($assignable);
                    return redirect()->back()->withErrors([
                        "assignables.{$index}.id" =>
                            "{$name} is fully occupied on another project. Release them first before assigning here.",
                    ])->withInput();
                }
            }

            // Skip duplicate (same project + same role + same person)
            $exists = ProjectTeam::where('project_id', $project->id)
                ->where('role', $assignable['role'])
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
                    'hourly_rate'       => $assignable['hourly_rate'],
                    'start_date'        => $assignable['start_date'],
                    'end_date'          => $assignable['end_date'] ?? null,
                    'is_active'         => true,
                    'assignment_status' => AssignmentStatus::Active->value,
                    'created_by'        => auth()->id(),
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
            'hourly_rate'       => ['required', 'numeric', 'min:0'],
            'start_date'        => ['required', 'date'],
            'end_date'          => ['required', 'date', 'after_or_equal:start_date'],
            'is_active'         => ['required', 'boolean'],
            'assignment_status' => ['sometimes', 'string', 'in:' . implode(',', AssignmentStatus::values())],
        ]);

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

        // If setting employee to active, check for occupation conflicts
        if (
            isset($validated['assignment_status'])
            && $validated['assignment_status'] === AssignmentStatus::Active->value
            && $projectTeam->assignable_type === 'employee'
        ) {
            $occupiedIds = ProjectTeam::fullyOccupiedEmployeeIds();
            // Exclude self from occupied check
            $selfActive = ProjectTeam::where('employee_id', $projectTeam->employee_id)
                ->where('assignment_status', AssignmentStatus::Active->value)
                ->where('id', '!=', $projectTeam->id)
                ->count();

            if ($selfActive >= 2) {
                return redirect()->back()->withErrors([
                    'assignment_status' => "{$projectTeam->assignable_name} already has 2 active assignments.",
                ])->withInput();
            }
        }

        $old = [
            'role'   => $projectTeam->role,
            'rate'   => $projectTeam->hourly_rate,
            'dates'  => ($projectTeam->start_date ?? '—') . ' → ' . ($projectTeam->end_date ?? '—'),
            'status' => $projectTeam->assignment_status instanceof \BackedEnum
                ? $projectTeam->assignment_status->label()
                : $projectTeam->assignment_status,
        ];

        $projectTeam->update($validated);
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

        // Re-activating an employee — check occupation
        if ($newStatus === AssignmentStatus::Active && $projectTeam->assignable_type === 'employee') {
            // Count OTHER active records for this employee (not counting self)
            $otherActiveCount = ProjectTeam::where('employee_id', $projectTeam->employee_id)
                ->where('assignment_status', AssignmentStatus::Active->value)
                ->where('id', '!=', $projectTeam->id)
                ->count();

            if ($otherActiveCount >= 2) {
                return redirect()->back()->with('error',
                    "{$projectTeam->assignable_name} already has 2 active project slots. Release one first."
                );
            }

            // If they have 1 other active slotted record, the re-activation slot must not overlap
            if ($otherActiveCount === 1) {
                $existingSlot = ProjectTeam::where('employee_id', $projectTeam->employee_id)
                    ->where('assignment_status', AssignmentStatus::Active->value)
                    ->where('id', '!=', $projectTeam->id)
                    ->value('time_slot');

                if ($existingSlot && $projectTeam->time_slot
                    && $this->shiftsOverlap($projectTeam->time_slot, $existingSlot)) {
                    return redirect()->back()->with('error',
                        "{$projectTeam->assignable_name} already has an overlapping shift ({$existingSlot}) on another project."
                    );
                }
            }
        }

        $oldLabel = $projectTeam->assignment_status instanceof \BackedEnum
            ? $projectTeam->assignment_status->label()
            : $projectTeam->assignment_status;

        $projectTeam->update(['assignment_status' => $newStatus->value]);

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

    public function forceRemove(Request $request, Project $project, ProjectTeam $projectTeam)
    {
        if ($projectTeam->project_id !== $project->id) {
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

    // ─── Rotate ───────────────────────────────────────────────────────────────

    /**
     * Split an employee's working day across two projects.
     *
     * Rules:
     *   - Only employees can be rotated (contractors/users are exempt).
     *   - fullday shift is not allowed for either side (it uses all hours).
     *   - The two shifts must not overlap.
     *   - The employee must currently have only 1 active record (not already split).
     *   - A new active ProjectTeam record is created on the target project.
     *   - The current record is tagged with its retained time_slot.
     */
    public function rotate(Request $request, Project $project)
    {
        $validated = $request->validate([
            'team_id'        => ['required', 'integer', 'exists:project_teams,id'],
            'from_shift'     => ['required', 'string', 'in:morning,afternoon,evening'],
            'to_project_id'  => ['required', 'integer', 'exists:projects,id'],
            'to_shift'       => ['required', 'string', 'in:morning,afternoon,evening'],
            'to_start_date'  => ['required', 'date'],
            'to_end_date'    => ['nullable', 'date', 'after_or_equal:to_start_date'],
            'to_hourly_rate' => ['required', 'numeric', 'min:0'],
        ]);

        $currentTeam = ProjectTeam::with('employee')->findOrFail($validated['team_id']);

        if ($currentTeam->project_id !== $project->id) {
            abort(403, 'Team member does not belong to this project.');
        }

        if ($currentTeam->assignable_type !== 'employee') {
            return redirect()->back()->with('error', 'Only employees can be rotated.');
        }

        if ($currentTeam->assignment_status !== AssignmentStatus::Active) {
            return redirect()->back()->with('error', 'Only active team members can be rotated.');
        }

        $targetProject = Project::findOrFail($validated['to_project_id']);
        $employeeId    = $currentTeam->employee_id;
        $memberName    = $currentTeam->assignable_name;

        // ── Guard 1: shifts must not overlap ──────────────────────────────────
        if ($this->shiftsOverlap($validated['from_shift'], $validated['to_shift'])) {
            return redirect()->back()->with('error',
                "The two shifts overlap. Choose two non-overlapping shifts (e.g. morning + afternoon)."
            );
        }

        // ── Guard 2: employee must not already have 2 active slots ────────────
        $activeCount = ProjectTeam::where('employee_id', $employeeId)
            ->where('assignment_status', AssignmentStatus::Active->value)
            ->count();

        if ($activeCount >= 2) {
            return redirect()->back()->with('error',
                "{$memberName} is already split across 2 projects. Release one slot before rotating again."
            );
        }

        // ── Guard 3: check existing slots for overlap ─────────────────────────
        $existingSlots = ProjectTeam::where('employee_id', $employeeId)
            ->where('assignment_status', AssignmentStatus::Active->value)
            ->where('id', '!=', $currentTeam->id)
            ->pluck('time_slot')
            ->filter()
            ->toArray();

        foreach ($existingSlots as $existingSlot) {
            if ($this->shiftsOverlap($validated['to_shift'], $existingSlot)) {
                return redirect()->back()->with('error',
                    "{$memberName} already has an overlapping shift ({$existingSlot}) on another project."
                );
            }
        }

        // ── Guard 4: not already on target project ────────────────────────────
        $alreadyOnTarget = ProjectTeam::where('project_id', $targetProject->id)
            ->where('employee_id', $employeeId)
            ->where('assignment_status', AssignmentStatus::Active->value)
            ->exists();

        if ($alreadyOnTarget) {
            return redirect()->back()->with('error',
                "{$memberName} already has an active assignment on {$targetProject->project_name}."
            );
        }

        $shifts = $this->shiftHours();

        DB::beginTransaction();
        try {
            // 1. Tag current assignment with the retained shift
            $currentTeam->update([
                'time_slot'  => $validated['from_shift'],
                'work_hours' => $shifts[$validated['from_shift']]['label'],
            ]);

            // 2. Create new assignment on target project
            ProjectTeam::create([
                'project_id'        => $targetProject->id,
                'employee_id'       => $employeeId,
                'user_id'           => null,
                'assignable_type'   => 'employee',
                'role'              => $currentTeam->role,
                'hourly_rate'       => $validated['to_hourly_rate'],
                'start_date'        => $validated['to_start_date'],
                'end_date'          => $validated['to_end_date'] ?? null,
                'is_active'         => true,
                'assignment_status' => AssignmentStatus::Active->value,
                'time_slot'         => $validated['to_shift'],
                'work_hours'        => $shifts[$validated['to_shift']]['label'],
                'created_by'        => auth()->id(),
            ]);

            DB::commit();

            $fromLabel = ucfirst($validated['from_shift']) . ' (' . $shifts[$validated['from_shift']]['label'] . ')';
            $toLabel   = ucfirst($validated['to_shift'])   . ' (' . $shifts[$validated['to_shift']]['label']   . ')';

            $this->adminActivityLogs('Project Team', 'Rotate',
                "Rotated {$memberName} — {$fromLabel} on {$project->project_name}, "
                . "{$toLabel} on {$targetProject->project_name}"
            );

            $this->createSystemNotification(
                'general', 'Team Member Rotated',
                "{$memberName} is now split: {$fromLabel} on '{$project->project_name}' "
                . "and {$toLabel} on '{$targetProject->project_name}'.",
                $project,
                route('project-management.view', $project->id)
            );

            return redirect()->back()->with('success',
                "{$memberName} rotated successfully. "
                . "{$fromLabel} on {$project->project_name}, "
                . "{$toLabel} on {$targetProject->project_name}."
            );

        } catch (\Exception $e) {
            DB::rollBack();
            Log::error('Rotation error: ' . $e->getMessage());
            return redirect()->back()->with('error', 'Failed to rotate: ' . $e->getMessage());
        }
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
            'hourly_rate'       => $team->hourly_rate,
            'start_date'        => $team->start_date,
            'end_date'          => $team->end_date,
            'assignment_status' => $team->assignment_status instanceof \BackedEnum
                ? $team->assignment_status->value
                : $team->assignment_status,
            'time_slot'         => $team->time_slot,
            'work_hours'        => $team->work_hours,
            'created_at'        => $team->created_at,
        ]);

        return response()->json(['assignments' => $assignments]);
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

        $team->update(['assignment_status' => AssignmentStatus::Released->value]);

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