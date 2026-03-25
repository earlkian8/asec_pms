<?php

namespace App\Http\Controllers\Api\TaskManagement;

use App\Enums\AssignmentStatus;
use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\ProjectTeam;
use App\Models\User;
use App\Services\TaskManagementAuthorization;
use Illuminate\Http\Request;

class TeamController extends Controller
{
    /**
     * Admin-like assignables list for team assignment UI.
     * - Users: can be assigned to multiple projects
     * - Employees: exclude occupied employees (rotation rule)
     */
    public function assignables(Request $request, Project $project)
    {
        $user = $request->user();
        $authz = app(TaskManagementAuthorization::class);

        if (!$authz->isAssignedToProject($user, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Project not found or you do not have access to it',
            ], 404);
        }

        $existingUserIds = ProjectTeam::query()
            ->where('project_id', $project->id)
            ->whereNotNull('user_id')
            ->pluck('user_id')
            ->unique()
            ->filter()
            ->toArray();

        $existingEmployeeIds = ProjectTeam::query()
            ->where('project_id', $project->id)
            ->whereNotNull('employee_id')
            ->pluck('employee_id')
            ->unique()
            ->filter()
            ->toArray();

        $users = User::query()
            ->whereNull('deleted_at')
            ->when(count($existingUserIds) > 0, fn ($q) => $q->whereNotIn('id', $existingUserIds))
            ->with('roles')
            ->orderBy('name')
            ->get(['id', 'name', 'email'])
            ->map(fn (User $u) => [
                'id' => $u->id,
                'type' => 'user',
                'name' => $u->name,
                'email' => $u->email,
                'roleSuggestion' => $u->roles->first()?->name,
            ]);

        $occupiedEmployeeIds = ProjectTeam::occupied()
            ->whereNotNull('employee_id')
            ->pluck('employee_id')
            ->unique()
            ->filter()
            ->toArray();

        $excludeEmployeeIds = array_values(array_unique(array_filter(array_merge($occupiedEmployeeIds, $existingEmployeeIds))));

        $employees = Employee::query()
            ->where('is_active', true)
            ->when(count($excludeEmployeeIds) > 0, fn ($q) => $q->whereNotIn('id', $excludeEmployeeIds))
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get(['id', 'first_name', 'last_name', 'email', 'position'])
            ->map(fn (Employee $e) => [
                'id' => $e->id,
                'type' => 'employee',
                'name' => trim($e->first_name . ' ' . $e->last_name),
                'email' => $e->email,
                'position' => $e->position,
                'roleSuggestion' => $e->position,
            ]);

