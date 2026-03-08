<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\ClientType;
use App\Models\Project;
use App\Models\ProjectType;
use App\Models\ProjectTask;
use App\Models\ProjectTeam;
use App\Models\ProjectMilestone;
use App\Models\ProjectMaterialAllocation;
use App\Models\ProjectLaborCost;
use App\Models\User;
use App\Models\Employee;
use App\Models\InventoryItem;
use App\Models\ClientUpdateRequest;
use App\Traits\ActivityLogsTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use App\Services\ProjectTeamService;
use App\Services\ProjectFilesService;
use App\Services\ProjectMilestonesService;
use App\Services\TaskService;
use App\Services\ProgressUpdateService;
use App\Services\MaterialAllocationService;
use App\Services\LaborCostService;
use App\Services\MiscellaneousExpenseService;
use App\Services\ProjectOverviewService;
use App\Traits\ClientNotificationTrait;
use App\Traits\NotificationTrait;

class ProjectsController extends Controller
{
    use ActivityLogsTrait, ClientNotificationTrait, NotificationTrait;

    // All document field names
    const DOCUMENT_FIELDS = [
        'building_permit',
        'business_permit',
        'environmental_compliance',
        'contractor_license',
        'surety_bond',
        'signed_contract',
        'notice_to_proceed',
    ];

    protected $projectTeamService;
    protected $projectFilesService;
    protected $projectMilestonesService;
    protected $projectTasksService;
    protected $progressUpdateService;
    protected $materialAllocationService;
    protected $laborCostService;
    protected $miscellaneousExpenseService;
    protected $projectOverviewService;

    public function __construct(
        ProjectTeamService $projectTeamService,
        ProjectFilesService $projectFilesService,
        ProjectMilestonesService $projectMilestonesService,
        TaskService $projectTasksService,
        ProgressUpdateService $progressUpdateService,
        MaterialAllocationService $materialAllocationService,
        LaborCostService $laborCostService,
        MiscellaneousExpenseService $miscellaneousExpenseService,
        ProjectOverviewService $projectOverviewService
    ) {
        $this->projectTeamService = $projectTeamService;
        $this->projectFilesService = $projectFilesService;
        $this->projectMilestonesService = $projectMilestonesService;
        $this->projectTasksService = $projectTasksService;
        $this->progressUpdateService = $progressUpdateService;
        $this->materialAllocationService = $materialAllocationService;
        $this->laborCostService = $laborCostService;
        $this->miscellaneousExpenseService = $miscellaneousExpenseService;
        $this->projectOverviewService = $projectOverviewService;
    }

