<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProjectType;
use App\Support\IndexQueryHelper;
use App\Traits\ActivityLogsTrait;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ProjectTypesController extends Controller
{
    use ActivityLogsTrait, NotificationTrait;

    public function index(Request $request)
    {
        $search = $request->input('search');
        $isActive = IndexQueryHelper::parseBoolean($request->input('is_active'));
        $allowedSortColumns = ['created_at', 'name', 'is_active'];
        $sortParams = IndexQueryHelper::sortParams($request, $allowedSortColumns);
        $sortBy = $sortParams['sort_by'];
        $sortOrder = $sortParams['sort_order'];

        $projectTypes = ProjectType::withCount('projects')
            ->when($search, function ($query, $search) {
                return query_where_search_in($query, ['name', 'description'], $search);
            })
            ->when($isActive !== null, function ($query) use ($isActive) {
                $query->where('is_active', $isActive);
            })
            ->orderBy($sortBy, $sortOrder)
            ->when($sortBy !== 'created_at', function ($query) {
                // Always add created_at as secondary sort to maintain stable position
                $query->orderBy('created_at', 'desc');
            })
            ->when($sortBy === 'created_at', function ($query) {
                // If sorting by created_at, ensure consistent secondary sort (by id for stability)
                $query->orderBy('id', 'desc');
            })
            ->paginate(10);

        return Inertia::render('ProjectTypeManagement/index', [
            'projectTypes' => $projectTypes,
            'search' => $search,
            'filters' => [
                'is_active' => $request->input('is_active'),
            ],
            'sort_by' => $sortBy,
            'sort_order' => $sortOrder,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => ['required', 'max:255', 'unique:project_types,name'],
            'description' => ['nullable', 'string'],
            'is_active' => ['required', 'boolean'],
        ]);

        $projectType = ProjectType::create($validated);

        $this->adminActivityLogs('ProjectType', 'Add', 'Added Project Type '.$projectType->name);
        $this->safeSystemNotification(
            'general',
            'New Project Type Added',
            "A new project type '{$projectType->name}' has been added to the system.",
            null,
            route('project-type-management.index')
        );

        return redirect()->back()->with('success', 'Project type added successfully.');
    }

    public function update(Request $request, ProjectType $projectType)
    {
        $validated = $request->validate([
            'name' => ['required', 'max:255', Rule::unique('project_types', 'name')->ignore($projectType->id)],
            'description' => ['nullable', 'string'],
            'is_active' => ['required', 'boolean'],
        ]);

        // Ensure is_active is a proper boolean
        $validated['is_active'] = filter_var($validated['is_active'], FILTER_VALIDATE_BOOLEAN);

        $oldName = $projectType->name;

        $projectType->update($validated);

        $this->adminActivityLogs('ProjectType', 'Update', 'Updated Project Type '.$oldName);

        $this->safeSystemNotification(
            'general',
            'Project Type Updated',
            "Project type '{$projectType->name}' has been updated.",
            null,
            route('project-type-management.index')
        );

        return redirect()->route('project-type-management.index')->with('success', 'Project type updated successfully.');
    }

    public function destroy(ProjectType $projectType)
    {
        $name = $projectType->name;

        // Prevent deletion if project type has related projects
        if ($projectType->projects()->exists()) {
            return back()->withErrors([
                'message' => 'This project type has existing projects and cannot be deleted.',
            ]);
        }

        $projectType->delete();

        $this->adminActivityLogs('ProjectType', 'Delete', 'Deleted Project Type '.$name);

        $this->safeSystemNotification(
            'general',
            'Project Type Deleted',
            "Project type '{$name}' has been deleted.",
            null,
            route('project-type-management.index')
        );

        return redirect()->route('project-type-management.index')->with('success', 'Project type deleted successfully.');
    }

    public function handleStatus(Request $request, ProjectType $projectType)
    {
        $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $projectType->update([
            'is_active' => $request->input('is_active'),
        ]);

        $this->adminActivityLogs(
            'ProjectType',
            'Update Status',
            'Updated Project Type '.$projectType->name.' status to '.($request->boolean('is_active') ? 'Active' : 'Inactive')
        );

        $status = $request->boolean('is_active') ? 'Active' : 'Inactive';
        $this->safeSystemNotification(
            'status_change',
            'Project Type Status Updated',
            "Project type '{$projectType->name}' status has been changed to {$status}.",
            null,
            route('project-type-management.index')
        );

        return redirect()->route('project-type-management.index')->with('success', 'Project type status updated successfully.');
    }
}
