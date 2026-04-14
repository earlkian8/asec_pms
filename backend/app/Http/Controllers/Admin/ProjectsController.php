<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\ClientType;
use App\Models\Project;
use App\Models\ProjectType;
use App\Models\ProjectTask;
use App\Enums\AssignmentStatus;
use App\Models\ProjectTeam;
use App\Models\ProjectMilestone;
use App\Models\ProjectMaterialAllocation;
use App\Models\ProjectLaborCost;
use App\Models\ProjectBoqSection;
use App\Models\ProjectBoqItem;
use App\Models\User;
use App\Models\Employee;
use App\Models\InventoryItem;
use App\Models\DirectSupply;
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
use Illuminate\Validation\ValidationException;

class ProjectsController extends Controller
{
    use ActivityLogsTrait, ClientNotificationTrait, NotificationTrait;

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

        $projects = Project::with(['client', 'projectType:id,name', 'milestones', 'milestones.tasks'])
            ->withExists('billings')
            ->whereNull('archived_at')
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('project_code', 'like', "%{$search}%")
                      ->orWhere('project_name', 'like', "%{$search}%")
                      ->orWhere('status', 'like', "%{$search}%")
                      ->orWhere('priority', 'like', "%{$search}%")
                      ->orWhereHas('client', fn ($cq) => $cq->where('client_name', 'like', "%{$search}%"))
                      ->orWhereHas('projectType', fn ($tq) => $tq->where('name', 'like', "%{$search}%"));
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

        // Calculate progress + expose billing flag per project
        $projects->getCollection()->transform(function ($project) {
            $totalMilestones = $project->milestones->count();
            
            if ($totalMilestones === 0) {
                $project->progress_percentage = 0;
            } else {
                $milestoneProgress = $project->milestones->map(function ($milestone) {
                    $tasks = $milestone->tasks ?? collect();
                    $totalTasks = $tasks->count();
                    
                    if ($totalTasks === 0) {
                        // Milestone with no tasks = 0% progress (not yet started)
                        return 0;
                    }
                    
                    $completedTasks = $tasks->where('status', 'completed')->count();
                    return ($completedTasks / $totalTasks) * 100;
                });
                
                $project->progress_percentage = round($milestoneProgress->avg(), 2);
            }

            $project->has_billings = (bool) ($project->billings_exists ?? false);
            return $project;
        });

        $stats = [
            'total'       => Project::whereNull('archived_at')->count(),
            'active'      => Project::whereNull('archived_at')->where('status', 'active')->count(),
            'completed'   => Project::whereNull('archived_at')->where('status', 'completed')->count(),
            'total_value' => Project::whereNull('archived_at')->sum('contract_amount'),
        ];

        $clients      = Client::orderBy('client_name')->where('is_active', true)->get();
        $projectTypes = ProjectType::where('is_active', true)->orderBy('name')->get(['id', 'name']);
        $clientTypes  = ClientType::where('is_active', true)->orderBy('name')->get(['id', 'name']);

        $users = User::with(['roles', 'currentCompensationProfile'])
            ->orderBy('first_name')->orderBy('last_name')
            ->get(['id', 'first_name', 'middle_name', 'last_name', 'email'])
            ->map(fn ($u) => [
            'id'    => $u->id,
            'name'  => $u->name,
            'email' => $u->email,
            'role'  => $u->roles->first()?->name ?? 'No Role',
            'compensation' => $u->resolved_compensation,
            'type'  => 'user',
        ]);

        // Employees with an active assignment in ANY project are excluded (rotation rule)
        // Users (contractors) are exempt — they can be on multiple projects
        // $occupiedEmployeeIds = ProjectTeam::occupied()
        //     ->whereNotNull('employee_id')
        //     ->pluck('employee_id')
        //     ->unique()->filter()->toArray();

        $employees = Employee::with('currentCompensationProfile')->where('is_active', true)
            // ->whereNotIn('id', $occupiedEmployeeIds)
            ->orderBy('first_name')->orderBy('last_name')
            ->get(['id', 'first_name', 'last_name', 'email', 'position'])
            ->map(fn ($e) => [
                'id'       => $e->id,
                'name'     => $e->first_name . ' ' . $e->last_name,
                'email'    => $e->email,
                'position' => $e->position ?? 'No Position',
                'compensation' => $e->resolved_compensation,
                'type'     => 'employee',
            ]);

