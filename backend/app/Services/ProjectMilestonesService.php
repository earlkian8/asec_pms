<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectMilestone;
use App\Models\ProjectTask;
use App\Models\ProgressUpdate;
use App\Models\ProjectIssue;
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

        // Whitelist allowed sort columns to prevent SQL injection
        $allowedSortColumns = ['due_date', 'start_date', 'created_at', 'name', 'status'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'due_date';
        }
        $sortOrder = in_array(strtolower($sortOrder), ['asc', 'desc']) ? strtolower($sortOrder) : 'asc';

        $milestones = ProjectMilestone::where('project_id', $project->id)
            // ── Search ──────────────────────────────────────────────────────────
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
            // ── Status filter ────────────────────────────────────────────────────
            ->when($statusFilter && $statusFilter !== 'all', function ($query) use ($statusFilter) {
                $query->where('status', $statusFilter);
            })
            // ── Date range filter ─────────────────────────────────────────
            ->when($startDate, fn ($q) => $q->whereDate('start_date', '>=', $startDate))
            ->when($endDate,   fn ($q) => $q->whereDate('due_date',   '<=', $endDate))
            // ── Eager loads ──────────────────────────────────────────────────────
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
                    ])->orderBy('due_date', 'asc');
                },
                'issues' => function ($q) {
                    $q->with(['reportedBy', 'assignedTo', 'task'])->orderBy('created_at', 'desc');
                },
            ])
            // ── Dynamic sort ────────────────────────────────────────────
            ->orderBy($sortBy, $sortOrder)
            ->paginate(10)
            ->withQueryString();

        // Ensure all relationships are properly loaded and accessible
        $milestones->getCollection()->each(function ($milestone) {
            $milestone->tasks->each(function ($task) {
                if (!$task->relationLoaded('progressUpdates')) {
                    $task->load(['progressUpdates' => function ($q) {
                        $q->with('createdBy')->orderBy('created_at', 'desc');
                    }]);
                }

                $task->progressUpdates->each(function ($update) {
                    // FIX: Use asset() instead of Storage::disk('public')->url()
                    // so the full absolute URL is returned consistently for both
                    // the admin web interface and the mobile API.
                    // Storage::disk()->url() relies on APP_URL being correct and
                    // can return a relative or localhost URL when misconfigured,
                    // whereas asset() always resolves against the live request host.
                    if ($update->file_path && Storage::disk('public')->exists($update->file_path)) {
                        $update->file_url = asset('storage/' . $update->file_path);
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
            });
        });

        // Active project-team users for task assignment
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

        // All issues for this project
        $issues = ProjectIssue::where('project_id', $project->id)
            ->with(['milestone', 'task', 'reportedBy', 'assignedTo'])
            ->orderBy('created_at', 'desc')
            ->get();

        return [
            'project'    => $project->load('client'),
            'milestones' => $milestones,
            'users'      => $users,
            'issues'     => $issues,
            // Pass back current params so the frontend can stay in sync
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