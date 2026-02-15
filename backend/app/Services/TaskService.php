<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectTask;

class TaskService
{
    /**
     * @param  array{search?: string}  $filters
     * @return array{milestones: \Illuminate\Support\Collection, tasks: array, users: \Illuminate\Support\Collection, search: string|null}
     */
    public function getTaskData(Project $project, array $filters = []): array
    {
        $search = $filters['search'] ?? null;

        $milestones = $project->milestones()->orderBy('due_date', 'asc')->get();

        $taskData = [];

        foreach ($milestones as $milestone) {
            $tasks = ProjectTask::with([
                'assignedUser',
                'milestone',
            ])
                ->where('project_milestone_id', $milestone->id)
                ->when($search, function ($query, $search) {
                    $query->where(function ($q) use ($search) {
                        query_where_search_in($q, ['title', 'description', 'status'], $search);
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
        // Users can only be assigned tasks in projects where they are team members
        // But they can be team members in multiple projects, allowing them to have tasks across projects
        $users = $project->team()
            ->active()
            ->current()
            ->with('user')
            ->get()
            ->pluck('user')
            ->filter()
            ->map(function ($user) {
                return [
                    'id' => $user->id,
                    'name' => $user->name,
                    'email' => $user->email,
                ];
            })
            ->values();

        return [
            'milestones' => $milestones,
            'tasks' => $taskData,
            'users' => $users,
            'search' => $search,
        ];
    }
}
