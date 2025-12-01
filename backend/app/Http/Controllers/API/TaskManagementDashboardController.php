<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ProjectTask;
use App\Models\ProgressUpdate;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Carbon\Carbon;

class TaskManagementDashboardController extends Controller
{
    /**
     * Get dashboard statistics for authenticated user
     */
    public function statistics(Request $request)
    {
        $user = $request->user();
        
        $tasks = ProjectTask::where('assigned_to', $user->id)
            ->with(['milestone.project'])
            ->get();

        $total = $tasks->count();
        $pending = $tasks->where('status', 'pending')->count();
        $inProgress = $tasks->where('status', 'in_progress')->count();
        $completed = $tasks->where('status', 'completed')->count();
        
        // Count overdue tasks (due date is in the past and not completed)
        $overdue = $tasks->filter(function ($task) {
            if (!$task->due_date || $task->status === 'completed') {
                return false;
            }
            return Carbon::parse($task->due_date)->isPast();
        })->count();

        // Count critical tasks (tasks from high priority projects that are not completed)
        // Note: Tasks don't have priority directly, so we'll use project priority
        // For now, we'll count tasks from projects with 'high' priority as critical
        $critical = $tasks->filter(function ($task) {
            if ($task->status === 'completed') {
                return false;
            }
            $projectPriority = $task->milestone->project->priority ?? null;
            // Map project priority to task priority concept
            // High priority projects = critical tasks
            return $projectPriority === 'high';
        })->count();

        return response()->json([
            'success' => true,
            'data' => [
                'total' => $total,
                'pending' => $pending,
                'inProgress' => $inProgress,
                'completed' => $completed,
                'overdue' => $overdue,
                'critical' => $critical,
            ],
        ]);
    }

    /**
     * Get upcoming tasks for authenticated user
     */
    public function upcomingTasks(Request $request)
    {
        $user = $request->user();
        $limit = $request->get('limit', 5);

        $tasks = ProjectTask::where('assigned_to', $user->id)
            ->where('status', '!=', 'completed')
            ->whereNotNull('due_date')
            ->with([
                'milestone.project',
                'assignedUser'
            ])
            ->orderBy('due_date', 'asc')
            ->limit($limit)
            ->get();

        $formattedTasks = $tasks->map(function ($task) {
            return [
                'id' => $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'assignedTo' => $task->assigned_to,
                'assignedToName' => $task->assignedUser->name ?? 'Unassigned',
                'dueDate' => $task->due_date ? Carbon::parse($task->due_date)->format('Y-m-d') : null,
                'status' => $task->status,
                'projectName' => $task->milestone->project->project_name ?? 'Unknown Project',
                'milestoneName' => $task->milestone->name ?? 'Unknown Milestone',
                'priority' => $this->getTaskPriority($task),
                'createdAt' => $task->created_at->toISOString(),
                'updatedAt' => $task->updated_at->toISOString(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $formattedTasks,
        ]);
    }

    /**
     * Get all tasks for authenticated user
     */
    public function tasks(Request $request)
    {
        $user = $request->user();
        $status = $request->get('status');
        $search = $request->get('search');

        $query = ProjectTask::where('assigned_to', $user->id)
            ->with([
                'milestone.project',
                'assignedUser'
            ]);

        // Filter by status
        if ($status && $status !== 'all') {
            if ($status === 'overdue') {
                $query->where('status', '!=', 'completed')
                    ->whereNotNull('due_date')
                    ->where('due_date', '<', Carbon::now()->format('Y-m-d'));
            } else if ($status === 'critical') {
                // Critical tasks are from high priority projects
                $query->whereHas('milestone.project', function ($q) {
                    $q->where('priority', 'high');
                })->where('status', '!=', 'completed');
            } else {
                $query->where('status', $status);
            }
        }

        // Search filter
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHas('milestone.project', function ($q) use ($search) {
                        $q->where('project_name', 'like', "%{$search}%");
                    })
                    ->orWhereHas('milestone', function ($q) use ($search) {
                        $q->where('name', 'like', "%{$search}%");
                    });
            });
        }

        $tasks = $query->orderBy('due_date', 'asc')
            ->orderBy('created_at', 'desc')
            ->get();