        return response()->json([
            'success' => true,
            'data' => $users->concat($employees)->sortBy('name')->values(),
        ]);
    }

    public function index(Request $request, Project $project)
    {
        $user = $request->user();
        $authz = app(TaskManagementAuthorization::class);

        if (!$authz->isAssignedToProject($user, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Project not found or you do not have access to it',
            ], 404);
        }

        $team = ProjectTeam::query()
            ->where('project_id', $project->id)
            ->with(['user', 'employee'])
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (ProjectTeam $t) => [
                'id' => $t->id,
                'projectId' => $t->project_id,
                'assignableType' => $t->assignable_type,
                'userId' => $t->user_id,
                'employeeId' => $t->employee_id,
                'name' => $t->assignable_name,
                'role' => $t->role,
                'hourlyRate' => $t->hourly_rate,
                'startDate' => $t->start_date,
                'endDate' => $t->end_date,
                'isActive' => (bool) $t->is_active,
                'assignmentStatus' => $t->assignment_status?->value ?? $t->assignment_status,
                'createdAt' => $t->created_at?->toISOString(),
                'updatedAt' => $t->updated_at?->toISOString(),
            ])
            ->values();

        return response()->json([
            'success' => true,
            'data' => $team,
        ]);
    }

    /**
     * Assign team members to project (bulk).
     * Mirrors admin validation and employee single-assignment constraint.
     */
    public function store(Request $request, Project $project)
    {
        $user = $request->user();
        $authz = app(TaskManagementAuthorization::class);

        if (!$authz->isAssignedToProject($user, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Project not found or you do not have access to it',
            ], 404);
        }

        $validated = $request->validate([
            'assignables'               => ['required', 'array', 'min:1'],
            'assignables.*.id'          => ['required'],
            'assignables.*.type'        => ['required', 'in:user,employee'],
            'assignables.*.role'        => ['required', 'string', 'max:50'],
            'assignables.*.hourly_rate' => ['required', 'numeric', 'min:0'],
            'assignables.*.start_date'  => ['required', 'date'],
            'assignables.*.end_date'    => ['required', 'date', 'after_or_equal:assignables.*.start_date'],
        ]);

        // Validate IDs
        foreach ($validated['assignables'] as $index => $assignable) {
            if ($assignable['type'] === 'user') {
                $request->validate([
                    "assignables.{$index}.id" => ['required', 'integer', 'exists:users,id'],
                ]);
            } else {
                $request->validate([
                    "assignables.{$index}.id" => ['required', 'integer', 'exists:employees,id'],
                ]);
            }
        }

        // Validate assignment dates against project dates
        if ($project->start_date || $project->planned_end_date) {
            foreach ($validated['assignables'] as $index => $assignable) {
                if ($assignable['start_date']) {
                    if ($project->start_date && $assignable['start_date'] < $project->start_date) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Start date cannot be before project start date',
                            'errors' => [
                                "assignables.{$index}.start_date" => ["Start date cannot be before project start date ({$project->start_date})"],
                            ],
                        ], 422);
                    }
                    if ($project->planned_end_date && $assignable['start_date'] > $project->planned_end_date) {
                        return response()->json([
                            'success' => false,
                            'message' => 'Start date cannot be after project end date',
                            'errors' => [
                                "assignables.{$index}.start_date" => ["Start date cannot be after project end date ({$project->planned_end_date})"],
                            ],
                        ], 422);
                    }
                }
                if ($assignable['end_date']) {
                    if ($project->start_date && $assignable['end_date'] < $project->start_date) {
                        return response()->json([
                            'success' => false,
                            'message' => 'End date cannot be before project start date',
                            'errors' => [
                                "assignables.{$index}.end_date" => ["End date cannot be before project start date ({$project->start_date})"],
                            ],
                        ], 422);
                    }
                    if ($project->planned_end_date && $assignable['end_date'] > $project->planned_end_date) {
                        return response()->json([
                            'success' => false,
                            'message' => 'End date cannot be after project end date',
                            'errors' => [
                                "assignables.{$index}.end_date" => ["End date cannot be after project end date ({$project->planned_end_date})"],
                            ],
                        ], 422);
                    }
                }
            }
        }

        $created = [];

        foreach ($validated['assignables'] as $assignable) {
            // Employee single-assignment constraint
            if ($assignable['type'] === 'employee') {
                $isOccupied = ProjectTeam::occupied()
                    ->where('employee_id', (int) $assignable['id'])
                    ->exists();

                if ($isOccupied) {
                    $name = $this->resolveAssignableName($assignable);
                    return response()->json([
                        'success' => false,
                        'message' => "{$name} already has an active project assignment. Release or complete it first.",
                    ], 422);
                }
            }

            // Skip duplicates in same project+role+person
            $exists = ProjectTeam::where('project_id', $project->id)
                ->where('role', $assignable['role'])
                ->where(function ($query) use ($assignable) {
                    if ($assignable['type'] === 'user') {
                        $query->where('user_id', (int) $assignable['id'])->whereNull('employee_id');
                    } else {
                        $query->where('employee_id', (int) $assignable['id'])->whereNull('user_id');
                    }
                })
                ->exists();

            if ($exists) {
                continue;
            }

            $teamMember = ProjectTeam::create([
                'project_id' => $project->id,
                'user_id' => $assignable['type'] === 'user' ? (int) $assignable['id'] : null,
                'employee_id' => $assignable['type'] === 'employee' ? (int) $assignable['id'] : null,
                'assignable_type' => $assignable['type'],
                'role' => $assignable['role'],
                'hourly_rate' => $assignable['hourly_rate'],
                'start_date' => $assignable['start_date'],
                'end_date' => $assignable['end_date'] ?? null,
                'is_active' => true,
                'assignment_status' => AssignmentStatus::Active->value,
                'created_by' => $user->id,
            ]);

            $created[] = $teamMember->id;
        }

        return response()->json([
            'success' => true,
            'message' => 'Team assigned successfully',
            'data' => [
                'createdIds' => $created,
            ],
        ]);
    }

    /**
     * Update a team member's assignment details (rate/dates/role).
     * Mirrors admin validation (project date bounds) but is project-scoped.
     */
    public function update(Request $request, Project $project, ProjectTeam $projectTeam)
    {
        $user = $request->user();
        $authz = app(TaskManagementAuthorization::class);

        if ((int) $projectTeam->project_id !== (int) $project->id || !$authz->isAssignedToProject($user, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Team member not found or you do not have access',
            ], 404);
        }

        $validated = $request->validate([
            'role' => ['required', 'string', 'max:50'],
            'hourly_rate' => ['required', 'numeric', 'min:0'],
            'start_date' => ['required', 'date'],
            'end_date' => ['required', 'date', 'after_or_equal:start_date'],
        ]);

        // Validate assignment dates against project dates
        if ($project->start_date || $project->planned_end_date) {
            if (!empty($validated['start_date'])) {
                if ($project->start_date && $validated['start_date'] < $project->start_date) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Start date cannot be before project start date',
                        'errors' => [
                            'start_date' => ["Start date cannot be before project start date ({$project->start_date})"],
                        ],
                    ], 422);
                }
                if ($project->planned_end_date && $validated['start_date'] > $project->planned_end_date) {
                    return response()->json([
                        'success' => false,
                        'message' => 'Start date cannot be after project end date',
                        'errors' => [
                            'start_date' => ["Start date cannot be after project end date ({$project->planned_end_date})"],
                        ],
                    ], 422);
                }
            }

            if (!empty($validated['end_date'])) {
                if ($project->start_date && $validated['end_date'] < $project->start_date) {
                    return response()->json([
                        'success' => false,
                        'message' => 'End date cannot be before project start date',
                        'errors' => [
                            'end_date' => ["End date cannot be before project start date ({$project->start_date})"],
                        ],
                    ], 422);
                }
                if ($project->planned_end_date && $validated['end_date'] > $project->planned_end_date) {
                    return response()->json([
                        'success' => false,
                        'message' => 'End date cannot be after project end date',
                        'errors' => [
                            'end_date' => ["End date cannot be after project end date ({$project->planned_end_date})"],
                        ],
                    ], 422);
                }
            }
        }

        $projectTeam->update([
            'role' => $validated['role'],
            'hourly_rate' => $validated['hourly_rate'],
            'start_date' => $validated['start_date'],
            'end_date' => $validated['end_date'],
        ]);

        $projectTeam->refresh();

        return response()->json([
            'success' => true,
            'message' => 'Team member updated successfully',
            'data' => [
                'id' => $projectTeam->id,
                'role' => $projectTeam->role,
                'hourlyRate' => $projectTeam->hourly_rate,
                'startDate' => $projectTeam->start_date,
                'endDate' => $projectTeam->end_date,
            ],
        ]);
    }

    /**
     * Update assignment status (release/reactivate/etc.)
     * Mirrors admin conflict checks when reactivating an employee.
     */
    public function updateStatus(Request $request, Project $project, ProjectTeam $projectTeam)
    {
        $user = $request->user();
        $authz = app(TaskManagementAuthorization::class);

        if ((int) $projectTeam->project_id !== (int) $project->id || !$authz->isAssignedToProject($user, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Team member not found or you do not have access',
            ], 404);
        }

        // Rotation is employees-only (admin rule)
        if ($projectTeam->assignable_type !== 'employee') {
            return response()->json([
                'success' => false,
                'message' => 'Only employees can be rotated (released/reactivated).',
            ], 422);
        }

        $request->validate([
            'assignment_status' => ['required', 'string', 'in:' . implode(',', AssignmentStatus::values())],
        ]);

        $newStatus = AssignmentStatus::from($request->assignment_status);

        if ($newStatus === AssignmentStatus::Active && $projectTeam->assignable_type === 'employee') {
            $conflict = ProjectTeam::occupied()
                ->where('id', '!=', $projectTeam->id)
                ->where('employee_id', $projectTeam->employee_id)
                ->exists();

            if ($conflict) {
                return response()->json([
                    'success' => false,
                    'message' => "{$projectTeam->assignable_name} already has an active assignment on another project. Release them there first.",
                ], 422);
            }
        }

        // Record timestamps
        $updateData = ['assignment_status' => $newStatus->value];

        if ($newStatus === AssignmentStatus::Released) {
            $updateData['released_at'] = now();
        } elseif ($newStatus === AssignmentStatus::Active && $projectTeam->assignment_status === AssignmentStatus::Released) {
            $updateData['reactivated_at'] = now();
        }

        $projectTeam->update($updateData);

        return response()->json([
            'success' => true,
            'message' => 'Assignment status updated successfully',
            'data' => [
                'id' => $projectTeam->id,
                'assignmentStatus' => $projectTeam->assignment_status?->value ?? $projectTeam->assignment_status,
            ],
        ]);
    }

    /**
     * Release team member (preserve history, unassign tasks for user-type).
     */
    public function release(Request $request, Project $project, ProjectTeam $projectTeam)
    {
        $user = $request->user();
        $authz = app(TaskManagementAuthorization::class);

        if ((int) $projectTeam->project_id !== (int) $project->id || !$authz->isAssignedToProject($user, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Team member not found or you do not have access',
            ], 404);
        }

        // Rotation is employees-only (admin rule)
        if ($projectTeam->assignable_type !== 'employee') {
            return response()->json([
                'success' => false,
                'message' => 'Only employees can be rotated (released/reactivated).',
            ], 422);
        }

        // Unassign open tasks (only applicable for user-type team members)
        if ($projectTeam->user_id) {
            ProjectTask::where('assigned_to', $projectTeam->user_id)
                ->whereHas('milestone', function ($query) use ($project) {
                    $query->where('project_id', $project->id);
                })
                ->update(['assigned_to' => null]);
        }

        $projectTeam->update([
            'assignment_status' => AssignmentStatus::Released->value,
            'released_at'       => now(),
        ]);

        return response()->json([
            'success' => true,
            'message' => 'Team member released successfully',
        ]);
    }

    /**
     * Force remove (hard delete). Optional capability for mistakes.
     */
    public function forceRemove(Request $request, Project $project, ProjectTeam $projectTeam)
    {
        $user = $request->user();
        $authz = app(TaskManagementAuthorization::class);

        if ((int) $projectTeam->project_id !== (int) $project->id || !$authz->isAssignedToProject($user, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Team member not found or you do not have access',
            ], 404);
        }

        if ($projectTeam->user_id) {
            ProjectTask::where('assigned_to', $projectTeam->user_id)
                ->whereHas('milestone', function ($query) use ($project) {
                    $query->where('project_id', $project->id);
                })
                ->update(['assigned_to' => null]);
        }

        $projectTeam->forceDelete();

        return response()->json([
            'success' => true,
            'message' => 'Team member permanently removed',
        ]);
    }

    private function resolveAssignableName(array $assignable): string
    {
        if (($assignable['type'] ?? null) === 'user') {
            return User::find((int) $assignable['id'])?->name ?? 'Unknown User';
        }

        $employee = Employee::find((int) $assignable['id']);
        return $employee ? trim($employee->first_name . ' ' . $employee->last_name) : 'Unknown Employee';
    }
}

