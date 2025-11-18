<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Traits\ActivityLogsTrait;
use Illuminate\Http\Request;
use Inertia\Inertia;
use App\Services\ProjectTeamService;
use App\Services\ProjectFilesService;
use App\Services\ProjectMilestonesService;
use App\Services\TaskService;
use App\Services\ProgressUpdateService;
use App\Services\MaterialAllocationService;
use App\Services\LaborCostService;

class ProjectsController extends Controller
{
    use ActivityLogsTrait;

    protected $projectTeamService;
    protected $projectFilesService;
    protected $projectMilestonesService;
    protected $projectTasksService;
    protected $progressUpdateService;
    protected $materialAllocationService;
    protected $laborCostService;
    public function __construct(ProjectTeamService $projectTeamService, ProjectFilesService $projectFilesService, ProjectMilestonesService $projectMilestonesService, TaskService $projectTasksService, ProgressUpdateService $progressUpdateService, MaterialAllocationService $materialAllocationService, LaborCostService $laborCostService)
    {
        $this->projectTeamService = $projectTeamService;
        $this->projectFilesService = $projectFilesService;
        $this->projectMilestonesService = $projectMilestonesService;
        $this->projectTasksService = $projectTasksService;
        $this->progressUpdateService = $progressUpdateService;
        $this->materialAllocationService = $materialAllocationService;
        $this->laborCostService = $laborCostService;
    }
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

    public function show(Project $project, Request $request)
{
    // Load project relationships
    $project->load(['client']);

    // Get project team data
    $teamData = $this->projectTeamService->getProjectTeamData($project, $request);

    // Get project files data (kept for potential future use)
    $fileData = $this->projectFilesService->getProjectFilesData($project);

    // Get project milestones data (now includes tasks and progress updates)
    $milestoneData = $this->projectMilestonesService->getProjectMilestonesData($project);

    // Get material allocation data
    $materialAllocationData = $this->materialAllocationService->getProjectMaterialAllocationsData($project);

    // Get labor cost data
    $laborCostData = $this->laborCostService->getProjectLaborCostsData($project);

    return Inertia::render('ProjectManagement/project-detail', [
        'project' => $project,
        'teamData' => $teamData,
        'fileData' => $fileData,
        'milestoneData' => $milestoneData,
        'materialAllocationData' => $materialAllocationData,
        'laborCostData' => $laborCostData,
    ]);
}

    

}
