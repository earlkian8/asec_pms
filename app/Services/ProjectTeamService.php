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
            ->orderBy('created_at', 'desc')
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

        return [
            'projectTeams' => $projectTeams,
            'employees'    => $employees,
        ];
    }
}
