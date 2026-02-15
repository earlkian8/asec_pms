<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectFile;

class ProjectFilesService
{
    public function getProjectFilesData(Project $project)
    {
        $search = request('search');

        $files = ProjectFile::where('project_id', $project->id)
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('file_name', 'ilike', "%{$search}%")
                        ->orWhere('original_name', 'ilike', "%{$search}%")
                        ->orWhere('category', 'ilike', "%{$search}%")
                        ->orWhere('description', 'ilike', "%{$search}%");
                });
            })
            ->orderBy('uploaded_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        return [
            'project' => $project->load('client'),
            'files' => $files,
            'search' => $search,
        ];
    }
}
