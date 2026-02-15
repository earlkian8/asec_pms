<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectIssue;
use App\Models\ProjectMilestone;
use Illuminate\Support\Facades\Storage;

class ProjectMilestonesService
{
    public function getProjectMilestonesData(Project $project)
    {
        $search = request('search');
        $statusFilter = request('status_filter', 'all');

        // Load milestones with all related tasks, progress updates, and issues efficiently
        $milestones = ProjectMilestone::where('project_id', $project->id)
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                        ->orWhere('description', 'like', "%{$search}%")
                        ->orWhere('status', 'like', "%{$search}%");
                });
            })
            ->when($statusFilter !== 'all', function ($query) use ($statusFilter) {
                $query->where('status', $statusFilter);
            })
            ->with([
                'tasks' => function ($query) {
                    $query->with([
                        'assignedUser', // Load without field restrictions to ensure it works
                        'milestone',
                        'progressUpdates' => function ($q) {
                            $q->with('createdBy')->orderBy('created_at', 'desc');
                        },
                        'issues' => function ($q) {
                            $q->with(['reportedBy', 'assignedTo'])->orderBy('created_at', 'desc');
                        },
                    ])->orderBy('due_date', 'asc');
                },
                'issues' => function ($q) {
                    $q->with(['reportedBy', 'assignedTo', 'task'])->orderBy('created_at', 'desc');
                },
            ])
            ->orderBy('due_date', 'asc')
            ->paginate(10)
            ->withQueryString();

        // Ensure all relationships are properly loaded and accessible
        $milestones->getCollection()->each(function ($milestone) {
            $milestone->tasks->each(function ($task) {
                // Ensure progressUpdates is loaded
                if (! $task->relationLoaded('progressUpdates')) {
                    $task->load(['progressUpdates' => function ($q) {
                        $q->with('createdBy')->orderBy('created_at', 'desc');
                    }]);
                }

                // Add file_url and ensure createdBy is accessible for each progress update
                $task->progressUpdates->each(function ($update) {
                    if ($update->file_path && Storage::disk('public')->exists($update->file_path)) {
                        $update->file_url = Storage::disk('public')->url($update->file_path);
                    }
                    // Ensure createdBy relationship is accessible
                    if (! $update->relationLoaded('createdBy') && $update->created_by) {
                        $update->load('createdBy');
                    }
                    // Add created_by_name attribute for JSON serialization
                    // This ensures the name is available even if the relationship isn't serialized
                    $update->created_by_name = $update->createdBy ? $update->createdBy->name : null;
                });

                // Ensure issues is loaded
                if (! $task->relationLoaded('issues')) {
                    $task->load(['issues' => function ($q) {
                        $q->with(['reportedBy', 'assignedTo'])->orderBy('created_at', 'desc');
                    }]);
                }

                // Ensure reportedBy and assignedTo relationships are accessible for each issue
                $task->issues->each(function ($issue) {
                    // Ensure reportedBy relationship is accessible
                    if (! $issue->relationLoaded('reportedBy') && $issue->reported_by) {
                        $issue->load('reportedBy');
                    }
                    // Ensure assignedTo relationship is accessible
                    if (! $issue->relationLoaded('assignedTo') && $issue->assigned_to) {
                        $issue->load('assignedTo');
                    }
                });
                // Ensure assignedUser is loaded
                if (! $task->relationLoaded('assignedUser')) {
                    $task->load('assignedUser');
                }
            });
        });

        // Fetch all active/current users in the project team for task assignment
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

        // Fetch all issues for this project
        $issues = ProjectIssue::where('project_id', $project->id)
            ->with(['milestone', 'task', 'reportedBy', 'assignedTo'])
            ->orderBy('created_at', 'desc')
            ->get();

        return [
            'project' => $project->load('client'),
            'milestones' => $milestones,
            'users' => $users,
            'issues' => $issues,
            'search' => $search,
            'statusFilter' => $statusFilter,
        ];
    }
}