        $formattedTasks = $tasks->map(function ($task) {
            return [
                'id' => $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'assignedTo' => $task->assigned_to,
                'assignedToName' => $task->assignedUser->name ?? 'Unassigned',
                'dueDate' => $task->due_date ? Carbon::parse($task->due_date)->format('Y-m-d') : null,
                'status' => $task->status,
                'projectName' => $task->milestone->project->project_name ?? 'Unknown Project',
                'milestoneName' => $task->milestone->name ?? 'Unknown Milestone',
                'priority' => $this->getTaskPriority($task),
                'createdAt' => $task->created_at->toISOString(),
                'updatedAt' => $task->updated_at->toISOString(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $formattedTasks,
        ]);
    }

    /**
     * Get history data (completed tasks and progress updates) for authenticated user
     */
    public function history(Request $request)
    {
        $user = $request->user();
        $search = $request->get('search');

        // Get completed tasks
        $completedTasksQuery = ProjectTask::where('assigned_to', $user->id)
            ->where('status', 'completed')
            ->with([
                'milestone.project',
                'assignedUser'
            ]);

        // Apply search filter to completed tasks
        if ($search) {
            $completedTasksQuery->where(function ($q) use ($search) {
                $q->where('title', 'like', "%{$search}%")
                    ->orWhere('description', 'like', "%{$search}%")
                    ->orWhereHas('milestone.project', function ($q) use ($search) {
                        $q->where('project_name', 'like', "%{$search}%");
                    });
            });
        }

        $completedTasks = $completedTasksQuery
            ->orderBy('updated_at', 'desc')
            ->get();

        $formattedCompletedTasks = $completedTasks->map(function ($task) {
            return [
                'id' => $task->id,
                'title' => $task->title,
                'description' => $task->description,
                'assignedTo' => $task->assigned_to,
                'assignedToName' => $task->assignedUser->name ?? 'Unassigned',
                'dueDate' => $task->due_date ? Carbon::parse($task->due_date)->format('Y-m-d') : null,
                'status' => $task->status,
                'projectName' => $task->milestone->project->project_name ?? 'Unknown Project',
                'projectId' => $task->milestone->project->id ?? null,
                'milestoneName' => $task->milestone->name ?? 'Unknown Milestone',
                'milestoneId' => $task->milestone->id ?? null,
                'priority' => $this->getTaskPriority($task),
                'createdAt' => $task->created_at->toISOString(),
                'updatedAt' => $task->updated_at->toISOString(),
            ];
        });

        // Get all progress updates for tasks assigned to the user
        $progressUpdatesQuery = ProgressUpdate::whereHas('task', function ($q) use ($user) {
            $q->where('assigned_to', $user->id);
        })
            ->with([
                'task.milestone.project',
                'task.assignedUser',
                'createdBy'
            ]);

        // Apply search filter to progress updates
        if ($search) {
            $progressUpdatesQuery->where(function ($q) use ($search) {
                $q->where('description', 'like', "%{$search}%")
                    ->orWhereHas('task', function ($q) use ($search) {
                        $q->where('title', 'like', "%{$search}%")
                            ->orWhere('description', 'like', "%{$search}%");
                    });
            });
        }

        $progressUpdates = $progressUpdatesQuery
            ->orderBy('created_at', 'desc')
            ->get();

        $formattedProgressUpdates = $progressUpdates->map(function ($update) {
            $fileUrl = null;
            if ($update->file_path && Storage::disk('public')->exists($update->file_path)) {
                $fileUrl = url(Storage::disk('public')->url($update->file_path));
            }

            $task = $update->task;
            $formattedTask = null;
            if ($task) {
                $formattedTask = [
                    'id' => $task->id,
                    'title' => $task->title,
                    'description' => $task->description,
                    'assignedTo' => $task->assigned_to,
                    'assignedToName' => $task->assignedUser->name ?? 'Unassigned',
                    'dueDate' => $task->due_date ? Carbon::parse($task->due_date)->format('Y-m-d') : null,
                    'status' => $task->status,
                    'projectName' => $task->milestone->project->project_name ?? 'Unknown Project',
                    'projectId' => $task->milestone->project->id ?? null,
                    'milestoneName' => $task->milestone->name ?? 'Unknown Milestone',
                    'milestoneId' => $task->milestone->id ?? null,
                    'priority' => $this->getTaskPriority($task),
                    'createdAt' => $task->created_at->toISOString(),
                    'updatedAt' => $task->updated_at->toISOString(),
                ];
            }

            return [
                'id' => $update->id,
                'project_task_id' => $update->project_task_id,
                'description' => $update->description,
                'file_path' => $update->file_path,
                'file_url' => $fileUrl,
                'original_name' => $update->original_name,
                'file_type' => $update->file_type,
                'file_size' => $update->file_size,
                'created_by' => $update->created_by,
                'created_by_name' => $update->createdBy->name ?? 'Unknown User',
                'created_at' => $update->created_at->toISOString(),
                'updated_at' => $update->updated_at->toISOString(),
                'task' => $formattedTask,
            ];
        });

        return response()->json([
            'success' => true,
            'data' => [
                'completedTasks' => $formattedCompletedTasks,
                'progressUpdates' => $formattedProgressUpdates,
            ],
        ]);
    }

    /**
     * Get task priority based on project priority
     * Since tasks don't have priority directly, we derive it from project
     */
    private function getTaskPriority($task)
    {
        $projectPriority = $task->milestone->project->priority ?? null;
        
        // Map project priority to task priority
        // Projects have: low, medium, high
        // Tasks expect: low, medium, high, critical
        switch ($projectPriority) {
            case 'high':
                return 'critical'; // High priority projects = critical tasks
            case 'medium':
                return 'medium';
            case 'low':
                return 'low';
            default:
                return null;
        }
    }
}

