<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\Project;
use App\Models\ProjectTeam;
use App\Models\User;

class ProjectTeamService
{
    public function getProjectTeamData(Project $project, $request = null)
    {
        $search = request('search');
        $role = request('role');
        $status = request('status');
        $startDate = request('start_date');
        $endDate = request('end_date');
        $sortBy = request('sort_by', 'created_at');
        $sortOrder = request('sort_order', 'desc');

        // Validate sort column
        $allowedSortColumns = ['created_at', 'role', 'hourly_rate', 'start_date', 'end_date', 'is_active'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'created_at';
        }

        // Validate sort order
        $sortOrder = in_array(strtolower($sortOrder), ['asc', 'desc']) ? strtolower($sortOrder) : 'desc';

        $projectTeams = ProjectTeam::with('user')
            ->where('project_id', $project->id)
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('name', 'ilike', "%{$search}%")
                            ->orWhere('email', 'ilike', "%{$search}%");
                    })->orWhere('role', 'ilike', "%{$search}%");
                });
            })
            ->when($role, function ($query, $role) {
                $query->where('role', 'ilike', "%{$role}%");
            })
            ->when($status !== null && $status !== '', function ($query) use ($status) {
                $query->where('is_active', $status === 'active' || $status === '1' || $status === true);
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

        // Get user IDs already in the project team
        $existingUserIds = ProjectTeam::where('project_id', $project->id)
            ->pluck('user_id')
            ->filter()
            ->toArray();
        
        $employees = User::with('roles')
            ->whereNotIn('id', $existingUserIds)
            ->orderBy('name')
            ->get()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                    'role' => $user->roles->first()?->name ?? 'No Role',
                ];
            });

        // Get unique roles and statuses for filters
        $roles = ProjectTeam::where('project_id', $project->id)
            ->distinct()
            ->whereNotNull('role')
            ->pluck('role')
            ->sort()
            ->values();

        return [
            'projectTeams' => $projectTeams,
            'employees'    => $employees,
            'filterOptions' => [
                'roles' => $roles,
            ],
            'filters' => [
                'role' => $role,
                'status' => $status,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'sort_by' => $sortBy,
            'sort_order' => $sortOrder,
            'search' => $search,
        ];
    }
}
