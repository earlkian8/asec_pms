<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\Project;
use App\Models\ProjectTeam;

class ProjectTeamService
{
    public function getProjectTeamData(Project $project)
    {
        $search = request('search');

        $projectTeams = ProjectTeam::with('employee')
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

        $employees = Employee::select('id', 'first_name', 'last_name', 'email', 'position')
            ->where('is_active', true)
            ->whereNotIn('id', function ($query) use ($project) {
                $query->select('employee_id')
                    ->from('project_teams')
                    ->where('project_id', $project->id);
            })
            ->orderBy('first_name')
            ->get();

        return [
            'projectTeams' => $projectTeams,
            'employees'    => $employees,
        ];
    }
}
