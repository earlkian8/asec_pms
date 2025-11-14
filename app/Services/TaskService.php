<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectMilestone;
use App\Models\ProjectTask;

class TaskService
{
    public function getTaskData(Project $project)
    {
        $search = request('search');

        // Load all milestones for this project
        $milestones = $project->milestones()->orderBy('due_date', 'asc')->get();

        $taskData = [];

        foreach ($milestones as $milestone) {
            $tasks = ProjectTask::with([
                'assignedUser',  // User who the task is assigned to
                'milestone'      // The milestone this task belongs to
            ])
                ->where('project_milestone_id', $milestone->id)
                ->when($search, function ($query, $search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('title', 'ilike', "%{$search}%")
                          ->orWhere('description', 'ilike', "%{$search}%")
                          ->orWhere('status', 'ilike', "%{$search}%");
                    });
                })
                ->orderBy('due_date', 'asc')
                ->paginate(10)
                ->withQueryString();

            $taskData[$milestone->id] = [
                'milestone' => $milestone,
                'data' => $tasks,
            ];
        }

        // Fetch all active/current users in the project team
        $users = $project->team()
            ->active()
            ->current()
            ->with('user')
            ->get()
            ->pluck('user')
            ->filter();

        return [
            'milestones' => $milestones,
            'tasks' => $taskData,
            'users' => $users,
            'search' => $search,
        ];
    }
}
