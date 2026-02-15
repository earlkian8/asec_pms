<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectFile;
use App\Traits\ActivityLogsTrait;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;

class ProjectFilesController extends Controller
{
    use ActivityLogsTrait, NotificationTrait;

    public function store(Request $request, Project $project)
    {

        $validated = $request->validate([
            'file' => ['required', 'file', 'max:20480'], // 20MB
            'category' => ['nullable', 'in:contract,drafting,specification,report,photo,other'],
            'description' => ['nullable', 'string'],
        ]);

        $disk = env('FILESYSTEM_DISK', 'public'); // use public by default
        $directory = "project_files/{$project->id}";
        $uploaded = $request->file('file');

        // Store file using your preferred method
        $filename = basename($uploaded->store($directory, $disk));

        $file = ProjectFile::create([
            'project_id' => $project->id,
            'file_name' => $filename,
            'original_name' => $uploaded->getClientOriginalName(),
            'file_path' => $directory.'/'.$filename,
            'file_size' => $uploaded->getSize(),
            'file_type' => $uploaded->extension(),
            'mime_type' => $uploaded->getMimeType(),
            'category' => $validated['category'] ?? 'other',
            'description' => $validated['description'] ?? null,
            'uploaded_at' => now(),
        ]);

        $this->adminActivityLogs(
            'Project Files',
            'Add',
            "Uploaded file {$file->original_name} to Project {$project->project_name}"
        );

        // System-wide notification for new file
        $this->createSystemNotification(
            'general',
            'New File Uploaded',
            "A new file '{$file->original_name}' has been uploaded to project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );

        return redirect()->back()->with('success', 'File uploaded successfully.');
    }

    public function update(Request $request, Project $project, ProjectFile $file)
    {
        if ($file->project_id !== $project->id) {
            abort(404);
        }

        $validated = $request->validate([
            'category' => ['nullable', 'in:contract,drafting,specification,report,photo,other'],
            'description' => ['nullable', 'string'],
        ]);

        $oldCategory = $file->category;
        $oldDesc = $file->description;

        $file->update($validated);

        $this->adminActivityLogs(
            'Project Files',
            'Update',
            "Updated file {$file->original_name} in Project {$project->project_name}: ".
            "Category: {$oldCategory} → {$file->category}, ".
            'Description changed'
        );

        // System-wide notification for file update
        $this->createSystemNotification(
            'general',
            'Project File Updated',
            "File '{$file->original_name}' has been updated in project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );

        return redirect()->back()->with('success', 'File updated successfully.');
    }

    public function destroy(Request $request, Project $project, ?ProjectFile $file = null)
    {
        $disk = env('FILESYSTEM_DISK', 'public');

        // Bulk delete
        if ($request->has('ids') && is_array($request->ids)) {
            $validated = $request->validate([
                'ids' => 'required|array|min:1',
                'ids.*' => 'integer|exists:project_files,id',
            ]);

            $files = ProjectFile::where('project_id', $project->id)
                ->whereIn('id', $validated['ids'])
                ->get();

            foreach ($files as $f) {
                Storage::disk($disk)->delete($f->file_path);

                $this->adminActivityLogs(
                    'Project Files',
                    'Delete',
                    "Deleted file {$f->original_name} from Project {$project->project_name}"
                );

                $f->delete();

                // System-wide notification for file deletion
                $this->createSystemNotification(
                    'general',
                    'Project File Deleted',
                    "File '{$f->original_name}' has been deleted from project '{$project->project_name}'.",
                    $project,
                    route('project-management.view', $project->id)
                );
            }

            return redirect()->back()->with('success', 'Selected files deleted successfully.');
        }

        // Single delete
        if (! $file || $file->project_id !== $project->id) {
            abort(404);
        }

        Storage::disk($disk)->delete($file->file_path);

        $fileName = $file->original_name;
        $file->delete();

        $this->adminActivityLogs(
            'Project Files',
            'Delete',
            "Deleted file {$fileName} from Project {$project->project_name}"
        );

        // System-wide notification for file deletion
        $this->createSystemNotification(
            'general',
            'Project File Deleted',
            "File '{$fileName}' has been deleted from project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );

        return redirect()->back()->with('success', 'File deleted successfully.');
    }

    public function download(Project $project, ProjectFile $file)
    {
        // Ensure the file belongs to the given project
        if ($file->project_id !== $project->id) {
            abort(404);
        }

        $disk = env('FILESYSTEM_DISK', 'public');

        if (! Storage::disk($disk)->exists($file->file_path)) {
            return redirect()->back()->with('error', 'File not found on server.');
        }

        // Log the download
        $this->adminActivityLogs(
            'Project Files',
            'Download',
            "Downloaded file {$file->original_name} from Project {$project->project_name}"
        );

        // Return the file as a download with original name
        return Storage::disk($disk)->download($file->file_path, $file->original_name);
    }
}
