<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClientUpdateRequest;
use App\Models\ProjectMilestone;
use App\Models\ProjectTask;
use App\Models\ProgressUpdate;
use App\Models\ProjectIssue;
use App\Models\User;
use App\Services\TaskManagementAuthorization;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\DB;
use Carbon\Carbon;

class TaskManagementTaskController extends Controller
{
    use NotificationTrait;

    private function hasInvalidUploadedFile(Request $request): bool
    {
        return $request->has('file') && !$request->hasFile('file');
    }

    private function uploadLimitErrorResponse()
    {
        $uploadMax = ini_get('upload_max_filesize') ?: 'unknown';
        $postMax = ini_get('post_max_size') ?: 'unknown';

        return response()->json([
            'success' => false,
            'message' => "File upload failed before validation. Server limits are upload_max_filesize={$uploadMax} and post_max_size={$postMax}.",
            'errors' => [
                'file' => [
                    'The file failed to upload. The file may exceed server upload limits or be an invalid upload payload.',
                ],
            ],
        ], 422);
    }

    /**
     * Sync milestone status based on its current tasks.
     * Mirrors admin behavior from ProjectTasksController::syncMilestoneStatus().
     */
    private function syncMilestoneStatus(ProjectMilestone $milestone): void
    {
        $tasks = $milestone->tasks()->get();

        if ($tasks->isEmpty()) {
            if ($milestone->status === 'completed') {
                $milestone->update(['status' => 'in_progress']);
            }
            return;
        }

        $allCompleted = $tasks->every(fn ($t) => $t->status === 'completed');
        $anyActive = $tasks->contains(fn ($t) => in_array($t->status, ['in_progress', 'completed']));

        if ($allCompleted) {
            if ($milestone->status !== 'completed') {
                $milestone->update(['status' => 'completed']);
            }
        } elseif ($anyActive) {
            if ($milestone->status !== 'in_progress') {
                $milestone->update(['status' => 'in_progress']);
            }
        }
        // If all tasks are pending, leave milestone as-is (admin rule).
    }

    /**
     * Auto-start work when progress is reported.
     * Mirrors admin behavior from ProgressUpdatesController::autoProgressMilestone().
     */
    private function autoProgressMilestone(ProjectTask $task, ProjectMilestone $milestone): void
    {
        if ($task->status === 'pending') {
            $task->update(['status' => 'in_progress']);
        }

        if ($milestone->status === 'pending') {
            $milestone->update(['status' => 'in_progress']);
        }
    }

    /**
     * Helper to generate a file URL from a file path.
     * Uses the configured default filesystem disk (DO Spaces in production).
     */
    private function getFileUrl(?string $filePath): ?string
    {
        if ($filePath && Storage::disk(config('filesystems.default'))->exists($filePath)) {
            return Storage::disk(config('filesystems.default'))->url($filePath);
        }
        return null;
    }

