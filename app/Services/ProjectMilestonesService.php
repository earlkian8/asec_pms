<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectMilestone;
use App\Models\ProjectTask;
use App\Models\ProgressUpdate;

class ProjectMilestonesService
{
    public function getProjectMilestonesData(Project $project)
    {
        $search = request('search');

        // Load milestones with all related tasks and progress updates efficiently
        $milestones = ProjectMilestone::where('project_id', $project->id)
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'ilike', "%{$search}%")
                      ->orWhere('description', 'ilike', "%{$search}%")
                      ->orWhere('status', 'ilike', "%{$search}%");
                });
            })
            ->with([
                'tasks' => function ($query) {
                    $query->with([
                        'assignedUser',
                        'progressUpdates' => function ($q) {
                            $q->with('createdBy')->orderBy('created_at', 'desc');
                        }
                    ])->orderBy('due_date', 'asc');
                }
            ])
            ->orderBy('due_date', 'asc')
            ->get();

        // Fetch all active/current users in the project team for task assignment
        $users = $project->team()
            ->active()
            ->current()
            ->with('user')
            ->get()
            ->pluck('user')
            ->filter();

        return [
            'project' => $project->load('client'),
            'milestones' => $milestones,
            'users' => $users,
            'search' => $search,
        ];
    }
}