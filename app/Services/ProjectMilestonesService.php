<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectMilestone;

class ProjectMilestonesService
{
    public function getProjectMilestonesData(Project $project)
    {
        $search = request('search');

        $milestones = ProjectMilestone::where('project_id', $project->id)
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'ilike', "%{$search}%")
                      ->orWhere('description', 'ilike', "%{$search}%")
                      ->orWhere('status', 'ilike', "%{$search}%");
                });
            })
            ->orderBy('due_date', 'asc')
            ->paginate(10)
            ->withQueryString();

        return [
            'project' => $project->load('client'),
            'milestones' => $milestones,
            'search' => $search,
        ];
    }
}