<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ProjectType;
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
        $isActive = $request->input('is_active');
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc'); // Default to desc for created_at

        // Validate sort column
        $allowedSortColumns = ['created_at', 'name', 'is_active'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'created_at';
        }

        // Validate sort order
        $sortOrder = in_array(strtolower($sortOrder), ['asc', 'desc']) ? strtolower($sortOrder) : 'desc';

        $projectTypes = ProjectType::withCount('projects')
            ->when($search, function ($query, $search) {
                return $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($isActive !== null && $isActive !== '', function ($query) use ($isActive) {
                $query->where('is_active', $isActive === 'true' || $isActive === true || $isActive === '1' || $isActive === 1);
            })
            ->orderBy($sortBy, $sortOrder)
            ->when($sortBy !== 'created_at', function ($query) use ($sortOrder) {
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
                'is_active' => $isActive,
            ],
            'sort_by' => $sortBy,
            'sort_order' => $sortOrder,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'        => ['required', 'max:255', 'unique:project_types,name'],
            'description' => ['nullable', 'string'],
            'is_active'   => ['required', 'boolean'],
        ]);

        $projectType = ProjectType::create($validated);

        $this->adminActivityLogs('ProjectType', 'Add', 'Added Project Type ' . $projectType->name);

        try {
            $this->createSystemNotification(
                'general',
                'New Project Type Added',
                "A new project type '{$projectType->name}' has been added to the system.",
                null,
                route('project-type-management.index')
            );
        } catch (\Exception $e) {
            // Log error but don't fail the creation
            \Log::error('Failed to create system notification: ' . $e->getMessage());
        }

        return redirect()->back()->with('success', 'Project type added successfully.');
    }

    public function update(Request $request, ProjectType $projectType)
    {
        $validated = $request->validate([
            'name'        => ['required', 'max:255', Rule::unique('project_types', 'name')->ignore($projectType->id)],
            'description' => ['nullable', 'string'],
            'is_active'   => ['required', 'boolean'],
        ]);

        // Ensure is_active is a proper boolean
        $validated['is_active'] = filter_var($validated['is_active'], FILTER_VALIDATE_BOOLEAN);

        $oldName = $projectType->name;

        $projectType->update($validated);

        $this->adminActivityLogs('ProjectType', 'Update', 'Updated Project Type ' . $oldName);

        try {
            $this->createSystemNotification(
                'general',
                'Project Type Updated',
                "Project type '{$projectType->name}' has been updated.",
                null,
                route('project-type-management.index')
            );
        } catch (\Exception $e) {
            // Log error but don't fail the update
            \Log::error('Failed to create system notification: ' . $e->getMessage());
        }

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

        $this->adminActivityLogs('ProjectType', 'Delete', 'Deleted Project Type ' . $name);

        try {
            $this->createSystemNotification(
                'general',
                'Project Type Deleted',
                "Project type '{$name}' has been deleted.",
                null,
                route('project-type-management.index')
            );
        } catch (\Exception $e) {
            // Log error but don't fail the deletion
            \Log::error('Failed to create system notification: ' . $e->getMessage());
        }

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
            'Updated Project Type ' . $projectType->name . ' status to ' . ($request->boolean('is_active') ? 'Active' : 'Inactive')
        );

        $status = $request->boolean('is_active') ? 'Active' : 'Inactive';
        try {
            $this->createSystemNotification(
                'status_change',
                'Project Type Status Updated',
                "Project type '{$projectType->name}' status has been changed to {$status}.",
                null,
                route('project-type-management.index')
            );
        } catch (\Exception $e) {
            // Log error but don't fail the status update
            \Log::error('Failed to create system notification: ' . $e->getMessage());
        }

        return redirect()->route('project-type-management.index')->with('success', 'Project type status updated successfully.');
    }
}

