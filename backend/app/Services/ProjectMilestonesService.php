<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectMilestone;
use App\Models\ProjectTask;
use App\Models\ProgressUpdate;
use App\Models\ProjectIssue;
use App\Models\ClientUpdateRequest;
use App\Models\ProjectMaterialAllocation;
use Illuminate\Support\Facades\Auth;
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
                        'clientUpdateRequests' => function ($q) {
                            // Load views so we can compute unread count per user
                            $q->with(['client', 'views'])->orderBy('created_at', 'desc');
                        },
                    ])->orderBy('due_date', 'asc');
                },
                'issues' => function ($q) {
                    $q->with(['reportedBy', 'assignedTo', 'task'])->orderBy('created_at', 'desc');
                },
                'materialUsages' => function ($q) {
                    $q->with([
                        'allocation.inventoryItem',
                        'allocation.directSupply',
                        'recordedBy',
                    ])->orderBy('created_at', 'desc');
                },
            ])
            ->orderBy($sortBy, $sortOrder)
            ->paginate(10)
            ->withQueryString();

        $userId = Auth::id();

        $milestones->getCollection()->each(function ($milestone) use ($userId) {
            $milestone->tasks->each(function ($task) use ($userId) {

                // ── Progress updates ──────────────────────────────────────────
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
                    $update->created_by_name   = $update->createdBy ? $update->createdBy->name : null;
                    $update->created_by_avatar = $update->createdBy ? $update->createdBy->profile_image_url : null;
                });

                // ── Issues ────────────────────────────────────────────────────
                if (!$task->relationLoaded('issues')) {
                    $task->load(['issues' => function ($q) {
                        $q->with(['reportedBy', 'assignedTo'])->orderBy('created_at', 'desc');
                    }]);
                }

                // ── Assigned user ─────────────────────────────────────────────
                if (!$task->relationLoaded('assignedUser')) {
                    $task->load('assignedUser');
                }

                // ── Client update requests + unread count ─────────────────────
                if (!$task->relationLoaded('clientUpdateRequests')) {
                    $task->load(['clientUpdateRequests' => function ($q) {
                        $q->with(['client', 'views'])->orderBy('created_at', 'desc');
                    }]);
                }

                // Compute how many requests THIS user has NOT yet viewed
                $unreadCount = $task->clientUpdateRequests->filter(function ($req) use ($userId) {
                    // A request is "unread" if no view record exists for this user
                    return $req->views->where('user_id', $userId)->isEmpty();
                })->count();

                // Attach as a plain attribute so the frontend can read it
                $task->setAttribute('unread_client_requests_count', $unreadCount);

                // Also flag each request individually so the modal can render dots
                $task->clientUpdateRequests->each(function ($req) use ($userId) {
                    $req->setAttribute(
                        'is_unread',
                        $req->views->where('user_id', $userId)->isEmpty()
                    );
                });
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

        $projectAllocations = ProjectMaterialAllocation::where('project_id', $project->id)
            ->with(['inventoryItem', 'directSupply', 'milestoneUsages'])
            ->get()
            ->map(fn ($a) => [
                'id'            => $a->id,
                'name'          => $a->inventoryItem?->item_name ?? $a->directSupply?->supply_name ?? 'Unknown',
                'code'          => $a->inventoryItem?->item_code ?? $a->directSupply?->supply_code ?? '---',
                'unit'          => $a->inventoryItem?->unit_of_measure ?? $a->directSupply?->unit_of_measure ?? 'units',
                'is_direct'     => (bool) $a->direct_supply_id,
                'qty_allocated' => (float) $a->quantity_allocated,
                'qty_received'  => (float) $a->quantity_received,
                'qty_used'      => (float) $a->milestoneUsages->sum('quantity_used'),
            ]);

        return [
            'project'    => $project->load('client'),
            'milestones' => $milestones,
            'users'      => $users,
            'issues'     => $issues,
            'projectAllocations' => $projectAllocations,
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