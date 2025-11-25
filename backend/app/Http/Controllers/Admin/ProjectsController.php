<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\ProjectTeam;
use App\Models\ProjectMilestone;
use App\Models\ProjectMaterialAllocation;
use App\Models\ProjectLaborCost;
use App\Models\User;
use App\Models\InventoryItem;
use App\Traits\ActivityLogsTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use App\Services\ProjectTeamService;
use App\Services\ProjectFilesService;
use App\Services\ProjectMilestonesService;
use App\Services\TaskService;
use App\Services\ProgressUpdateService;
use App\Services\MaterialAllocationService;
use App\Services\LaborCostService;
use App\Services\ProjectOverviewService;
use App\Traits\ClientNotificationTrait;

class ProjectsController extends Controller
{
    use ActivityLogsTrait, ClientNotificationTrait;

    protected $projectTeamService;
    protected $projectFilesService;
    protected $projectMilestonesService;
    protected $projectTasksService;
    protected $progressUpdateService;
    protected $materialAllocationService;
    protected $laborCostService;
    protected $projectOverviewService;
    public function __construct(ProjectTeamService $projectTeamService, ProjectFilesService $projectFilesService, ProjectMilestonesService $projectMilestonesService, TaskService $projectTasksService, ProgressUpdateService $progressUpdateService, MaterialAllocationService $materialAllocationService, LaborCostService $laborCostService, ProjectOverviewService $projectOverviewService)
    {
        $this->projectTeamService = $projectTeamService;
        $this->projectFilesService = $projectFilesService;
        $this->projectMilestonesService = $projectMilestonesService;
        $this->projectTasksService = $projectTasksService;
        $this->progressUpdateService = $progressUpdateService;
        $this->materialAllocationService = $materialAllocationService;
        $this->laborCostService = $laborCostService;
        $this->projectOverviewService = $projectOverviewService;
    }
    public function index(Request $request)
    {
        $search = $request->input('search');
        $clientId = $request->input('client_id');
        $status = $request->input('status');
        $priority = $request->input('priority');
        $projectType = $request->input('project_type');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');

        // Validate sort column
        $allowedSortColumns = ['created_at', 'project_name', 'project_code', 'status', 'priority', 'contract_amount', 'start_date', 'planned_end_date'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'created_at';
        }

        // Validate sort order
        $sortOrder = in_array(strtolower($sortOrder), ['asc', 'desc']) ? strtolower($sortOrder) : 'desc';

        $projects = Project::with(['client', 'milestones.tasks'])
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('project_code', 'like', "%{$search}%")
                    ->orWhere('project_name', 'like', "%{$search}%")
                    ->orWhere('status', 'like', "%{$search}%")
                    ->orWhere('priority', 'like', "%{$search}%");
                });
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
                $query->where('project_type', $projectType);
            })
            ->when($startDate, function ($query, $startDate) {
                $query->whereDate('start_date', '>=', $startDate);
            })
            ->when($endDate, function ($query, $endDate) {
                $query->whereDate('planned_end_date', '<=', $endDate);
            })
            ->orderBy($sortBy, $sortOrder)
            ->paginate(10)
            ->withQueryString(); // keep search when paginating

        // Calculate progress for each project based on milestones
        $projects->getCollection()->transform(function ($project) {
            $milestones = $project->milestones;
            $totalMilestones = $milestones->count();
            $completedMilestones = $milestones->where('status', 'completed')->count();
            $project->progress_percentage = $totalMilestones > 0 
                ? round(($completedMilestones / $totalMilestones) * 100, 2) 
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
            ];
        });
        
        // Get inventory items for material allocation
        $inventoryItems = InventoryItem::where('is_active', true)
            ->orderBy('item_name')
            ->get(['id', 'item_code', 'item_name']); // 'unit_of_measure', 'unit_price', 'current_stock'

        // Get unique project types and statuses for filters
        $projectTypes = Project::distinct()->whereNotNull('project_type')->pluck('project_type')->sort()->values();
        $statuses = Project::distinct()->whereNotNull('status')->pluck('status')->sort()->values();
        $priorities = Project::distinct()->whereNotNull('priority')->pluck('priority')->sort()->values();

        return Inertia::render('ProjectManagement/index', [
            'projects'   => $projects,
            'search'     => $search,
            'clients'    => $clients,
            'users'      => $users,
            'inventoryItems' => $inventoryItems,
            'filters' => [
                'client_id' => $clientId,
                'status' => $status,
                'priority' => $priority,
                'project_type' => $projectType,
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

    public function store(Request $request)
    {
        $validated = $request->validate([
            // Project data
            'project_name'          => ['required', 'max:255'],
            'client_id'             => ['required', 'exists:clients,id'],
            'project_type'          => ['required', 'in:design,construction,consultancy,maintenance,structural,civil,mechanical,electrical,environmental,geotechnical,surveying'],
            'status'                => ['nullable', 'in:planning,active,on_hold,completed,cancelled'],
            'priority'              => ['nullable', 'in:low,medium,high'],
            'contract_amount'       => ['required', 'numeric'],
            'start_date'            => ['nullable', 'date'],
            'planned_end_date'      => ['nullable', 'date'],
            'actual_end_date'       => ['nullable', 'date'],
            'location'              => ['nullable', 'string'],
            'description'           => ['nullable', 'string'],
            'billing_type'          => ['nullable', 'in:fixed_price,milestone'],
            
            // Team members (optional)
            'team_members'          => ['nullable', 'array'],
            'team_members.*.id'     => ['required', 'exists:users,id'],
            'team_members.*.role'   => ['required', 'string', 'max:50'],
            'team_members.*.hourly_rate' => ['required', 'numeric', 'min:0'],
            'team_members.*.start_date'  => ['required', 'date'],
            'team_members.*.end_date'    => ['nullable', 'date', 'after_or_equal:team_members.*.start_date'],
            
            // Milestones (optional)
            'milestones'            => ['nullable', 'array'],
            'milestones.*.name'     => ['required', 'string', 'max:255'],
            'milestones.*.description' => ['nullable', 'string'],
            'milestones.*.start_date' => ['nullable', 'date'],
            'milestones.*.due_date' => ['nullable', 'date', 'after_or_equal:milestones.*.start_date'],
            'milestones.*.billing_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'milestones.*.status'   => ['nullable', 'in:pending,in_progress,completed'],
            
            // Material allocations (optional)
            'material_allocations' => ['nullable', 'array'],
            'material_allocations.*.inventory_item_id' => ['required', 'exists:inventory_items,id'],
            'material_allocations.*.quantity_allocated' => ['required', 'numeric', 'min:0.01'],
            'material_allocations.*.notes' => ['nullable', 'string'],
            
        ]);

        DB::beginTransaction();
        try {
            // Generate project code
            do {
                $random = str_pad(rand(1, 999999), 6, '0', STR_PAD_LEFT);
                $projectCode = 'PRJ-' . $random;
            } while (Project::where('project_code', $projectCode)->exists());

            $validated['project_code'] = $projectCode;

            // Create project
            $project = Project::create($validated);

            // Create team members
            if (!empty($validated['team_members'])) {
                foreach ($validated['team_members'] as $member) {
                    ProjectTeam::create([
                        'project_id'   => $project->id,
                        'user_id'      => $member['id'],
                        'role'         => $member['role'],
                        'hourly_rate'  => $member['hourly_rate'],
                        'start_date'   => $member['start_date'],
                        'end_date'     => $member['end_date'] ?? null,
                        'is_active'    => true,
                    ]);
                }
            }

            // Create milestones
            if (!empty($validated['milestones'])) {
                foreach ($validated['milestones'] as $milestone) {
                    ProjectMilestone::create([
                        'project_id'   => $project->id,
                        'name'         => $milestone['name'],
                        'description'  => $milestone['description'] ?? null,
                        'start_date'   => $milestone['start_date'] ?? null,
                        'due_date'     => $milestone['due_date'] ?? null,
                        'billing_percentage' => $milestone['billing_percentage'] ?? null,
                        'status'       => $milestone['status'] ?? 'pending',
                    ]);
                }
            }

            // Create material allocations
            if (!empty($validated['material_allocations'])) {
                foreach ($validated['material_allocations'] as $allocation) {
                    ProjectMaterialAllocation::create([
                        'project_id'        => $project->id,
                        'inventory_item_id' => $allocation['inventory_item_id'],
                        'quantity_allocated' => $allocation['quantity_allocated'],
                        'quantity_received' => 0,
                        'status'            => 'pending',
                        'allocated_by'      => auth()->id(),
                        'allocated_at'      => now(),
                        'notes'             => $allocation['notes'] ?? null,
                    ]);
                }
            }

            DB::commit();

            $this->adminActivityLogs('Project', 'Add', 'Added Project ' . $project->project_name . ' with team, milestones, materials, and labor costs');

            return redirect()->back()->with('success', 'Project created successfully with all related data.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Failed to create project: ' . $e->getMessage());
        }
    }
    public function update(Request $request, Project $project)
    {
        $validated = $request->validate([
            'project_name'          => ['required', 'max:255'],
            'client_id'             => ['required', 'exists:clients,id'],
            'project_type'          => ['required', 'in:design,construction,consultancy,maintenance,commissioning,inspection,renovation,site_layout,surveying,relocation,excavation'],
            'status'                => ['nullable', 'in:planning,active,on_hold,completed,cancelled'],
            'priority'              => ['nullable', 'in:low,medium,high'],
            'contract_amount'       => ['required', 'numeric'],
            'start_date'            => ['nullable', 'date'],
            'planned_end_date'      => ['nullable', 'date'],
            'actual_end_date'       => ['nullable', 'date'],
            'location'              => ['nullable', 'string'],
            'description'           => ['nullable', 'string'],
            'billing_type'          => ['nullable', 'in:fixed_price,milestone'],
        ]);

        // Check if status changed
        $oldStatus = $project->status;
        $newStatus = $validated['status'] ?? $oldStatus;

        // Update the project
        $project->update($validated);

        $this->adminActivityLogs('Project', 'Update', 'Updated Project ' . $project->project_name);

        // Create notification for client if status changed
        if ($oldStatus !== $newStatus) {
            $this->notifyProjectStatusChange($project, $oldStatus, $newStatus);
        }

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
    $teamData = $this->projectTeamService->getProjectTeamData($project);

    // Get project files data (kept for potential future use)
    $fileData = $this->projectFilesService->getProjectFilesData($project);

    // Get project milestones data (now includes tasks and progress updates)
    $milestoneData = $this->projectMilestonesService->getProjectMilestonesData($project);

    // Get material allocation data
    $materialAllocationData = $this->materialAllocationService->getProjectMaterialAllocationsData($project);

    // Get labor cost data
    $laborCostData = $this->laborCostService->getProjectLaborCostsData($project);

    // Get project overview data
    $overviewData = $this->projectOverviewService->getProjectOverviewData($project);

    return Inertia::render('ProjectManagement/project-detail', [
        'project' => $project,
        'teamData' => $teamData,
        'fileData' => $fileData,
        'milestoneData' => $milestoneData,
        'materialAllocationData' => $materialAllocationData,
        'laborCostData' => $laborCostData,
        'overviewData' => $overviewData,
    ]);
}

    

}
