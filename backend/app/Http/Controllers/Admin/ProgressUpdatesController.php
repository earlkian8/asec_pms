<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProjectMilestone;
use App\Models\ProjectTask;
use App\Models\ProgressUpdate;
use App\Traits\ActivityLogsTrait;
use App\Traits\ClientNotificationTrait;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProgressUpdatesController extends Controller
{
    use ActivityLogsTrait, ClientNotificationTrait, NotificationTrait;

    /**
     * When a progress update is added, the milestone should move to in_progress
     * if it was still pending.
     */
    private function autoProgressMilestone(ProjectTask $task, ProjectMilestone $milestone): void
    {
        // If the task is still pending, a progress update means work has started
        if ($task->status === 'pending') {
            $task->update(['status' => 'in_progress']);
        }

        // Milestone should follow suit
        if ($milestone->status === 'pending') {
            $milestone->update(['status' => 'in_progress']);
        }
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'project_task_id' => 'required|exists:project_tasks,id',
            'description'     => 'required|string',
            'file'            => 'nullable|file|max:20480',
        ]);

        $task      = ProjectTask::with('milestone.project')->findOrFail($data['project_task_id']);
        $milestone = $task->milestone;

        $filePath     = null;
        $originalName = null;
        $fileType     = null;
        $fileSize     = null;

        if ($request->hasFile('file')) {
            $file         = $request->file('file');
            $directory    = "progress_updates/{$task->id}";
            $filePath     = $file->store($directory, 'public');
            $originalName = $file->getClientOriginalName();
            $fileType     = $file->getMimeType();
            $fileSize     = $file->getSize();
        }

        $progressUpdate = ProgressUpdate::create([
            'project_task_id' => $data['project_task_id'],
            'description'     => $data['description'] ?? null,
            'file_path'       => $filePath,
            'original_name'   => $originalName,
            'file_type'       => $fileType,
            'file_size'       => $fileSize,
            'created_by'      => auth()->id(),
        ]);

        // ── Auto-status: progress update added → milestone moves to in_progress ──
        if ($task && $milestone) {
            $this->autoProgressMilestone($task, $milestone);
        }

        $this->adminActivityLogs(
            'Progress Update',
            'Created',
            'Created progress update for task "' . $task->title . '" in milestone "' . $milestone->name . '"'
        );

        if ($milestone->project) {
            $this->notifyProgressUpdate($milestone->project, $task->title, $milestone->name);
        }

        if ($milestone->project) {
            $this->createSystemNotification(
                'update',
                'New Progress Update',
                "A new progress update has been added for task '{$task->title}' in milestone '{$milestone->name}' for project '{$milestone->project->project_name}'.",
                $milestone->project,
                route('project-management.view', $milestone->project->id)
            );
        }

        return back()->with('success', 'Progress update created successfully');
    }

    public function update(ProjectMilestone $milestone, ProjectTask $task, ProgressUpdate $progressUpdate, Request $request)
    {
        if ($progressUpdate->project_task_id !== $task->id || $task->project_milestone_id !== $milestone->id) {
            abort(404);
        }

        $milestone->load('project');

        $data = $request->validate([
            'description' => 'required|string',
            'file'        => 'nullable|file|max:20480',
        ]);

        if ($request->hasFile('file')) {
            if ($progressUpdate->file_path) {
                Storage::disk('public')->delete($progressUpdate->file_path);
            }

            $file                  = $request->file('file');
            $directory             = "progress_updates/{$task->id}";
            $data['file_path']     = $file->store($directory, 'public');
            $data['original_name'] = $file->getClientOriginalName();
            $data['file_type']     = $file->getMimeType();
            $data['file_size']     = $file->getSize();
        }

        $progressUpdate->update($data);

        $this->adminActivityLogs(
            'Progress Update',
            'Updated',
            'Updated progress update for task "' . $task->title . '" in milestone "' . $milestone->name . '"'
        );

        if ($milestone->project) {
            $this->createSystemNotification(
                'update',
                'Progress Update Updated',
                "Progress update for task '{$task->title}' has been updated in milestone '{$milestone->name}' for project '{$milestone->project->project_name}'.",
                $milestone->project,
                route('project-management.view', $milestone->project->id)
            );
        }

        return back()->with('success', 'Progress update updated successfully');
    }

    public function destroy(ProjectMilestone $milestone, ProjectTask $task, ProgressUpdate $progressUpdate)
    {
        if ($progressUpdate->project_task_id !== $task->id || $task->project_milestone_id !== $milestone->id) {
            abort(404);
        }

        if ($progressUpdate->file_path) {
            Storage::disk('public')->delete($progressUpdate->file_path);
        }

        $progressUpdate->delete();

        $this->adminActivityLogs(
            'Progress Update',
            'Deleted',
            'Deleted progress update for task "' . $task->title . '" in milestone "' . $milestone->name . '"'
        );

        $milestone->load('project');
        if ($milestone->project) {
            $this->createSystemNotification(
                'update',
                'Progress Update Deleted',
                "Progress update for task '{$task->title}' has been deleted from milestone '{$milestone->name}' for project '{$milestone->project->project_name}'.",
                $milestone->project,
                route('project-management.view', $milestone->project->id)
            );
        }

        return back()->with('success', 'Progress update deleted successfully');
    }

    public function download(ProjectMilestone $milestone, ProjectTask $task, ProgressUpdate $progressUpdate)
    {
        if ($progressUpdate->project_task_id !== $task->id || $task->project_milestone_id !== $milestone->id) {
            abort(404);
        }

        if (!$progressUpdate->file_path) {
            return redirect()->back()->with('error', 'No file attached to this progress update.');
        }

        if (!Storage::disk('public')->exists($progressUpdate->file_path)) {
            return redirect()->back()->with('error', 'File not found on server.');
        }

        $this->adminActivityLogs(
            'Progress Update',
            'Download',
            'Downloaded file "' . $progressUpdate->original_name . '" from progress update for task "' . $task->title . '"'
        );

        return Storage::disk('public')->download($progressUpdate->file_path, $progressUpdate->original_name);
    }
}