    public function index(Request $request)
    {
        $search        = $request->input('search');
        $clientId      = $request->input('client_id');
        $status        = $request->input('status');
        $priority      = $request->input('priority');
        $projectType   = $request->input('project_type_id');
        $startDate     = $request->input('start_date');
        $endDate       = $request->input('end_date');
        $sortBy        = $request->input('sort_by', 'created_at');
        $sortOrder     = $request->input('sort_order', 'desc');

        $allowedSortColumns = ['created_at', 'project_name', 'project_code', 'status', 'priority', 'contract_amount', 'start_date', 'planned_end_date'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'created_at';
        }
        $sortOrder = in_array(strtolower($sortOrder), ['asc', 'desc']) ? strtolower($sortOrder) : 'desc';

        $projects = Project::with(['client', 'projectType:id,name', 'milestones.tasks'])
            ->whereNull('archived_at')
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('project_code', 'like', "%{$search}%")
                      ->orWhere('project_name', 'like', "%{$search}%")
                      ->orWhere('status', 'like', "%{$search}%")
                      ->orWhere('priority', 'like', "%{$search}%");
                });
            })
            ->when($clientId,    fn ($q, $v) => $q->where('client_id', $v))
            ->when($status,      fn ($q, $v) => $q->where('status', $v))
            ->when($priority,    fn ($q, $v) => $q->where('priority', $v))
            ->when($projectType, fn ($q, $v) => $q->where('project_type_id', $v))
            ->when($startDate,   fn ($q, $v) => $q->whereDate('start_date', '>=', $v))
            ->when($endDate,     fn ($q, $v) => $q->whereDate('planned_end_date', '<=', $v))
            ->orderBy($sortBy, $sortOrder)
            ->when($sortBy !== 'created_at', fn ($q) => $q->orderBy('created_at', 'desc'))
            ->paginate(10);

        // Calculate progress percentage from tasks
        $projects->getCollection()->transform(function ($project) {
            $allTasks = collect();
            foreach ($project->milestones as $milestone) {
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

        // Global stats (not page-bound, excludes archived)
        $stats = [
            'total'       => Project::whereNull('archived_at')->count(),
            'active'      => Project::whereNull('archived_at')->where('status', 'active')->count(),
            'completed'   => Project::whereNull('archived_at')->where('status', 'completed')->count(),
            'total_value' => Project::whereNull('archived_at')->sum('contract_amount'),
        ];

        $clients      = Client::orderBy('client_name')->where('is_active', true)->get();
        $projectTypes = ProjectType::where('is_active', true)->orderBy('name')->get(['id', 'name']);
        $clientTypes  = ClientType::where('is_active', true)->orderBy('name')->get(['id', 'name']);

        $users = User::with('roles')->orderBy('name')->get(['id', 'name', 'email'])->map(fn ($u) => [
            'id'    => $u->id,
            'name'  => $u->name,
            'email' => $u->email,
            'role'  => $u->roles->first()?->name ?? 'No Role',
            'type'  => 'user',
        ]);

        $employees = Employee::where('is_active', true)->orderBy('first_name')->orderBy('last_name')
            ->get(['id', 'first_name', 'last_name', 'email', 'position'])
            ->map(fn ($e) => [
                'id'       => $e->id,
                'name'     => $e->first_name . ' ' . $e->last_name,
                'email'    => $e->email,
                'position' => $e->position ?? 'No Position',
                'type'     => 'employee',
            ]);

        $allAssignables = $users->concat($employees)->sortBy('name')->values();

        $inventoryItems = InventoryItem::where('is_active', true)->orderBy('item_name')->get(['id', 'item_code', 'item_name']);
        $statuses       = Project::whereNull('archived_at')->distinct()->whereNotNull('status')->pluck('status')->sort()->values();
        $priorities     = Project::whereNull('archived_at')->distinct()->whereNotNull('priority')->pluck('priority')->sort()->values();

        return Inertia::render('ProjectManagement/index', [
            'projects'       => $projects,
            'search'         => $search,
            'clients'        => $clients,
            'users'          => $allAssignables,
            'inventoryItems' => $inventoryItems,
            'projectTypes'   => $projectTypes,
            'clientTypes'    => $clientTypes,
            'stats'          => $stats,
            'filters'        => [
                'client_id'       => $clientId,
                'status'          => $status,
                'priority'        => $priority,
                'project_type_id' => $projectType,
                'start_date'      => $startDate,
                'end_date'        => $endDate,
            ],
            'filterOptions' => [
                'projectTypes' => $projectTypes,
                'statuses'     => $statuses,
                'priorities'   => $priorities,
            ],
            'sort_by'    => $sortBy,
            'sort_order' => $sortOrder,
        ]);
    }

    public function archived(Request $request)
    {
        $search    = $request->input('search');
        $sortBy    = $request->input('sort_by', 'archived_at');
        $sortOrder = $request->input('sort_order', 'desc');

        $allowedSortColumns = ['archived_at', 'project_name', 'project_code', 'status', 'contract_amount', 'start_date'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'archived_at';
        }
        $sortOrder = in_array(strtolower($sortOrder), ['asc', 'desc']) ? strtolower($sortOrder) : 'desc';

        $projects = Project::with(['client', 'projectType:id,name'])
            ->whereNotNull('archived_at')
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('project_code', 'like', "%{$search}%")
                      ->orWhere('project_name', 'like', "%{$search}%")
                      ->orWhere('status', 'like', "%{$search}%");
                });
            })
            ->orderBy($sortBy, $sortOrder)
            ->paginate(10);

        return Inertia::render('ProjectManagement/archived', [
            'projects'   => $projects,
            'search'     => $search,
            'sort_by'    => $sortBy,
            'sort_order' => $sortOrder,
        ]);
    }

    public function archive(Project $project)
    {
        if ($project->archived_at) {
            return redirect()->back()->with('error', 'Project is already archived.');
        }

        $project->update(['archived_at' => now()]);

        $this->adminActivityLogs('Project', 'Archive', 'Archived Project ' . $project->project_name);
        $this->createSystemNotification('general', 'Project Archived', "Project '{$project->project_name}' has been archived.", $project, route('project-management.archived'));

        return redirect()->back()->with('success', 'Project archived successfully.');
    }

    public function unarchive(Project $project)
    {
        if (!$project->archived_at) {
            return redirect()->back()->with('error', 'Project is not archived.');
        }

        $project->update(['archived_at' => null]);

        $this->adminActivityLogs('Project', 'Unarchive', 'Restored Project ' . $project->project_name);
        $this->createSystemNotification('general', 'Project Restored', "Project '{$project->project_name}' has been restored.", $project, route('project-management.view', $project->id));

        return redirect()->back()->with('success', 'Project restored successfully.');
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'project_name'     => ['required', 'max:255'],
            'client_id'        => ['required', 'exists:clients,id'],
            'project_type_id'  => ['required', 'exists:project_types,id'],
            'status'           => ['nullable', 'in:active,on_hold,completed,cancelled'],
            'priority'         => ['nullable', 'in:low,medium,high'],
            'contract_amount'  => ['required', 'numeric'],
            'start_date'       => ['nullable', 'date'],
            'planned_end_date' => ['nullable', 'date'],
            'actual_end_date'  => ['nullable', 'date'],
            'location'         => ['nullable', 'string'],
            'description'      => ['nullable', 'string'],
            'billing_type'     => ['nullable', 'in:fixed_price,milestone'],
            // Documents
            'building_permit'          => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:10240'],
            'business_permit'          => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:10240'],
            'environmental_compliance' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:10240'],
            'contractor_license'       => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:10240'],
            'surety_bond'              => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:10240'],
            'signed_contract'          => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:10240'],
            'notice_to_proceed'        => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:10240'],
            // Relations
            'team_members'                             => ['nullable', 'array'],
            'team_members.*.id'                        => ['required', 'integer'],
            'team_members.*.type'                      => ['required', 'in:user,employee'],
            'team_members.*.role'                      => ['required', 'string', 'max:50'],
            'team_members.*.hourly_rate'               => ['required', 'numeric', 'min:0'],
            'team_members.*.start_date'                => ['required', 'date'],
            'team_members.*.end_date'                  => ['nullable', 'date', 'after_or_equal:team_members.*.start_date'],
            'milestones'                               => ['nullable', 'array'],
            'milestones.*.name'                        => ['required', 'string', 'max:255'],
            'milestones.*.description'                 => ['nullable', 'string'],
            'milestones.*.start_date'                  => ['nullable', 'date'],
            'milestones.*.due_date'                    => ['nullable', 'date', 'after_or_equal:milestones.*.start_date'],
            'milestones.*.billing_percentage'          => ['nullable', 'numeric', 'min:0', 'max:100'],
            'milestones.*.status'                      => ['nullable', 'in:pending,in_progress,completed'],
            'material_allocations'                     => ['nullable', 'array'],
            'material_allocations.*.inventory_item_id' => ['required', 'exists:inventory_items,id'],
            'material_allocations.*.quantity_allocated' => ['required', 'numeric', 'min:0.01'],
            'material_allocations.*.notes'             => ['nullable', 'string'],
            'labor_costs'                              => ['nullable', 'array'],
            'labor_costs.*.assignable_id'              => ['required', 'integer'],
            'labor_costs.*.assignable_type'            => ['required', 'in:user,employee'],
            'labor_costs.*.work_date'                  => ['required', 'date'],
            'labor_costs.*.hours_worked'               => ['required', 'numeric', 'min:0.01'],
            'labor_costs.*.hourly_rate'                => ['required', 'numeric', 'min:0'],
            'labor_costs.*.description'                => ['nullable', 'string', 'max:500'],
            'labor_costs.*.notes'                      => ['nullable', 'string'],
        ]);

        DB::beginTransaction();
        try {
            // Generate project code
            do {
                $random = str_pad(rand(1, 999999), 6, '0', STR_PAD_LEFT);
                $projectCode = 'PRJ-' . $random;
            } while (Project::where('project_code', $projectCode)->exists());

            $validated['project_code'] = $projectCode;

            // Handle document uploads
            foreach (self::DOCUMENT_FIELDS as $fieldName) {
                if ($request->hasFile($fieldName)) {
                    $directory = 'projects/documents/' . $projectCode;
                    $validated[$fieldName] = basename(
                        $request->file($fieldName)->store($directory, env('FILESYSTEM_DISK', 'public'))
                    );
                }
            }

            $project = Project::create($validated);

            // Team members
            if (!empty($validated['team_members'])) {
                foreach ($validated['team_members'] as $index => $member) {
                    if ($member['type'] === 'user' && !\App\Models\User::where('id', $member['id'])->exists()) {
                        throw \Illuminate\Validation\ValidationException::withMessages(["team_members.{$index}.id" => ['Invalid user.']]);
                    }
                    if ($member['type'] === 'employee' && !\App\Models\Employee::where('id', $member['id'])->where('is_active', true)->exists()) {
                        throw \Illuminate\Validation\ValidationException::withMessages(["team_members.{$index}.id" => ['Invalid employee.']]);
                    }
                }
                foreach ($validated['team_members'] as $member) {
                    ProjectTeam::create([
                        'project_id'      => $project->id,
                        'user_id'         => $member['type'] === 'user' ? $member['id'] : null,
                        'employee_id'     => $member['type'] === 'employee' ? $member['id'] : null,
                        'assignable_type' => $member['type'],
                        'role'            => $member['role'],
                        'hourly_rate'     => $member['hourly_rate'],
                        'start_date'      => $member['start_date'],
                        'end_date'        => $member['end_date'] ?? null,
                        'is_active'       => true,
                    ]);
                }
            }

            // Milestones
            if (!empty($validated['milestones'])) {
                foreach ($validated['milestones'] as $milestone) {
                    ProjectMilestone::create([
                        'project_id'         => $project->id,
                        'name'               => $milestone['name'],
                        'description'        => $milestone['description'] ?? null,
                        'start_date'         => $milestone['start_date'] ?? null,
                        'due_date'           => $milestone['due_date'] ?? null,
                        'billing_percentage' => $milestone['billing_percentage'] ?? null,
                        'status'             => $milestone['status'] ?? 'pending',
                    ]);
                }
            }

            // Material allocations
            if (!empty($validated['material_allocations'])) {
                foreach ($validated['material_allocations'] as $allocation) {
                    ProjectMaterialAllocation::create([
                        'project_id'         => $project->id,
                        'inventory_item_id'  => $allocation['inventory_item_id'],
                        'quantity_allocated' => $allocation['quantity_allocated'],
                        'quantity_received'  => 0,
                        'status'             => 'pending',
                        'allocated_by'       => auth()->id(),
                        'allocated_at'       => now(),
                        'notes'              => $allocation['notes'] ?? null,
                    ]);
                }
            }

            // Labor costs
            if (!empty($validated['labor_costs'])) {
                foreach ($validated['labor_costs'] as $index => $laborCost) {
                    if ($laborCost['assignable_type'] === 'user' && !\App\Models\User::where('id', $laborCost['assignable_id'])->exists()) {
                        throw \Illuminate\Validation\ValidationException::withMessages(["labor_costs.{$index}.assignable_id" => ['Invalid user.']]);
                    }
                    if ($laborCost['assignable_type'] === 'employee' && !\App\Models\Employee::where('id', $laborCost['assignable_id'])->where('is_active', true)->exists()) {
                        throw \Illuminate\Validation\ValidationException::withMessages(["labor_costs.{$index}.assignable_id" => ['Invalid employee.']]);
                    }
                }
                foreach ($validated['labor_costs'] as $laborCost) {
                    ProjectLaborCost::create([
                        'project_id'      => $project->id,
                        'user_id'         => $laborCost['assignable_type'] === 'user' ? $laborCost['assignable_id'] : null,
                        'employee_id'     => $laborCost['assignable_type'] === 'employee' ? $laborCost['assignable_id'] : null,
                        'assignable_type' => $laborCost['assignable_type'],
                        'work_date'       => $laborCost['work_date'],
                        'hours_worked'    => $laborCost['hours_worked'],
                        'hourly_rate'     => $laborCost['hourly_rate'],
                        'description'     => $laborCost['description'] ?? null,
                        'notes'           => $laborCost['notes'] ?? null,
                        'created_by'      => auth()->id(),
                    ]);
                }
            }

            DB::commit();

            $this->adminActivityLogs('Project', 'Add', 'Added Project ' . $project->project_name);
            $this->createSystemNotification('general', 'New Project Created', "A new project '{$project->project_name}' has been created.", $project, route('project-management.view', $project->id));

            return redirect()->back()->with('success', 'Project created successfully.');
        } catch (\Exception $e) {
            DB::rollBack();
            return redirect()->back()->with('error', 'Failed to create project: ' . $e->getMessage());
        }
    }

    public function update(Request $request, Project $project)
    {
        $hasBillings = $project->billings()->exists();

        $validated = $request->validate([
            'project_name'     => ['required', 'max:255'],
            'client_id'        => ['required', 'exists:clients,id'],
            'project_type_id'  => ['required', 'exists:project_types,id'],
            'status'           => ['nullable', 'in:active,on_hold,completed,cancelled'],
            'priority'         => ['nullable', 'in:low,medium,high'],
            // contract_amount only editable when no billings
            'contract_amount'  => $hasBillings ? ['sometimes'] : ['required', 'numeric'],
            'start_date'       => ['nullable', 'date'],
            'planned_end_date' => ['nullable', 'date'],
            'actual_end_date'  => ['nullable', 'date'],
            'location'         => ['nullable', 'string'],
            'description'      => ['nullable', 'string'],
            'billing_type'     => ['nullable', 'in:fixed_price,milestone'],
            // Documents
            'building_permit'          => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:10240'],
            'business_permit'          => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:10240'],
            'environmental_compliance' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:10240'],
            'contractor_license'       => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:10240'],
            'surety_bond'              => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:10240'],
            'signed_contract'          => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:10240'],
            'notice_to_proceed'        => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:10240'],
        ]);

        // Handle document uploads — always delete old file first, then store new one
        $directory = 'projects/documents/' . $project->project_code;
        foreach (self::DOCUMENT_FIELDS as $fieldName) {
            if ($request->hasFile($fieldName)) {
                if ($project->{$fieldName}) {
                    Storage::disk(env('FILESYSTEM_DISK', 'public'))->delete($directory . '/' . $project->{$fieldName});
                }
                $validated[$fieldName] = basename(
                    $request->file($fieldName)->store($directory, env('FILESYSTEM_DISK', 'public'))
                );
            } else {
                unset($validated[$fieldName]);
            }
        }

        // Preserve contract_amount if locked
        if ($hasBillings) {
            $validated['contract_amount'] = $project->contract_amount;
        }

        $project->update($validated);

        $this->adminActivityLogs('Project', 'Update', 'Updated Project ' . $project->project_name);
        $this->createSystemNotification('general', 'Project Updated', "Project '{$project->project_name}' has been updated.", $project, route('project-management.view', $project->id));

        return redirect()->back()->with('success', 'Project updated successfully.');
    }

    public function show(Project $project, Request $request)
    {
        $project->load(['client', 'projectType']);

        $teamData                 = $this->projectTeamService->getProjectTeamData($project);
        $fileData                 = $this->projectFilesService->getProjectFilesData($project);
        $milestoneData            = $this->projectMilestonesService->getProjectMilestonesData($project);
        $materialAllocationData   = $this->materialAllocationService->getProjectMaterialAllocationsData($project);
        $laborCostData            = $this->laborCostService->getProjectLaborCostsData($project);
        $miscellaneousExpenseData = $this->miscellaneousExpenseService->getProjectMiscellaneousExpensesData($project);
        $overviewData             = $this->projectOverviewService->getProjectOverviewData($project);
        $requestUpdates           = ClientUpdateRequest::with(['client'])->where('project_id', $project->id)->orderBy('created_at', 'desc')->get();

        return Inertia::render('ProjectManagement/project-detail', [
            'project'                  => $project,
            'teamData'                 => $teamData,
            'fileData'                 => $fileData,
            'milestoneData'            => $milestoneData,
            'materialAllocationData'   => $materialAllocationData,
            'laborCostData'            => $laborCostData,
            'miscellaneousExpenseData' => $miscellaneousExpenseData,
            'overviewData'             => $overviewData,
            'requestUpdatesData'       => $requestUpdates,
        ]);
    }

    public function destroyRequestUpdate(Project $project, ClientUpdateRequest $clientUpdateRequest)
    {
        if ($clientUpdateRequest->project_id !== $project->id) {
            return redirect()->back()->with('error', 'Request update does not belong to this project.');
        }
        $clientUpdateRequest->delete();
        $this->adminActivityLogs('Client Update Request', 'Delete', 'Deleted request update for project ' . $project->project_name);
        return redirect()->back()->with('success', 'Request update deleted successfully.');
    }

    /**
     * Serve a private document file (streaming download/view).
     */
    public function serveDocument(Project $project, string $field)
    {
        if (!in_array($field, self::DOCUMENT_FIELDS)) {
            abort(404);
        }
        if (empty($project->{$field})) {
            abort(404);
        }
        $path = 'projects/documents/' . $project->project_code . '/' . $project->{$field};
        if (!Storage::disk(env('FILESYSTEM_DISK', 'public'))->exists($path)) {
            abort(404);
        }
        return Storage::disk(env('FILESYSTEM_DISK', 'public'))->response($path);
    }
}