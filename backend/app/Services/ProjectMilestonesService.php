<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectMilestone;
use App\Models\ProjectTask;
use App\Models\ProgressUpdate;
use App\Models\ProjectIssue;
use App\Models\ClientUpdateRequest;
use Illuminate\Support\Facades\Storage;

class ProjectMilestonesService
{
    public function getProjectMilestonesData(Project $project)
    {
        $search       = request('search');
        $statusFilter = request('status_filter', 'all');
        $startDate    = request('start_date');
        $endDate      = request('end_date');
        $sortBy       = request('sort_by', 'due_date');
        $sortOrder    = request('sort_order', 'asc');

        $allowedSortColumns = ['due_date', 'start_date', 'created_at', 'name', 'status'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'due_date';
        }
        $sortOrder = in_array(strtolower($sortOrder), ['asc', 'desc']) ? strtolower($sortOrder) : 'asc';

        $milestones = ProjectMilestone::where('project_id', $project->id)
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%")
                      ->orWhere('status', 'like', "%{$search}%")
                      ->orWhereHas('tasks', function ($tq) use ($search) {
                          $tq->where('title', 'like', "%{$search}%")
                             ->orWhere('description', 'like', "%{$search}%");
                      });
                });
            })
            ->when($statusFilter && $statusFilter !== 'all', function ($query) use ($statusFilter) {
                $query->where('status', $statusFilter);
            })
            ->when($startDate, fn ($q) => $q->whereDate('start_date', '>=', $startDate))
            ->when($endDate,   fn ($q) => $q->whereDate('due_date',   '<=', $endDate))
            ->with([
                'tasks' => function ($query) {
                    $query->with([
                        'assignedUser',
                        'milestone',
                        'progressUpdates' => function ($q) {
                            $q->with('createdBy')->orderBy('created_at', 'desc');
                        },
                        'issues' => function ($q) {
                            $q->with(['reportedBy', 'assignedTo'])->orderBy('created_at', 'desc');
                        },
                        // ── NEW: load client update requests per task ──
                        'clientUpdateRequests' => function ($q) {
                            $q->with('client')->orderBy('created_at', 'desc');
                        },
                    ])->orderBy('due_date', 'asc');
                },
                'issues' => function ($q) {
                    $q->with(['reportedBy', 'assignedTo', 'task'])->orderBy('created_at', 'desc');
                },
            ])
            ->orderBy($sortBy, $sortOrder)
            ->paginate(10)
            ->withQueryString();

        $milestones->getCollection()->each(function ($milestone) {
            $milestone->tasks->each(function ($task) {
                if (!$task->relationLoaded('progressUpdates')) {
                    $task->load(['progressUpdates' => function ($q) {
                        $q->with('createdBy')->orderBy('created_at', 'desc');
                    }]);
                }

                $task->progressUpdates->each(function ($update) {
                    if ($update->file_path && Storage::disk('public')->exists($update->file_path)) {
                        $update->file_url = Storage::disk('public')->url($update->file_path);
                    }
                    if (!$update->relationLoaded('createdBy') && $update->created_by) {
                        $update->load('createdBy');
                    }
                    $update->created_by_name = $update->createdBy ? $update->createdBy->name : null;
                });

                if (!$task->relationLoaded('issues')) {
                    $task->load(['issues' => function ($q) {
                        $q->with(['reportedBy', 'assignedTo'])->orderBy('created_at', 'desc');
                    }]);
                }

                $task->issues->each(function ($issue) {
                    if (!$issue->relationLoaded('reportedBy') && $issue->reported_by) {
                        $issue->load('reportedBy');
                    }
                    if (!$issue->relationLoaded('assignedTo') && $issue->assigned_to) {
                        $issue->load('assignedTo');
                    }
                });

                if (!$task->relationLoaded('assignedUser')) {
                    $task->load('assignedUser');
                }

                // ── NEW: ensure clientUpdateRequests are loaded ──
                if (!$task->relationLoaded('clientUpdateRequests')) {
                    $task->load(['clientUpdateRequests' => function ($q) {
                        $q->with('client')->orderBy('created_at', 'desc');
                    }]);
                }
            });
        });

        $users = $project->team()
            ->active()
            ->current()
            ->with('user')
            ->get()
            ->pluck('user')
            ->filter()
            ->map(fn ($user) => [
                'id'    => $user->id,
                'name'  => $user->name,
                'email' => $user->email,
            ])
            ->values();

        $issues = ProjectIssue::where('project_id', $project->id)
            ->with(['milestone', 'task', 'reportedBy', 'assignedTo'])
            ->orderBy('created_at', 'desc')
            ->get();

        return [
            'project'    => $project->load('client'),
            'milestones' => $milestones,
            'users'      => $users,
            'issues'     => $issues,
            'search'      => $search,
            'sort_by'     => $sortBy,
            'sort_order'  => $sortOrder,
            'filters'     => [
                'status'     => $statusFilter,
                'start_date' => $startDate,
                'end_date'   => $endDate,
            ],
            'filterOptions' => [
                'statuses' => ['pending', 'in_progress', 'completed'],
            ],
        ];
    }
}