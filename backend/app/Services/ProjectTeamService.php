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
        $allowedSortColumns = ['created_at', 'role', 'hourly_rate', 'start_date', 'end_date', 'is_active', 'assignment_status'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'created_at';
        }

        $sortOrder = in_array(strtolower($sortOrder), ['asc', 'desc']) ? strtolower($sortOrder) : 'desc';

        $projectTeams = ProjectTeam::with(['user', 'employee'])
            ->where('project_id', $project->id)
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('name', 'ilike', "%{$search}%")
                            ->orWhere('email', 'ilike', "%{$search}%");
                    })
                    ->orWhereHas('employee', function ($employeeQuery) use ($search) {
                        $employeeQuery->where('first_name', 'ilike', "%{$search}%")
                            ->orWhere('last_name', 'ilike', "%{$search}%")
                            ->orWhere('email', 'ilike', "%{$search}%");
                    })
                    ->orWhere('role', 'ilike', "%{$search}%");
                });
            })
            ->when($role, function ($query, $role) {
                $query->where('role', 'ilike', "%{$role}%");
            })
            ->when($status !== null && $status !== '', function ($query) use ($status) {
                // Support filtering by assignment_status or the legacy is_active flag
                if (in_array($status, AssignmentStatus::values())) {
                    $query->where('assignment_status', $status);
                } else {
                    // Legacy: 'active'/'inactive' mapped to is_active boolean
                    $query->where('is_active', $status === 'active' || $status === '1' || $status === true);
                }
            })
            ->when($startDate, function ($query, $startDate) {
                $query->whereDate('start_date', '>=', $startDate);
            })
            ->when($endDate, function ($query, $endDate) {
                $query->whereDate('end_date', '<=', $endDate);
            })
            ->orderBy($sortBy, $sortOrder)
            ->paginate(10)
            ->withQueryString();

        // ── Available assignables ──────────────────────────────────────────────
        // Rotation constraint applies to EMPLOYEES only (one active project at a time).
        // Users are contractors/engineers — they can be on multiple projects.

        // Employees: globally occupied = assignment_status = 'active' in ANY project
        $occupiedEmployeeIds = ProjectTeam::occupied()
            ->whereNotNull('employee_id')
            ->pluck('employee_id')
            ->unique()
            ->filter()
            ->toArray();

        // Users: only exclude those already in THIS specific project
        $existingUserIds = ProjectTeam::where('project_id', $project->id)
            ->whereNotNull('user_id')
            ->pluck('user_id')
            ->filter()
            ->toArray();

        // Available users (only filtered per-project, NOT globally)
        $users = User::with('roles')
        ->whereNotIn('id', $existingUserIds)
        ->orderBy('first_name')->orderBy('last_name')
        ->get()
            ->map(function ($user) {
                return [
                    'id'    => $user->id,
                    'name'  => $user->name,
                    'email' => $user->email,
                    'role'  => $user->roles->first()?->name ?? 'No Role',
                    'type'  => 'user',
                ];
            });

        // Available employees (globally filtered — rotation rule)
        $employees = Employee::where('is_active', true)
            ->whereNotIn('id', $occupiedEmployeeIds)
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get()
            ->map(function ($employee) {
                return [
                    'id'       => $employee->id,
                    'name'     => $employee->first_name . ' ' . $employee->last_name,
                    'email'    => $employee->email,
                    'position' => $employee->position ?? 'No Position',
                    'type'     => 'employee',
                ];
            });

        $allAssignables = $users->concat($employees);

        // Unique roles for filter dropdown
        $roles = ProjectTeam::where('project_id', $project->id)
            ->distinct()
            ->whereNotNull('role')
            ->pluck('role')
            ->sort()
            ->values();

        return [
            'projectTeams'   => $projectTeams,
            'users'          => $users,
            'employees'      => $employees,
            'allAssignables' => $allAssignables,
            'filterOptions'  => [
                'roles'            => $roles,
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
