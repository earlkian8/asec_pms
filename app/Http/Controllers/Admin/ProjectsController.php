<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Project;
use App\Traits\ActivityLogsTrait;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProjectsController extends Controller
{
    use ActivityLogsTrait;

    public function index(Request $request)
    {
        $search = $request->input('search');

        $projects = Project::with(['client'])
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('project_code', 'like', "%{$search}%")
                    ->orWhere('project_name', 'like', "%{$search}%")
                    ->orWhere('status', 'like', "%{$search}%")
                    ->orWhere('priority', 'like', "%{$search}%");
                });
            })
            ->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString(); // keep search when paginating

        $clients = Client::orderBy('client_name')->where('is_active', true)->get();

        return Inertia::render('ProjectManagement/index', [
            'projects'   => $projects,
            'search'     => $search,
            'clients'    => $clients
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'project_name'          => ['required', 'max:255'],
            'client_id'             => ['required', 'exists:clients,id'],
            'project_type'          => ['required', 'in:design,construction,consultancy,maintenance'],
            'status'                => ['nullable', 'in:planning,active,on_hold,completed,cancelled'],
            'priority'              => ['nullable', 'in:low,medium,high,critical'],
            'contract_amount'       => ['required', 'numeric'],
            'start_date'            => ['nullable', 'date'],
            'planned_end_date'      => ['nullable', 'date'],
            'actual_end_date'       => ['nullable', 'date'],
            'completion_percentage' => ['nullable', 'numeric'],
            'location'              => ['nullable', 'string'],
            'description'           => ['nullable', 'string'],
            'is_billable'           => ['nullable', 'boolean'],
            'billing_type'          => ['nullable', 'in:fixed_price,milestone'],
        ]);

        do {
            $random = str_pad(rand(1, 999999), 6, '0', STR_PAD_LEFT);
            $projectCode = 'PRJ-' . $random;
        } while (Project::where('project_code', $projectCode)->exists());

        $validated['project_code'] = $projectCode;

        $project = Project::create($validated);

        $this->adminActivityLogs('Project', 'Add', 'Added Project ' . $project->project_name);

        return redirect()->back()->with('success', 'Project created successfully.');
    }
    public function update(Request $request, Project $project)
    {
        $validated = $request->validate([
            'project_name'          => ['required', 'max:255'],
            'client_id'             => ['required', 'exists:clients,id'],
            'project_type'          => ['required', 'in:design,construction,consultancy,maintenance'],
            'status'                => ['nullable', 'in:planning,active,on_hold,completed,cancelled'],
            'priority'              => ['nullable', 'in:low,medium,high,critical'],
            'contract_amount'       => ['required', 'numeric'],
            'start_date'            => ['nullable', 'date'],
            'planned_end_date'      => ['nullable', 'date'],
            'actual_end_date'       => ['nullable', 'date'],
            'completion_percentage' => ['nullable', 'numeric'],
            'location'              => ['nullable', 'string'],
            'description'           => ['nullable', 'string'],
            'is_billable'           => ['nullable', 'boolean'],
            'billing_type'          => ['nullable', 'in:fixed_price,milestone'],
        ]);

        // Update the project
        $project->update($validated);

        $this->adminActivityLogs('Project', 'Update', 'Updated Project ' . $project->project_name);

        return redirect()->back()->with('success', 'Project updated successfully.');
    }

    public function destroy(Project $project)
    {
        $projectName = $project->project_name;

        $project->delete();

        $this->adminActivityLogs('Project', 'Delete', 'Deleted Project ' . $projectName);

        return redirect()->back()->with('success', 'Project deleted successfully.');
    }

}
