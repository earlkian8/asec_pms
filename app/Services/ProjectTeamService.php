<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\Project;
use App\Models\ProjectTeam;
use App\Models\User;

class ProjectTeamService
{
    public function getProjectTeamData(Project $project)
    {
        $search = request('search');

        $projectTeams = ProjectTeam::with('user')
            ->where('project_id', $project->id)
            ->when($search, function ($query, $search) {
                $query->whereHas('employee', function ($q) use ($search) {
                    $q->whereRaw("CONCAT(first_name, ' ', last_name) ILIKE ?", ["%{$search}%"])
                        ->orWhere('email', 'ilike', "%{$search}%");
                })->orWhere('role', 'ilike', "%{$search}%");
            })
            ->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        $employees = User::select('id', 'name', 'email')
            ->whereNotIn('id', function ($query) use ($project) {
                $query->select('user_id')
                    ->from('project_teams')
                    ->where('project_id', $project->id);
            })
            ->orderBy('name')
            ->get();

        return [
            'projectTeams' => $projectTeams,
            'employees'    => $employees,
        ];
    }
}
