<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProjectMilestone;
use App\Models\ProjectTask;
use App\Models\ProgressUpdate;
use App\Models\User;
use App\Traits\ActivityLogsTrait;
use App\Traits\ClientNotificationTrait;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProgressUpdatesController extends Controller
{
    use ActivityLogsTrait, ClientNotificationTrait, NotificationTrait;

    // Store progress update
    public function store(Request $request)
    {
        $data = $request->validate([
            'project_task_id' => 'required|exists:project_tasks,id',
            'description'    => 'required|string',
            'file'            => 'nullable|file|max:20480', // 20MB max
        ]);

        $task = ProjectTask::with('milestone.project')->findOrFail($data['project_task_id']);
        $milestone = $task->milestone;

        $filePath = null;
        $originalName = null;
        $fileType = null;
        $fileSize = null;

        if ($request->hasFile('file')) {
            $file = $request->file('file');
            $disk = env('FILESYSTEM_DISK', 'public');
            $directory = "progress_updates/{$task->id}";
            
            $filename = basename($file->store($directory, $disk));
            $filePath = $directory . '/' . $filename;
            $originalName = $file->getClientOriginalName();
            $fileType = $file->getMimeType();
            $fileSize = $file->getSize();
        }

        $progressUpdate = ProgressUpdate::create([
            'project_task_id' => $data['project_task_id'],
            'description'    => $data['description'] ?? null,
            'file_path'      => $filePath,
            'original_name'  => $originalName,
            'file_type'      => $fileType,
            'file_size'      => $fileSize,
            'created_by'     => auth()->id(),
        ]);

        $this->adminActivityLogs(
            'Progress Update',
            'Created',
            'Created progress update for task "' . $task->title . '" in milestone "' . $milestone->name . '"'
        );

        // Create notification for client
        if ($milestone->project) {
            $this->notifyProgressUpdate($milestone->project, $task->title, $milestone->name);
        }

        // System-wide notification for progress update
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

    // Update progress update
    public function update(ProjectMilestone $milestone, ProjectTask $task, ProgressUpdate $progressUpdate, Request $request)
    {
        if ($progressUpdate->project_task_id !== $task->id || $task->project_milestone_id !== $milestone->id) {
            abort(404);
        }
        
        // Load project relationship
        $milestone->load('project');

        $data = $request->validate([
            'description' => 'required|string',
            'file'       => 'nullable|file|max:20480',
        ]);

        // Handle file update
        if ($request->hasFile('file')) {
            // Delete old file if exists
            if ($progressUpdate->file_path) {
                $disk = env('FILESYSTEM_DISK', 'public');
                Storage::disk($disk)->delete($progressUpdate->file_path);
            }

            $file = $request->file('file');
            $disk = env('FILESYSTEM_DISK', 'public');
            $directory = "progress_updates/{$task->id}";
            
            $filename = basename($file->store($directory, $disk));
            $data['file_path'] = $directory . '/' . $filename;
            $data['original_name'] = $file->getClientOriginalName();
            $data['file_type'] = $file->getMimeType();
            $data['file_size'] = $file->getSize();
        }

        $progressUpdate->update($data);

        $this->adminActivityLogs(
            'Progress Update',
            'Updated',
            'Updated progress update for task "' . $task->title . '" in milestone "' . $milestone->name . '"'
        );

        // System-wide notification for progress update
        $milestone->load('project');
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

    // Delete progress update
    public function destroy(ProjectMilestone $milestone, ProjectTask $task, ProgressUpdate $progressUpdate)
    {
        if ($progressUpdate->project_task_id !== $task->id || $task->project_milestone_id !== $milestone->id) {
            abort(404);
        }

        // Delete file if exists
        if ($progressUpdate->file_path) {
            $disk = env('FILESYSTEM_DISK', 'public');
            Storage::disk($disk)->delete($progressUpdate->file_path);
        }

        $progressUpdate->delete();

        $this->adminActivityLogs(
            'Progress Update',
            'Deleted',
            'Deleted progress update for task "' . $task->title . '" in milestone "' . $milestone->name . '"'
        );

        // System-wide notification for progress update deletion
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

    // Download progress update file
    public function download(ProjectMilestone $milestone, ProjectTask $task, ProgressUpdate $progressUpdate)
    {
        if ($progressUpdate->project_task_id !== $task->id || $task->project_milestone_id !== $milestone->id) {
            abort(404);
        }

        if (!$progressUpdate->file_path) {
            return redirect()->back()->with('error', 'No file attached to this progress update.');
        }

        $disk = env('FILESYSTEM_DISK', 'public');

        if (!Storage::disk($disk)->exists($progressUpdate->file_path)) {
            return redirect()->back()->with('error', 'File not found on server.');
        }

        // Log the download
        $this->adminActivityLogs(
            'Progress Update',
            'Download',
            'Downloaded file "' . $progressUpdate->original_name . '" from progress update for task "' . $task->title . '"'
        );

        // Return the file as a download with original name
        return Storage::disk($disk)->download($progressUpdate->file_path, $progressUpdate->original_name);
    }
}
