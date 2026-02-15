<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreProjectRequest;
use App\Http\Requests\UpdateProjectRequest;
use App\Models\Client;
use App\Models\ClientType;
use App\Models\ClientUpdateRequest;
use App\Models\Employee;
use App\Models\InventoryItem;
use App\Models\Project;
use App\Models\ProjectType;
use App\Models\User;
use App\Services\CodeGeneratorService;
use App\Services\LaborCostService;
use App\Services\MaterialAllocationService;
use App\Services\MiscellaneousExpenseService;
use App\Services\ProgressUpdateService;
use App\Services\ProjectCreationService;
use App\Services\ProjectFilesService;
use App\Services\ProjectMilestonesService;
use App\Services\ProjectOverviewService;
use App\Services\ProjectTeamService;
use App\Services\TaskService;
use App\Support\IndexQueryHelper;
use App\Traits\ActivityLogsTrait;
use App\Traits\ClientNotificationTrait;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ProjectsController extends Controller
{
    use ActivityLogsTrait, ClientNotificationTrait, NotificationTrait;

    protected $projectTeamService;

    protected $projectFilesService;

    protected $projectMilestonesService;

    protected $projectTasksService;

    protected $progressUpdateService;

    protected $materialAllocationService;

    protected $laborCostService;

    protected $miscellaneousExpenseService;

    protected $projectOverviewService;

    protected $codeGeneratorService;

    protected $projectCreationService;

    public function __construct(ProjectTeamService $projectTeamService, ProjectFilesService $projectFilesService, ProjectMilestonesService $projectMilestonesService, TaskService $projectTasksService, ProgressUpdateService $progressUpdateService, MaterialAllocationService $materialAllocationService, LaborCostService $laborCostService, MiscellaneousExpenseService $miscellaneousExpenseService, ProjectOverviewService $projectOverviewService, CodeGeneratorService $codeGeneratorService, ProjectCreationService $projectCreationService)
    {
        $this->projectTeamService = $projectTeamService;
        $this->projectFilesService = $projectFilesService;
        $this->projectMilestonesService = $projectMilestonesService;
        $this->projectTasksService = $projectTasksService;
        $this->progressUpdateService = $progressUpdateService;
        $this->materialAllocationService = $materialAllocationService;
        $this->laborCostService = $laborCostService;
        $this->miscellaneousExpenseService = $miscellaneousExpenseService;
        $this->projectOverviewService = $projectOverviewService;
        $this->codeGeneratorService = $codeGeneratorService;
        $this->projectCreationService = $projectCreationService;
    }

    public function index(Request $request)
    {
        $search = $request->input('search');
        $clientId = $request->input('client_id');
        $status = $request->input('status');
        $priority = $request->input('priority');
        $projectType = $request->input('project_type_id');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $allowedSortColumns = ['created_at', 'project_name', 'project_code', 'status', 'priority', 'contract_amount', 'start_date', 'planned_end_date'];
        $sortParams = IndexQueryHelper::sortParams($request, $allowedSortColumns);
        $sortBy = $sortParams['sort_by'];
        $sortOrder = $sortParams['sort_order'];

        $projects = Project::with(['client', 'projectType:id,name', 'milestones.tasks'])
            ->when($search, function ($query, $search) {
                query_where_search_in($query, ['project_code', 'project_name', 'status', 'priority'], $search);
            })
            ->when($clientId, function ($query, $clientId) {
                $query->where('client_id', $clientId);
            })
            ->when($status, function ($query, $status) {
                $query->where('status', $status);
            })
            ->when($priority, function ($query, $priority) {
                $query->where('priority', $priority);
            })
            ->when($projectType, function ($query, $projectType) {
                $query->where('project_type_id', $projectType);
            })
            ->when($startDate, function ($query, $startDate) {
                $query->whereDate('start_date', '>=', $startDate);
            })
            ->when($endDate, function ($query, $endDate) {
                $query->whereDate('planned_end_date', '<=', $endDate);
            })
            ->orderBy($sortBy, $sortOrder)
            ->when($sortBy !== 'created_at', function ($query) {
                // Add created_at as secondary sort to maintain stable position when sorting by other fields
                $query->orderBy('created_at', 'desc');
            })
            ->paginate(10);

        // Calculate progress for each project based on all tasks of milestones
        $projects->getCollection()->transform(function ($project) {
            $milestones = $project->milestones;
            $allTasks = collect();

            // Collect all tasks from all milestones
            foreach ($milestones as $milestone) {
                if ($milestone->tasks) {
                    $allTasks = $allTasks->merge($milestone->tasks);
                }
            }

            $totalTasks = $allTasks->count();
            $completedTasks = $allTasks->where('status', 'completed')->count();
            $project->progress_percentage = $totalTasks > 0
                ? round(($completedTasks / $totalTasks) * 100, 2)
                : 0;

            return $project;
        });

        $clients = Client::orderBy('client_name')->where('is_active', true)->get();

        // Get users for team assignment with roles
        $users = User::with('roles')->orderBy('name')->get(['id', 'name', 'email'])->map(function ($user) {
            return [
                'id' => $user->id,
                'name' => $user->name,
                'email' => $user->email,
                'role' => $user->roles->first()?->name ?? 'No Role',
                'type' => 'user',
            ];
        });

        // Get employees for team assignment
        $employees = Employee::where('is_active', true)
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get(['id', 'first_name', 'last_name', 'email', 'position'])
            ->map(function ($employee) {
                return [
                    'id' => $employee->id,
                    'name' => $employee->first_name.' '.$employee->last_name,
                    'email' => $employee->email,
                    'position' => $employee->position ?? 'No Position',
                    'type' => 'employee',
                ];
            });

        // Combine users and employees
        $allAssignables = $users->concat($employees)->sortBy('name')->values();

        // Get inventory items for material allocation
        $inventoryItems = InventoryItem::where('is_active', true)
            ->orderBy('item_name')
            ->get(['id', 'item_code', 'item_name']); // 'unit_of_measure', 'unit_price', 'current_stock'

        // Get project types from database
        $projectTypes = ProjectType::where('is_active', true)->orderBy('name')->get(['id', 'name']);

        // Get client types for AddClient modal
        $clientTypes = ClientType::where('is_active', true)->orderBy('name')->get(['id', 'name']);

        $statuses = Project::distinct()->whereNotNull('status')->pluck('status')->sort()->values();
        $priorities = Project::distinct()->whereNotNull('priority')->pluck('priority')->sort()->values();

        return Inertia::render('ProjectManagement/index', [
            'projects' => $projects,
            'search' => $search,
            'clients' => $clients,
            'users' => $allAssignables, // Combined users and employees
            'inventoryItems' => $inventoryItems,
            'projectTypes' => $projectTypes,
            'clientTypes' => $clientTypes,
            'filters' => [
                'client_id' => $clientId,
                'status' => $status,
                'priority' => $priority,
                'project_type_id' => $projectType,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'filterOptions' => [
                'projectTypes' => $projectTypes,
                'statuses' => $statuses,
                'priorities' => $priorities,
            ],
            'sort_by' => $sortBy,
            'sort_order' => $sortOrder,
        ]);
    }

    public function store(StoreProjectRequest $request)
    {
        $validated = $request->validated();

        try {
            $project = $this->projectCreationService->create($validated);
        } catch (\Exception $e) {
            return redirect()->back()->with('error', 'Failed to create project: '.$e->getMessage());
        }

        $this->adminActivityLogs('Project', 'Add', 'Added Project '.$project->project_name.' with team, milestones, materials, and labor costs');
        $this->safeSystemNotification(
            'general',
            'New Project Created',
            "A new project '{$project->project_name}' has been created.",
            $project,
            route('project-management.view', $project->id)
        );

        return redirect()->back()->with('success', 'Project created successfully with all related data.');
    }

    public function update(UpdateProjectRequest $request, Project $project)
    {
        $validated = $request->validated();
        $project->update($validated);

        $this->adminActivityLogs('Project', 'Update', 'Updated Project '.$project->project_name);

        // System-wide notification for any project update
        $this->createSystemNotification(
            'general',
            'Project Updated',
            "Project '{$project->project_name}' has been updated.",
            $project,
            route('project-management.view', $project->id)
        );

        return redirect()->back()->with('success', 'Project updated successfully.');
    }

    public function destroy(Project $project)
    {
        $projectName = $project->project_name;

        $project->delete();

        $this->adminActivityLogs('Project', 'Delete', 'Deleted Project '.$projectName);

        // System-wide notification for project deletion
        $this->createSystemNotification(
            'general',
            'Project Deleted',
            "Project '{$projectName}' has been deleted.",
            null,
            route('project-management.index')
        );

        return redirect()->back()->with('success', 'Project deleted successfully.');
    }

    public function show(Project $project, Request $request)
    {
        // Load project relationships
        $project->load(['client', 'projectType']);

        // Get project team data
        $teamData = $this->projectTeamService->getProjectTeamData($project);

        $fileData = $this->projectFilesService->getProjectFilesData($project);

        // Get project milestones data (now includes tasks and progress updates)
        $milestoneData = $this->projectMilestonesService->getProjectMilestonesData($project);

        // Get material allocation data
        $materialAllocationData = $this->materialAllocationService->getProjectMaterialAllocationsData($project);

        // Get labor cost data
        $laborCostData = $this->laborCostService->getProjectLaborCostsData($project);

        // Get miscellaneous expenses data
        $miscellaneousExpenseData = $this->miscellaneousExpenseService->getProjectMiscellaneousExpensesData($project);

        // Get project overview data
        $overviewData = $this->projectOverviewService->getProjectOverviewData($project);

        // Get request updates for this project
        $requestUpdates = ClientUpdateRequest::with(['client'])
            ->where('project_id', $project->id)
            ->orderBy('created_at', 'desc')
            ->get();

        return Inertia::render('ProjectManagement/project-detail', [
            'project' => $project,
            'teamData' => $teamData,
            'fileData' => $fileData,
            'milestoneData' => $milestoneData,
            'materialAllocationData' => $materialAllocationData,
            'laborCostData' => $laborCostData,
            'miscellaneousExpenseData' => $miscellaneousExpenseData,
            'overviewData' => $overviewData,
            'requestUpdatesData' => $requestUpdates,
        ]);
    }

    public function destroyRequestUpdate(Project $project, ClientUpdateRequest $clientUpdateRequest)
    {
        // Verify the request belongs to this project
        if ($clientUpdateRequest->project_id !== $project->id) {
            return redirect()->back()->with('error', 'Request update does not belong to this project.');
        }

        $clientUpdateRequest->delete();

        $this->adminActivityLogs('Client Update Request', 'Delete', 'Deleted request update for project '.$project->project_name);

        return redirect()->back()->with('success', 'Request update deleted successfully.');
    }
}