        $allAssignables = $users->concat($employees)->sortBy('name')->values();

        // AFTER
        $inventoryItems = InventoryItem::where('is_active', true)->orderBy('item_name')->get(['id', 'item_code', 'item_name', 'current_stock', 'unit_of_measure']);
        $directSupplyItems = DirectSupply::where('is_active', true)->orderBy('supply_name')->get(['id', 'supply_code', 'supply_name', 'unit_of_measure', 'unit_price', 'supplier_name']);
        $statuses       = Project::whereNull('archived_at')->distinct()->whereNotNull('status')->pluck('status')->sort()->values();
        $priorities     = Project::whereNull('archived_at')->distinct()->whereNotNull('priority')->pluck('priority')->sort()->values();

        return Inertia::render('ProjectManagement/index', [
            'projects'          => $projects,
            'search'            => $search,
            'clients'           => $clients,
            'users'             => $allAssignables,
            'inventoryItems'    => $inventoryItems,
            'directSupplyItems' => $directSupplyItems,
            'projectTypes'      => $projectTypes,
            'clientTypes'       => $clientTypes,
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

    /**
     * Permanently delete a project — only allowed when it has no billing records.
     */
    public function destroy(Project $project)
    {
        $projectName = $project->project_name;

        $project->delete();

        $this->adminActivityLogs('Project', 'Delete', 'Deleted Project ' . $projectName);

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

    public function store(Request $request)
    {
        $validated = $request->validate([
            'project_name'     => ['required', 'max:255'],
            'client_id'        => ['required', 'exists:clients,id'],
            'project_type_id'  => ['required', 'exists:project_types,id'],
            'status'           => ['nullable', 'in:active,on_hold,completed,cancelled'],
            'priority'         => ['nullable', 'in:low,medium,high'],
            'contract_amount'  => ['required', 'numeric'],
            'start_date'       => ['required', 'date'],
            'planned_end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'actual_end_date'  => ['nullable', 'date'],
            'location'         => ['nullable', 'string'],
            'description'      => ['nullable', 'string'],
            'billing_type'     => ['nullable', 'in:fixed_price,milestone'],
            'building_permit'          => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:102400'],
            'business_permit'          => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:102400'],
            'environmental_compliance' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:102400'],
            'contractor_license'       => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:102400'],
            'surety_bond'              => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:102400'],
            'signed_contract'          => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:102400'],
            'notice_to_proceed'        => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:102400'],
            'team_members'                             => ['nullable', 'array'],
            'team_members.*.id'                        => ['required', 'integer'],
            'team_members.*.type'                      => ['required', 'in:user,employee'],
            'team_members.*.role'                      => ['required', 'string', 'max:50'],
            'team_members.*.pay_type'                  => ['nullable', 'in:hourly,salary,fixed'],
            'team_members.*.hourly_rate'               => ['nullable', 'numeric', 'min:0'],
            'team_members.*.monthly_salary'            => ['nullable', 'numeric', 'min:0'],
            'team_members.*.start_date'                => ['required', 'date'],
            'team_members.*.end_date'                  => ['required', 'date', 'after_or_equal:team_members.*.start_date'],
            'milestones'                               => ['nullable', 'array'],
            'milestones.*.name'                        => ['required', 'string', 'max:255'],
            'milestones.*.description'                 => ['nullable', 'string'],
            'milestones.*.start_date'                  => ['nullable', 'date'],
            'milestones.*.due_date'                    => ['nullable', 'date', 'after_or_equal:milestones.*.start_date'],
            'milestones.*.billing_percentage'          => ['nullable', 'numeric', 'min:0', 'max:100'],
            'milestones.*.status'                      => ['nullable', 'in:pending,in_progress,completed'],
            'material_allocations'                     => ['nullable', 'array'],
            'material_allocations.*.inventory_item_id' => ['nullable', 'exists:inventory_items,id'],
            'material_allocations.*.direct_supply_id'  => ['nullable', 'exists:direct_supplies,id'],
            'material_allocations.*.unit_price'        => ['nullable', 'numeric', 'min:0'],
            'material_allocations.*.quantity_allocated' => ['required', 'numeric', 'min:0.01'],
            'material_allocations.*.notes'             => ['nullable', 'string'],
            'material_allocations.*.boq_item_ref'      => ['nullable', 'string'],
            'labor_costs'                              => ['nullable', 'array'],
            'labor_costs.*.assignable_id'              => ['required', 'integer'],
            'labor_costs.*.assignable_type'            => ['required', 'in:user,employee'],
            'labor_costs.*.period_start' => ['required', 'date'],
            'labor_costs.*.period_end'   => ['required', 'date', 'after_or_equal:labor_costs.*.period_start'],
            'labor_costs.*.daily_rate'   => ['required', 'numeric', 'min:0'],
            'labor_costs.*.attendance'   => ['required', 'array'],
            'labor_costs.*.attendance.*' => ['required', 'in:P,A,HD'],
            'labor_costs.*.description'                => ['nullable', 'string', 'max:500'],
            'labor_costs.*.notes'                      => ['nullable', 'string'],
            'boq_sections'                                   => ['nullable', 'array'],
            'boq_sections.*.code'                            => ['nullable', 'string', 'max:50'],
            'boq_sections.*.name'                            => ['required', 'string', 'max:255'],
            'boq_sections.*.description'                     => ['nullable', 'string'],
            'boq_sections.*.sort_order'                      => ['nullable', 'integer', 'min:0'],
            'boq_sections.*.items'                           => ['nullable', 'array'],
            'boq_sections.*.items.*.item_code'               => ['nullable', 'string', 'max:50'],
            'boq_sections.*.items.*.description'             => ['required', 'string', 'max:500'],
            'boq_sections.*.items.*.unit'                    => ['nullable', 'string', 'max:30'],
            'boq_sections.*.items.*.quantity'                => ['nullable', 'numeric', 'min:0'],
            'boq_sections.*.items.*.unit_cost'               => ['nullable', 'numeric', 'min:0'],
            'boq_sections.*.items.*.resource_type'           => ['nullable', 'in:material,labor'],
            'boq_sections.*.items.*.planned_inventory_item_id' => ['nullable', 'exists:inventory_items,id'],
            'boq_sections.*.items.*.planned_direct_supply_id' => ['nullable', 'exists:direct_supplies,id'],
            'boq_sections.*.items.*.planned_user_id'         => ['nullable', 'exists:users,id'],
            'boq_sections.*.items.*.planned_employee_id'     => ['nullable', 'exists:employees,id'],
            'boq_sections.*.items.*.remarks'                 => ['nullable', 'string'],
            'boq_sections.*.items.*.sort_order'              => ['nullable', 'integer', 'min:0'],
        ]);

        DB::beginTransaction();
        try {
            $user = $request->user();
            $canCreateTeamMembers = $user?->can('project-teams.create') ?? false;
            $canCreateMilestones = $user?->can('project-milestones.create') ?? false;
            $canCreateMaterialAllocations = $user?->can('material-allocations.create') ?? false;
            $canCreateLaborCosts = $user?->can('labor-costs.create') ?? false;
            $canCreateBoq = $user?->can('project-boq.create') ?? false;
            $boqSections = $canCreateBoq ? ($validated['boq_sections'] ?? []) : [];

            if (!empty($boqSections)) {
                $boqPlannedTotal = $this->calculateBoqTotalFromSections($boqSections);
                $contractAmount = (float) ($validated['contract_amount'] ?? 0);

                if ($contractAmount > 0 && $boqPlannedTotal > $contractAmount) {
                    throw ValidationException::withMessages([
                        'boq_sections' => [
                            'BOQ total (' . number_format($boqPlannedTotal, 2) . ') exceeds contract amount (' . number_format($contractAmount, 2) . ').',
                        ],
                    ]);
                }
            }

            do {
                $random = str_pad(rand(1, 999999), 6, '0', STR_PAD_LEFT);
                $projectCode = 'PRJ-' . $random;
            } while (Project::where('project_code', $projectCode)->exists());

            $validated['project_code'] = $projectCode;
            $validated['status'] = $validated['status'] ?? 'active';

            foreach (self::DOCUMENT_FIELDS as $fieldName) {
                if ($request->hasFile($fieldName)) {
                    $directory = 'projects/documents/' . $projectCode;
                    $validated[$fieldName] = basename(
                        $request->file($fieldName)->store($directory, config('filesystems.default'))
                    );
                }
            }

            $project = Project::create($validated);
            $teamMembers = $canCreateTeamMembers ? ($validated['team_members'] ?? []) : [];
            $milestones = $canCreateMilestones ? ($validated['milestones'] ?? []) : [];
            $materialAllocations = $canCreateMaterialAllocations ? ($validated['material_allocations'] ?? []) : [];
            $laborCosts = $canCreateLaborCosts ? ($validated['labor_costs'] ?? []) : [];

            if (!empty($teamMembers)) {
                $teamCompensations = [];
                foreach ($teamMembers as $index => $member) {
                    if ($member['type'] === 'user' && !\App\Models\User::where('id', $member['id'])->exists()) {
                        throw \Illuminate\Validation\ValidationException::withMessages(["team_members.{$index}.id" => ['Invalid user.']]);
                    }
                    if ($member['type'] === 'employee' && !\App\Models\Employee::where('id', $member['id'])->where('is_active', true)->exists()) {
                        throw \Illuminate\Validation\ValidationException::withMessages(["team_members.{$index}.id" => ['Invalid employee.']]);
                    }
                    $teamCompensations[$index] = $this->resolveAssignableCompensation($member['type'], (int) $member['id']);
                    // Rotation guard: employees cannot be on two projects at once
                    // if ($member['type'] === 'employee') {
                    //     $occupied = ProjectTeam::occupied()
                    //         ->where('employee_id', $member['id'])
                    //         ->exists();
                    //     if ($occupied) {
                    //         throw \Illuminate\Validation\ValidationException::withMessages([
                    //             "team_members.{$index}.id" => ['This employee already has an active project assignment.'],
                    //         ]);
                    //     }
                    // }
                }
                foreach ($validated['team_members'] as $index => $member) {
                    $compensation = $teamCompensations[$index];
                    ProjectTeam::create([
                        'project_id'        => $project->id,
                        'user_id'           => $member['type'] === 'user' ? $member['id'] : null,
                        'employee_id'       => $member['type'] === 'employee' ? $member['id'] : null,
                        'assignable_type'   => $member['type'],
                        'role'              => $member['role'],
                        'pay_type'          => $compensation['pay_type'],
                        'hourly_rate'       => $compensation['hourly_rate'],
                        'monthly_salary'    => $compensation['monthly_salary'],
                        'start_date'        => $member['start_date'],
                        'end_date'          => $member['end_date'] ?? null,
                        'is_active'         => true,
                        'assignment_status' => AssignmentStatus::Active->value,
                    ]);
                }
            }

            $boqItemRefMap = [];
            if (!empty($boqSections)) {
                foreach ($boqSections as $sectionIndex => $section) {
                    $createdSection = ProjectBoqSection::create([
                        'project_id'  => $project->id,
                        'code'        => $section['code'] ?? null,
                        'name'        => $section['name'],
                        'description' => $section['description'] ?? null,
                        'sort_order'  => $section['sort_order'] ?? $sectionIndex,
                    ]);

                    foreach (($section['items'] ?? []) as $itemIndex => $item) {
                        $quantity = (float) ($item['quantity'] ?? 0);
                        $unitCost = (float) ($item['unit_cost'] ?? 0);

                        $createdItem = ProjectBoqItem::create([
                            'project_id'             => $project->id,
                            'project_boq_section_id' => $createdSection->id,
                            'item_code'              => $item['item_code'] ?? null,
                            'description'            => $item['description'],
                            'unit'                   => $item['unit'] ?? null,
                            'quantity'               => $quantity,
                            'unit_cost'              => $unitCost,
                            'total_cost'             => round($quantity * $unitCost, 2),
                            'resource_type'          => $item['resource_type'] ?? null,
                            'planned_inventory_item_id' => $item['planned_inventory_item_id'] ?? null,
                            'planned_direct_supply_id' => $item['planned_direct_supply_id'] ?? null,
                            'planned_user_id'        => $item['planned_user_id'] ?? null,
                            'planned_employee_id'    => $item['planned_employee_id'] ?? null,
                            'remarks'                => $item['remarks'] ?? null,
                            'sort_order'             => $item['sort_order'] ?? $itemIndex,
                        ]);

                        $boqItemRefMap["{$sectionIndex}:{$itemIndex}"] = $createdItem->id;
                    }
                }
            }

            if (!empty($milestones)) {
                foreach ($milestones as $milestone) {
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

            if (!empty($materialAllocations)) {
                foreach ($materialAllocations as $allocation) {
                    $boqItemId = null;
                    if (!empty($allocation['boq_item_ref']) && isset($boqItemRefMap[$allocation['boq_item_ref']])) {
                        $boqItemId = $boqItemRefMap[$allocation['boq_item_ref']];
                    }

                    ProjectMaterialAllocation::create([
                        'project_id'         => $project->id,
                        'boq_item_id'        => $boqItemId,
                        'inventory_item_id'  => $allocation['inventory_item_id'] ?? null,
                        'direct_supply_id'   => $allocation['direct_supply_id'] ?? null,
                        'unit_price'         => $allocation['unit_price'] ?? null,
                        'quantity_allocated' => $allocation['quantity_allocated'],
                        'quantity_received'  => 0,
                        'status'             => 'pending',
                        'allocated_by'       => auth()->id(),
                        'allocated_at'       => now(),
                        'notes'              => $allocation['notes'] ?? null,
                    ]);
                }
            }

            if (!empty($laborCosts)) {
                foreach ($laborCosts as $index => $laborCost) {
                    if ($laborCost['assignable_type'] === 'user' && !\App\Models\User::where('id', $laborCost['assignable_id'])->exists()) {
                        throw \Illuminate\Validation\ValidationException::withMessages(["labor_costs.{$index}.assignable_id" => ['Invalid user.']]);
                    }
                    if ($laborCost['assignable_type'] === 'employee' && !\App\Models\Employee::where('id', $laborCost['assignable_id'])->where('is_active', true)->exists()) {
                        throw \Illuminate\Validation\ValidationException::withMessages(["labor_costs.{$index}.assignable_id" => ['Invalid employee.']]);
                    }
                }
                foreach ($laborCosts as $laborCost) {
                    ProjectLaborCost::create([
                        'project_id'      => $project->id,
                        'user_id'         => $laborCost['assignable_type'] === 'user' ? $laborCost['assignable_id'] : null,
                        'employee_id'     => $laborCost['assignable_type'] === 'employee' ? $laborCost['assignable_id'] : null,
                        'assignable_type' => $laborCost['assignable_type'],
                        'period_start'    => $laborCost['period_start'],
                        'period_end'      => $laborCost['period_end'],
                        'daily_rate'      => $laborCost['daily_rate'],
                        'attendance'      => $laborCost['attendance'],
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
        } catch (ValidationException $e) {
            DB::rollBack();
            throw $e;
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
            'contract_amount'  => $hasBillings ? ['sometimes'] : ['required', 'numeric'],
            'start_date'       => ['required', 'date'],
            'planned_end_date' => ['required', 'date', 'after_or_equal:start_date'],
            'actual_end_date'  => ['nullable', 'date'],
            'location'         => ['nullable', 'string'],
            'description'      => ['nullable', 'string'],
            'billing_type'     => ['nullable', 'in:fixed_price,milestone'],
            'building_permit'          => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:102400'],
            'business_permit'          => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:102400'],
            'environmental_compliance' => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:102400'],
            'contractor_license'       => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:102400'],
            'surety_bond'              => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:102400'],
            'signed_contract'          => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:102400'],
            'notice_to_proceed'        => ['nullable', 'file', 'mimes:pdf,jpg,jpeg,png,webp,doc,docx', 'max:102400'],
        ]);

        $directory = 'projects/documents/' . $project->project_code;
        foreach (self::DOCUMENT_FIELDS as $fieldName) {
            if ($request->hasFile($fieldName)) {
                if ($project->{$fieldName}) {
                    Storage::disk(config('filesystems.default'))->delete($directory . '/' . $project->{$fieldName});
                }
                $validated[$fieldName] = basename(
                    $request->file($fieldName)->store($directory, config('filesystems.default'))
                );
            } else {
                unset($validated[$fieldName]);
            }
        }

        if ($hasBillings) {
            $validated['contract_amount'] = $project->contract_amount;
            $validated['billing_type']    = $project->billing_type;
        }

        $project->update($validated);

        $this->adminActivityLogs('Project', 'Update', 'Updated Project ' . $project->project_name);
        $this->createSystemNotification('general', 'Project Updated', "Project '{$project->project_name}' has been updated.", $project, route('project-management.view', $project->id));

        return redirect()->back()->with('success', 'Project updated successfully.');
    }

    public function show(Project $project, Request $request)
    {
        $project->load([
            'client',
            'projectType',
            'boqSections.items.plannedInventoryItem:id,item_name,item_code',
            'boqSections.items.plannedDirectSupply:id,supply_name,supply_code',
            'boqSections.items.plannedUser:id,first_name,last_name',
            'boqSections.items.plannedEmployee:id,first_name,last_name',
        ]);

        $resourceUsers = User::orderBy('first_name')->orderBy('last_name')
            ->get(['id', 'first_name', 'last_name'])
            ->map(fn ($u) => ['id' => $u->id, 'name' => trim(($u->first_name ?? '') . ' ' . ($u->last_name ?? ''))]);

        $resourceEmployees = Employee::where('is_active', true)
            ->orderBy('first_name')->orderBy('last_name')
            ->get(['id', 'first_name', 'last_name'])
            ->map(fn ($e) => ['id' => $e->id, 'name' => trim(($e->first_name ?? '') . ' ' . ($e->last_name ?? ''))]);

        $resourceInventoryItems = InventoryItem::where('is_active', true)
            ->orderBy('item_name')
            ->get(['id', 'item_code', 'item_name'])
            ->map(fn ($i) => ['id' => $i->id, 'name' => $i->item_name, 'code' => $i->item_code]);

        $resourceDirectSupplies = DirectSupply::where('is_active', true)
            ->orderBy('supply_name')
            ->get(['id', 'supply_code', 'supply_name'])
            ->map(fn ($s) => ['id' => $s->id, 'name' => $s->supply_name, 'code' => $s->supply_code]);

        $materialActualByItem = ProjectMaterialAllocation::query()
            ->where('project_id', $project->id)
            ->whereNotNull('boq_item_id')
            ->selectRaw('boq_item_id, SUM(COALESCE(unit_price, 0) * COALESCE(quantity_received, 0)) as total')
            ->groupBy('boq_item_id')
            ->pluck('total', 'boq_item_id');

        $laborActualByItem = ProjectLaborCost::query()
            ->where('project_id', $project->id)
            ->whereNotNull('boq_item_id')
            ->selectRaw('boq_item_id, SUM(COALESCE(gross_pay, 0)) as total')
            ->groupBy('boq_item_id')
            ->pluck('total', 'boq_item_id');

        $boqPlannedTotal = (float) $project->boqItems()->sum('total_cost');
        $boqActualMaterialTotal = (float) $materialActualByItem->sum();
        $boqActualLaborTotal = (float) $laborActualByItem->sum();
        $boqActualTotal = $boqActualMaterialTotal + $boqActualLaborTotal;
        $contractAmount = (float) $project->contract_amount;

        $boqData = [
            'sections' => $project->boqSections->map(function ($section) use ($materialActualByItem, $laborActualByItem) {
                $items = $section->items->map(function ($item) use ($materialActualByItem, $laborActualByItem) {
                    $plannedCost = (float) $item->total_cost;
                    $materialActual = (float) ($materialActualByItem[$item->id] ?? 0);
                    $laborActual = (float) ($laborActualByItem[$item->id] ?? 0);
                    $actualTotal = $materialActual + $laborActual;

                    return [
                        'id'          => $item->id,
                        'item_code'   => $item->item_code,
                        'description' => $item->description,
                        'unit'        => $item->unit,
                        'quantity'    => (float) $item->quantity,
                        'unit_cost'   => (float) $item->unit_cost,
                        'total_cost'  => $plannedCost,
                        'resource_type' => $item->resource_type,
                        'planned_inventory_item_id' => $item->planned_inventory_item_id,
                        'planned_direct_supply_id' => $item->planned_direct_supply_id,
                        'planned_user_id' => $item->planned_user_id,
                        'planned_employee_id' => $item->planned_employee_id,
                        'resource_link' => [
                            'inventory_item' => $item->plannedInventoryItem ? [
                                'id' => $item->plannedInventoryItem->id,
                                'code' => $item->plannedInventoryItem->item_code,
                                'name' => $item->plannedInventoryItem->item_name,
                            ] : null,
                            'direct_supply' => $item->plannedDirectSupply ? [
                                'id' => $item->plannedDirectSupply->id,
                                'code' => $item->plannedDirectSupply->supply_code,
                                'name' => $item->plannedDirectSupply->supply_name,
                            ] : null,
                            'user' => $item->plannedUser ? [
                                'id' => $item->plannedUser->id,
                                'name' => trim(($item->plannedUser->first_name ?? '') . ' ' . ($item->plannedUser->last_name ?? '')),
                            ] : null,
                            'employee' => $item->plannedEmployee ? [
                                'id' => $item->plannedEmployee->id,
                                'name' => trim(($item->plannedEmployee->first_name ?? '') . ' ' . ($item->plannedEmployee->last_name ?? '')),
                            ] : null,
                        ],
                        'remarks'     => $item->remarks,
                        'sort_order'  => $item->sort_order,
                        'planned_vs_actual' => [
                            'planned_cost'    => $plannedCost,
                            'material_actual' => $materialActual,
                            'labor_actual'    => $laborActual,
                            'total_actual'    => $actualTotal,
                            'variance'        => $plannedCost - $actualTotal,
                        ],
                    ];
                })->values();

                return [
                    'id'          => $section->id,
                    'code'        => $section->code,
                    'name'        => $section->name,
                    'description' => $section->description,
                    'sort_order'  => $section->sort_order,
                    'items'       => $items,
                ];
            })->values(),
            'grand_total'     => $boqPlannedTotal,
            'contract_amount' => $contractAmount,
            'actual_material_total' => $boqActualMaterialTotal,
            'actual_labor_total'    => $boqActualLaborTotal,
            'actual_total'          => $boqActualTotal,
            'boq_variance'          => $boqPlannedTotal - $boqActualTotal,
            'contract_variance'     => $contractAmount - $boqPlannedTotal,
            'is_over_contract'      => $contractAmount > 0 ? $boqPlannedTotal > $contractAmount : false,
            'resource_options' => [
                'inventory_items' => $resourceInventoryItems,
                'direct_supplies' => $resourceDirectSupplies,
                'users' => $resourceUsers,
                'employees' => $resourceEmployees,
            ],
        ];

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
            'boqData'                  => $boqData,
        ]);
    }

    private function calculateBoqTotalFromSections(array $sections): float
    {
        $total = 0.0;

        foreach ($sections as $section) {
            foreach (($section['items'] ?? []) as $item) {
                $quantity = (float) ($item['quantity'] ?? 0);
                $unitCost = (float) ($item['unit_cost'] ?? 0);
                $total += ($quantity * $unitCost);
            }
        }

        return round($total, 2);
    }

    private function resolveAssignableCompensation(string $assignableType, int $assignableId): array
    {
        if ($assignableType === 'user') {
            $profile = User::with('currentCompensationProfile')->find($assignableId)?->currentCompensationProfile;
        } else {
            $profile = Employee::with('currentCompensationProfile')->find($assignableId)?->currentCompensationProfile;
        }

        if (!$profile) {
            throw ValidationException::withMessages([
                'team_members' => ['Selected member has no active compensation profile. Please configure salary profile first.'],
            ]);
        }

        $resolvedPayType = $profile->pay_type === 'monthly' ? 'salary' : $profile->pay_type;

        return [
            'pay_type' => $resolvedPayType,
            'hourly_rate' => $profile->hourly_rate,
            'monthly_salary' => $profile->monthly_salary,
        ];
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

    public function serveDocument(Project $project, string $field)
    {
        if (!in_array($field, self::DOCUMENT_FIELDS)) {
            abort(404);
        }
        if (empty($project->{$field})) {
            abort(404);
        }
        $path = 'projects/documents/' . $project->project_code . '/' . $project->{$field};
        if (!Storage::disk(config('filesystems.default'))->exists($path)) {
            abort(404);
        }
        return Storage::disk(config('filesystems.default'))->response($path);
    }
}