<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\ProgressUpdate;

class ProgressUpdateService
{
    public function getProgressUpdateData(Project $project)
    {
        $search = request('search');

        // Get all tasks for this project through milestones
        $tasks = ProjectTask::with([
            'milestone',
            'assignedUser'
        ])
            ->whereHas('milestone', function ($query) use ($project) {
                $query->where('project_id', $project->id);
            })
            ->get();

        $progressUpdateData = [];

        foreach ($tasks as $task) {
            $progressUpdates = ProgressUpdate::with([
                'createdBy',
                'task.milestone'
            ])
                ->where('project_task_id', $task->id)
                ->when($search, function ($query, $search) {
                    $query->where(function ($q) use ($search) {
                        $q->where('description', 'ilike', "%{$search}%");
                    });
                })
                ->orderBy('created_at', 'desc')
                ->paginate(10)
                ->withQueryString();

            $progressUpdateData[$task->id] = [
                'task' => $task,
                'data' => $progressUpdates,
            ];
        }

        return [
            'tasks' => $tasks,
            'progressUpdates' => $progressUpdateData,
            'search' => $search,
        ];
    }
}