    /**
     * Get task detail with related data
     */
    public function show(Request $request, $id)
    {
        $user = $request->user();

        $task = ProjectTask::where('id', $id)
            ->with([
                'milestone.project',
                'assignedUser'
            ])
            ->first();

        if (!$task) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or you do not have access to it',
            ], 404);
        }

        $authz = app(TaskManagementAuthorization::class);
        if (!$authz->canAccessTask($user, $task)) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or you do not have access to it',
            ], 404);
        }

        $formattedTask = [
            'id' => $task->id,
            'title' => $task->title,
            'description' => $task->description,
            'assignedTo' => $task->assigned_to,
            'assignedToName' => $task->assignedUser?->name ?? 'Unassigned',
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

        return response()->json([
            'success' => true,
            'data' => $formattedTask,
        ]);
    }

    /**
     * Update task status
     */
    public function updateStatus(Request $request, $id)
    {
        $user = $request->user();

        $task = ProjectTask::where('id', $id)->with(['milestone.project', 'assignedUser'])->first();

        if (!$task) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or you do not have access to it',
            ], 404);
        }

        $authz = app(TaskManagementAuthorization::class);
        if (!$authz->canAccessTask($user, $task)) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or you do not have access to it',
            ], 404);
        }

        $request->validate([
            'status' => 'required|in:pending,in_progress,completed',
        ]);

        // Cannot mark as completed without at least 1 progress update (admin parity)
        if ($request->status === 'completed') {
            if ($task->progressUpdates()->count() === 0) {
                return response()->json([
                    'success' => false,
                    'message' => 'Cannot mark task as completed. Please add at least one progress update first.',
                    'errors' => [
                        'status' => ['Cannot mark task as completed. Please add at least one progress update first.'],
                    ],
                ], 422);
            }
        }

        $oldStatus = $task->status;
        $task->status = $request->status;
        $task->save();

        // ── Auto-status: task status changed → sync milestone ──
        if ($task->milestone) {
            $this->syncMilestoneStatus($task->milestone);
        }

        // Reload task with relationships
        $task->load(['milestone.project', 'assignedUser']);

        // System-wide notification for task status change
        if ($task->milestone && $task->milestone->project) {
            $project = $task->milestone->project;
            $this->createSystemNotification(
                'task',
                'Task Status Updated',
                "Task '{$task->title}' status has been changed from " . ucfirst(str_replace('_', ' ', $oldStatus)) . " to " . ucfirst(str_replace('_', ' ', $request->status)) . " in project '{$project->project_name}'.",
                $project,
                null // API doesn't have web routes
            );
        }

        $formattedTask = [
            'id' => $task->id,
            'title' => $task->title,
            'description' => $task->description,
            'assignedTo' => $task->assigned_to,
            'assignedToName' => $task->assignedUser?->name ?? 'Unassigned',
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

        return response()->json([
            'success' => true,
            'message' => 'Task status updated successfully',
            'data' => $formattedTask,
        ]);
    }

    /**
     * Get progress updates for a task
     */
    public function progressUpdates(Request $request, $id)
    {
        $user = $request->user();

        $task = ProjectTask::where('id', $id)->with(['milestone.project'])->first();

        if (!$task) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or you do not have access to it',
            ], 404);
        }

        $authz = app(TaskManagementAuthorization::class);
        if (!$authz->canAccessTask($user, $task)) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or you do not have access to it',
            ], 404);
        }

        $updates = ProgressUpdate::where('project_task_id', $id)
            ->with('createdBy')
            ->orderBy('created_at', 'desc')
            ->get();

        $formattedUpdates = $updates->map(function ($update) {
            return [
                'id' => $update->id,
                'project_task_id' => $update->project_task_id,
                'description' => $update->description,
                'file_path' => $update->file_path,
                'file_url' => $this->getFileUrl($update->file_path),
                'original_name' => $update->original_name,
                'file_type' => $update->file_type,
                'file_size' => $update->file_size,
                'created_by' => $update->created_by,
                'created_by_name' => $update->createdBy?->name ?? 'Unknown User',
                'created_at' => $update->created_at->toISOString(),
                'updated_at' => $update->updated_at->toISOString(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $formattedUpdates,
        ]);
    }

    /**
     * Create progress update
     */
    public function storeProgressUpdate(Request $request, $id)
    {
        $user = $request->user();

        $task = ProjectTask::where('id', $id)->with(['milestone.project'])->first();

        if (!$task) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or you do not have access to it',
            ], 404);
        }

        $authz = app(TaskManagementAuthorization::class);
        if (!$authz->canAccessTask($user, $task)) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or you do not have access to it',
            ], 404);
        }

        if ($this->hasInvalidUploadedFile($request)) {
            return $this->uploadLimitErrorResponse();
        }

        $request->validate([
            'description' => 'required|string',
            'file' => 'nullable|file|max:102400', // 100MB max
        ]);

        $filePath = null;
        $originalName = null;
        $fileType = null;
        $fileSize = null;

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $directory = "progress_updates/{$task->id}";

            $filename = time() . '_' . $file->getClientOriginalName();
            $file->storeAs($directory, $filename, config('filesystems.default'));

            $filePath = $directory . '/' . $filename;
            $originalName = $file->getClientOriginalName();
            $fileType = $file->getMimeType();
            $fileSize = $file->getSize();
        }

        $progressUpdate = ProgressUpdate::create([
            'project_task_id' => $task->id,
            'description' => $request->description,
            'file_path' => $filePath,
            'original_name' => $originalName,
            'file_type' => $fileType,
            'file_size' => $fileSize,
            'created_by' => $user->id,
        ]);

        $progressUpdate->load('createdBy');
        $task->load(['milestone.project']);

        // ── Auto-status: progress update added → task/milestone move to in_progress ──
        if ($task->milestone) {
            $this->autoProgressMilestone($task, $task->milestone);
        }

        // System-wide notification for progress update
        if ($task->milestone && $task->milestone->project) {
            $project = $task->milestone->project;
            $this->createSystemNotification(
                'update',
                'New Progress Update',
                "A new progress update has been added for task '{$task->title}' in milestone '{$task->milestone->name}' for project '{$project->project_name}'.",
                $project,
                null // API doesn't have web routes
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Progress update created successfully',
            'data' => [
                'id' => $progressUpdate->id,
                'project_task_id' => $progressUpdate->project_task_id,
                'description' => $progressUpdate->description,
                'file_path' => $progressUpdate->file_path,
                'file_url' => $this->getFileUrl($progressUpdate->file_path),
                'original_name' => $progressUpdate->original_name,
                'file_type' => $progressUpdate->file_type,
                'file_size' => $progressUpdate->file_size,
                'created_by' => $progressUpdate->created_by,
                'created_by_name' => $progressUpdate->createdBy?->name ?? 'Unknown User',
                'created_at' => $progressUpdate->created_at->toISOString(),
                'updated_at' => $progressUpdate->updated_at->toISOString(),
            ],
        ]);
    }

    /**
     * Update progress update
     */
    public function updateProgressUpdate(Request $request, $id, $updateId)
    {
        $user = $request->user();

        $task = ProjectTask::where('id', $id)->with(['milestone.project'])->first();

        if (!$task) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or you do not have access to it',
            ], 404);
        }

        $authz = app(TaskManagementAuthorization::class);
        if (!$authz->canAccessTask($user, $task)) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or you do not have access to it',
            ], 404);
        }

        $progressUpdate = ProgressUpdate::where('id', $updateId)
            ->where('project_task_id', $id)
            ->where('created_by', $user->id)
            ->first();

        if (!$progressUpdate) {
            return response()->json([
                'success' => false,
                'message' => 'Progress update not found or you do not have permission to edit it',
            ], 404);
        }

        if ($this->hasInvalidUploadedFile($request)) {
            return $this->uploadLimitErrorResponse();
        }

        $request->validate([
            'description' => 'required|string',
            'file' => 'nullable|file|max:102400',
        ]);

        $progressUpdate->description = $request->description;

        if ($request->hasFile('file')) {
            // Delete old file if exists
            if ($progressUpdate->file_path && Storage::disk(config('filesystems.default'))->exists($progressUpdate->file_path)) {
                Storage::disk(config('filesystems.default'))->delete($progressUpdate->file_path);
            }

            $file = $request->file('file');
            $directory = "progress_updates/{$task->id}";

            $filename = time() . '_' . $file->getClientOriginalName();
            $file->storeAs($directory, $filename, config('filesystems.default'));

            $progressUpdate->file_path = $directory . '/' . $filename;
            $progressUpdate->original_name = $file->getClientOriginalName();
            $progressUpdate->file_type = $file->getMimeType();
            $progressUpdate->file_size = $file->getSize();
        }

        $progressUpdate->save();
        $progressUpdate->load('createdBy');

        return response()->json([
            'success' => true,
            'message' => 'Progress update updated successfully',
            'data' => [
                'id' => $progressUpdate->id,
                'project_task_id' => $progressUpdate->project_task_id,
                'description' => $progressUpdate->description,
                'file_path' => $progressUpdate->file_path,
                'file_url' => $this->getFileUrl($progressUpdate->file_path),
                'original_name' => $progressUpdate->original_name,
                'file_type' => $progressUpdate->file_type,
                'file_size' => $progressUpdate->file_size,
                'created_by' => $progressUpdate->created_by,
                'created_by_name' => $progressUpdate->createdBy?->name ?? 'Unknown User',
                'created_at' => $progressUpdate->created_at->toISOString(),
                'updated_at' => $progressUpdate->updated_at->toISOString(),
            ],
        ]);
    }

    /**
     * Delete progress update
     */
    public function deleteProgressUpdate(Request $request, $id, $updateId)
    {
        $user = $request->user();

        $task = ProjectTask::where('id', $id)->with(['milestone.project'])->first();

        if (!$task) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or you do not have access to it',
            ], 404);
        }

        $authz = app(TaskManagementAuthorization::class);
        if (!$authz->canAccessTask($user, $task)) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or you do not have access to it',
            ], 404);
        }

        $progressUpdate = ProgressUpdate::where('id', $updateId)
            ->where('project_task_id', $id)
            ->where('created_by', $user->id)
            ->first();

        if (!$progressUpdate) {
            return response()->json([
                'success' => false,
                'message' => 'Progress update not found or you do not have permission to delete it',
            ], 404);
        }

        if ($progressUpdate->file_path && Storage::disk(config('filesystems.default'))->exists($progressUpdate->file_path)) {
            Storage::disk(config('filesystems.default'))->delete($progressUpdate->file_path);
        }

        $progressUpdate->delete();

        return response()->json([
            'success' => true,
            'message' => 'Progress update deleted successfully',
        ]);
    }

    /**
     * Download progress update file
     */
    public function downloadProgressUpdateFile(Request $request, $id, $updateId)
    {
        $user = $request->user();

        $task = ProjectTask::where('id', $id)->with(['milestone.project'])->first();

        if (!$task) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or you do not have access to it',
            ], 404);
        }

        $authz = app(TaskManagementAuthorization::class);
        if (!$authz->canAccessTask($user, $task)) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or you do not have access to it',
            ], 404);
        }

        $progressUpdate = ProgressUpdate::where('id', $updateId)
            ->where('project_task_id', $id)
            ->first();

        if (!$progressUpdate || !$progressUpdate->file_path) {
            return response()->json([
                'success' => false,
                'message' => 'File not found',
            ], 404);
        }

        if (!Storage::disk(config('filesystems.default'))->exists($progressUpdate->file_path)) {
            return response()->json([
                'success' => false,
                'message' => 'File does not exist',
            ], 404);
        }

        return Storage::disk(config('filesystems.default'))->download(
            $progressUpdate->file_path,
            $progressUpdate->original_name ?? 'file'
        );
    }

    /**
     * Get issues for a task
     */
    public function issues(Request $request, $id)
    {
        $user = $request->user();

        $task = ProjectTask::where('id', $id)->with(['milestone.project'])->first();

        if (!$task) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or you do not have access to it',
            ], 404);
        }

        $authz = app(TaskManagementAuthorization::class);
        if (!$authz->canAccessTask($user, $task)) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or you do not have access to it',
            ], 404);
        }

        $issues = ProjectIssue::where('project_task_id', $id)
            ->with(['reportedBy', 'assignedTo'])
            ->orderBy('created_at', 'desc')
            ->get();

        $formattedIssues = $issues->map(function ($issue) {
            return [
                'id' => $issue->id,
                'project_id' => $issue->project_id,
                'project_milestone_id' => $issue->project_milestone_id,
                'project_task_id' => $issue->project_task_id,
                'title' => $issue->title,
                'description' => $issue->description,
                'priority' => $issue->priority,
                'status' => $issue->status,
                'reported_by' => $issue->reported_by,
                'reported_by_name' => $issue->reportedBy->name ?? 'Unknown User',
                'assigned_to' => $issue->assigned_to,
                'assigned_to_name' => $issue->assignedTo->name ?? null,
                'due_date' => $issue->due_date ? Carbon::parse($issue->due_date)->format('Y-m-d') : null,
                'resolved_at' => $issue->resolved_at ? Carbon::parse($issue->resolved_at)->format('Y-m-d') : null,
                'created_at' => $issue->created_at->toISOString(),
                'updated_at' => $issue->updated_at->toISOString(),
            ];
        });

        return response()->json([
            'success' => true,
            'data' => $formattedIssues,
        ]);
    }

    /**
     * Create issue
     */
    public function storeIssue(Request $request, $id)
    {
        $user = $request->user();

        $task = ProjectTask::where('id', $id)
            ->with('milestone.project')
            ->first();

        if (!$task) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or you do not have access to it',
            ], 404);
        }

        $authz = app(TaskManagementAuthorization::class);
        if (!$authz->canAccessTask($user, $task)) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or you do not have access to it',
            ], 404);
        }

        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'priority' => 'required|in:low,medium,high,critical',
        ]);

        $issue = ProjectIssue::create([
            'project_id' => $task->milestone->project->id ?? null,
            'project_milestone_id' => $task->milestone->id ?? null,
            'project_task_id' => $task->id,
            'title' => $request->title,
            'description' => $request->description,
            'priority' => $request->priority,
            'status' => 'open',
            'reported_by' => $user->id,
            'assigned_to' => null,
            'due_date' => null,
            'resolved_at' => null,
        ]);

        $issue->load(['reportedBy', 'assignedTo']);

        // ── Auto-status: issue added → milestone moves to in_progress ──
        if ($task->milestone && $task->milestone->status === 'pending') {
            $task->milestone->update(['status' => 'in_progress']);
        }

        // System-wide notification for new issue
        if ($task->milestone && $task->milestone->project) {
            $project = $task->milestone->project;
            $this->createSystemNotification(
                'issue',
                'New Issue Reported',
                "A new issue '{$request->title}' has been reported for task '{$task->title}' in project '{$project->project_name}'.",
                $project,
                null // API doesn't have web routes
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Issue reported successfully',
            'data' => [
                'id' => $issue->id,
                'project_id' => $issue->project_id,
                'project_milestone_id' => $issue->project_milestone_id,
                'project_task_id' => $issue->project_task_id,
                'title' => $issue->title,
                'description' => $issue->description,
                'priority' => $issue->priority,
                'status' => $issue->status,
                'reported_by' => $issue->reported_by,
                'reported_by_name' => $issue->reportedBy->name ?? 'Unknown User',
                'assigned_to' => $issue->assigned_to,
                'assigned_to_name' => $issue->assignedTo->name ?? null,
                'due_date' => $issue->due_date ? Carbon::parse($issue->due_date)->format('Y-m-d') : null,
                'resolved_at' => $issue->resolved_at ? Carbon::parse($issue->resolved_at)->format('Y-m-d') : null,
                'created_at' => $issue->created_at->toISOString(),
                'updated_at' => $issue->updated_at->toISOString(),
            ],
        ]);
    }

    /**
     * View-only: client request updates for a task (mobile parity).
     */
    public function requestUpdates(Request $request, $id)
    {
        $user = $request->user();

        $task = ProjectTask::where('id', $id)->with(['milestone.project'])->first();

        if (!$task) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or you do not have access to it',
            ], 404);
        }

        $authz = app(TaskManagementAuthorization::class);
        if (!$authz->canAccessTask($user, $task)) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or you do not have access to it',
            ], 404);
        }

        $requests = ClientUpdateRequest::query()
            ->where('task_id', $task->id)
            ->with('client')
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(fn (ClientUpdateRequest $r) => [
                'id' => $r->id,
                'subject' => $r->subject,
                'message' => $r->message,
                'client_id' => $r->client_id,
                'client_name' => $r->client?->client_name ?? null,
                'created_at' => $r->created_at?->toISOString(),
            ])
            ->values();

        return response()->json([
            'success' => true,
            'data' => $requests,
        ]);
    }

    /**
     * Update issue
     */
    public function updateIssue(Request $request, $id, $issueId)
    {
        $user = $request->user();

        $task = ProjectTask::where('id', $id)->with(['milestone.project'])->first();

        if (!$task) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or you do not have access to it',
            ], 404);
        }

        $authz = app(TaskManagementAuthorization::class);
        if (!$authz->canAccessTask($user, $task)) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or you do not have access to it',
            ], 404);
        }

        $issue = ProjectIssue::where('id', $issueId)
            ->where('project_task_id', $id)
            ->where('reported_by', $user->id)
            ->first();

        if (!$issue) {
            return response()->json([
                'success' => false,
                'message' => 'Issue not found or you do not have permission to edit it',
            ], 404);
        }

        $request->validate([
            'title' => 'required|string|max:255',
            'description' => 'required|string',
            'priority' => 'required|in:low,medium,high,critical',
        ]);

        $oldPriority = $issue->priority;
        $issue->title = $request->title;
        $issue->description = $request->description;
        $issue->priority = $request->priority;
        $issue->save();

        $issue->load(['reportedBy', 'assignedTo', 'task.milestone.project']);

        // System-wide notification if priority changed
        if ($oldPriority !== $request->priority && $issue->task && $issue->task->milestone && $issue->task->milestone->project) {
            $project = $issue->task->milestone->project;
            $this->createSystemNotification(
                'issue',
                'Issue Priority Updated',
                "Issue '{$issue->title}' priority has been changed from " . ucfirst($oldPriority) . " to " . ucfirst($request->priority) . " for project '{$project->project_name}'.",
                $project,
                null // API doesn't have web routes
            );
        }

        return response()->json([
            'success' => true,
            'message' => 'Issue updated successfully',
            'data' => [
                'id' => $issue->id,
                'project_id' => $issue->project_id,
                'project_milestone_id' => $issue->project_milestone_id,
                'project_task_id' => $issue->project_task_id,
                'title' => $issue->title,
                'description' => $issue->description,
                'priority' => $issue->priority,
                'status' => $issue->status,
                'reported_by' => $issue->reported_by,
                'reported_by_name' => $issue->reportedBy->name ?? 'Unknown User',
                'assigned_to' => $issue->assigned_to,
                'assigned_to_name' => $issue->assignedTo->name ?? null,
                'due_date' => $issue->due_date ? Carbon::parse($issue->due_date)->format('Y-m-d') : null,
                'resolved_at' => $issue->resolved_at ? Carbon::parse($issue->resolved_at)->format('Y-m-d') : null,
                'created_at' => $issue->created_at->toISOString(),
                'updated_at' => $issue->updated_at->toISOString(),
            ],
        ]);
    }

    /**
     * Delete issue
     */
    public function deleteIssue(Request $request, $id, $issueId)
    {
        $user = $request->user();

        $task = ProjectTask::where('id', $id)->with(['milestone.project'])->first();

        if (!$task) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or you do not have access to it',
            ], 404);
        }

        $authz = app(TaskManagementAuthorization::class);
        if (!$authz->canAccessTask($user, $task)) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or you do not have access to it',
            ], 404);
        }

        $issue = ProjectIssue::where('id', $issueId)
            ->where('project_task_id', $id)
            ->where('reported_by', $user->id)
            ->first();

        if (!$issue) {
            return response()->json([
                'success' => false,
                'message' => 'Issue not found or you do not have permission to delete it',
            ], 404);
        }

        $issue->delete();

        return response()->json([
            'success' => true,
            'message' => 'Issue deleted successfully',
        ]);
    }

    /**
     * Get task priority based on project priority
     */
    private function getTaskPriority($task)
    {
        $projectPriority = $task->milestone->project->priority ?? null;

        switch ($projectPriority) {
            case 'high':
                return 'critical';
            case 'medium':
                return 'medium';
            case 'low':
                return 'low';
            default:
                return null;
        }
    }
}