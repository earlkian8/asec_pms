<?php

namespace App\Services;

use App\Enums\AssignmentStatus;
use App\Models\Employee;
use App\Models\Project;
use App\Models\ProjectTeam;
use App\Models\User;

class ProjectTeamService
{
    public function getProjectTeamData(Project $project, $request = null)
    {
        $search    = request('search');
        $role      = request('role');
        $status    = request('status');
        $startDate = request('start_date');
        $endDate   = request('end_date');
        $sortBy    = request('sort_by', 'created_at');
        $sortOrder = request('sort_order', 'desc');

        // Validate sort column
        $allowedSortColumns = [
            'created_at', 'role', 'hourly_rate',
            'start_date', 'end_date', 'assignment_status',
        ];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'created_at';
        }
        $sortOrder = in_array(strtolower($sortOrder), ['asc', 'desc'])
            ? strtolower($sortOrder)
            : 'desc';

        // ── Main query ────────────────────────────────────────────────────────
        $projectTeams = ProjectTeam::with(['user.roles', 'employee'])
            ->where('project_id', $project->id)
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereHas('user', fn ($uq) =>
                        $uq->where('first_name', 'ilike', "%{$search}%")
                           ->orWhere('last_name', 'ilike', "%{$search}%")
                           ->orWhere('email', 'ilike', "%{$search}%")
                    )
                    ->orWhereHas('employee', fn ($eq) =>
                        $eq->where('first_name', 'ilike', "%{$search}%")
                           ->orWhere('last_name', 'ilike', "%{$search}%")
                           ->orWhere('email', 'ilike', "%{$search}%")
                    )
                    ->orWhere('role', 'ilike', "%{$search}%");
                });
            })
            ->when($role, fn ($q, $v) => $q->where('role', 'ilike', "%{$v}%"))
            ->when($status !== null && $status !== '', function ($query) use ($status) {
                if (in_array($status, AssignmentStatus::values())) {
                    $query->where('assignment_status', $status);
                } else {
                    $query->where('is_active', $status === 'active');
                }
            })
            ->when($startDate, fn ($q, $v) => $q->whereDate('start_date', '>=', $v))
            ->when($endDate,   fn ($q, $v) => $q->whereDate('end_date',   '<=', $v))
            ->orderBy($sortBy, $sortOrder)
            ->paginate(10)
            ->withQueryString();

        // ── Available assignables ─────────────────────────────────────────────
        // $occupiedEmployeeIds = ProjectTeam::fullyOccupiedEmployeeIds();

        $existingUserIds = ProjectTeam::where('project_id', $project->id)
            ->whereNotNull('user_id')
            ->pluck('user_id')
            ->filter()
            ->toArray();

        $users = User::with('roles')
            ->whereNotIn('id', $existingUserIds)
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get()
            ->map(fn ($user) => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
                'role'  => $user->roles->first()?->name ?? 'No Role',
                'type'  => 'user',
            ]);

        $existingEmployeeIds = ProjectTeam::where('project_id', $project->id)
            ->whereNotNull('employee_id')
            ->pluck('employee_id')
            ->filter()
            ->toArray();
        $employees = Employee::where('is_active', true)
            ->whereNotIn('id', $existingEmployeeIds)
            // ->whereNotIn('id', $occupiedEmployeeIds)
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get()
            ->map(fn ($employee) => [
                'id'       => $employee->id,
                'name'     => $employee->first_name . ' ' . $employee->last_name,
                'email'    => $employee->email,
                'position' => $employee->position ?? 'No Position',
                'type'     => 'employee',
            ]);

        $allAssignables = $users->concat($employees);

        // ── Roles for filter dropdown ─────────────────────────────────────────
        $roles = ProjectTeam::where('project_id', $project->id)
            ->distinct()
            ->whereNotNull('role')
            ->pluck('role')
            ->sort()
            ->values();

        return [
            'projectTeams'      => $projectTeams,
            'users'             => $users,
            'employees'         => $employees,
            'allAssignables'    => $allAssignables,
            'filterOptions'     => [
                'roles'              => $roles,
                'assignmentStatuses' => AssignmentStatus::values(),
            ],
            'filters' => [
                'role'       => $role,
                'status'     => $status,
                'start_date' => $startDate,
                'end_date'   => $endDate,
            ],
            'sort_by'    => $sortBy,
            'sort_order' => $sortOrder,
            'search'     => $search,
        ];
    }
}