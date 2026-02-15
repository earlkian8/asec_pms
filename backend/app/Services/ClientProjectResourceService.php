<?php

namespace App\Services;

use App\Models\ClientUpdateRequest;
use App\Models\Project;
use App\Models\ProjectLaborCost;
use App\Models\ProjectMiscellaneousExpense;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

/**
 * Builds client-facing project DTOs for list, detail, and export.
 */
class ClientProjectResourceService
{
    private const STATUS_MAP = [
        'active' => 'active',
        'on_hold' => 'on-hold',
        'completed' => 'completed',
        'cancelled' => 'on-hold',
    ];

    private const STATUS_MAP_LABELS = [
        'active' => 'Active',
        'on_hold' => 'On Hold',
        'completed' => 'Completed',
        'cancelled' => 'On Hold',
    ];

    public function getProgress(Project $project): int
    {
        $milestones = $project->milestones;
        if ($milestones->count() === 0) {
            return 0;
        }
        $totalProgress = $milestones->sum(function ($milestone) {
            $tasks = $milestone->tasks ?? collect();
            if ($tasks->count() > 0) {
                $completedTasks = $tasks->where('status', 'completed')->count();

                return ($completedTasks / $tasks->count()) * 100;
            }

            return $milestone->status === 'completed' ? 100 : ($milestone->status === 'in_progress' ? 50 : 0);
        });

        return (int) round($totalProgress / $milestones->count());
    }

    /**
     * Compute spent for a single project (material + labor + miscellaneous).
     */
    public function getSpent(Project $project): float
    {
        $projectId = $project->id;
        $materialCosts = DB::table('project_material_allocations')
            ->join('inventory_items', 'project_material_allocations.inventory_item_id', '=', 'inventory_items.id')
            ->where('project_material_allocations.project_id', $projectId)
            ->where('project_material_allocations.quantity_received', '>', 0)
            ->sum(DB::raw('project_material_allocations.quantity_received * inventory_items.unit_price'));

        $laborCosts = ProjectLaborCost::where('project_id', $projectId)
            ->sum(DB::raw('hours_worked * hourly_rate'));

        $miscellaneousExpenses = ProjectMiscellaneousExpense::where('project_id', $projectId)
            ->sum('amount');

        return (float) $materialCosts + (float) $laborCosts + (float) $miscellaneousExpenses;
    }

    public function getProjectManagerName(Project $project): string
    {
        $projectManager = $project->team
            ->where('role', 'Project Manager')
            ->where('is_active', true)
            ->first();

        if (! $projectManager) {
            return 'N/A';
        }
        if ($projectManager->user) {
            return $projectManager->user->name;
        }
        if ($projectManager->employee) {
            return $projectManager->employee->full_name;
        }

        return 'N/A';
    }

    public function statusForClient(string $backendStatus): string
    {
        return self::STATUS_MAP[$backendStatus] ?? 'active';
    }

    public function statusLabelForExport(string $backendStatus): string
    {
        return self::STATUS_MAP_LABELS[$backendStatus] ?? 'Active';
    }

    /**
     * List item for /dashboard/projects response.
     */
    public function toListItem(Project $project, float $materialCost, float $laborCost, float $miscellaneousExpense): array
    {
        $spent = $materialCost + $laborCost + $miscellaneousExpense;

        return [
            'id' => (string) $project->id,
            'name' => $project->project_name,
            'description' => $project->description ?? '',
            'status' => $this->statusForClient($project->status),
            'progress' => $this->getProgress($project),
            'startDate' => $project->start_date,
            'expectedCompletion' => $project->planned_end_date,
            'budget' => (float) $project->contract_amount,
            'spent' => $spent,
            'location' => $project->location ?? '',
            'projectManager' => $this->getProjectManagerName($project),
        ];
    }

    /**
     * Single row for CSV/JSON export.
     */
    public function toExportRow(Project $project, float $materialCost, float $laborCost, float $miscellaneousExpense): array
    {
        $spent = $materialCost + $laborCost + $miscellaneousExpense;

        return [
            'Project Name' => $project->project_name,
            'Status' => $this->statusLabelForExport($project->status),
            'Progress (%)' => $this->getProgress($project),
            'Location' => $project->location ?? '',
            'Project Manager' => $this->getProjectManagerName($project),
            'Budget (PHP)' => (float) $project->contract_amount,
            'Spent (PHP)' => $spent,
            'Remaining (PHP)' => (float) ($project->contract_amount - $spent),
            'Start Date' => $project->start_date ? date('Y-m-d', strtotime($project->start_date)) : '',
            'Expected Completion' => $project->planned_end_date ? date('Y-m-d', strtotime($project->planned_end_date)) : '',
            'Description' => $project->description ?? '',
        ];
    }

    /**
     * Full project detail payload for client API.
     * Project must be loaded with: team.user, team.employee, milestones.tasks.assignedUser,
     * milestones.tasks.progressUpdates.createdBy, materialAllocations.inventoryItem/allocatedBy,
     * laborCosts.user/employee, miscellaneousExpenses.createdBy, issues.reportedBy/assignedTo/milestone/task.
     *
     * @param  string|null  $baseUrl  Base URL for progress update file links (e.g. https://host)
     */
    public function toDetail(Project $project, int $clientId, ?string $baseUrl = null): array
    {
        $progress = $this->getProgress($project);
        $costs = $this->getSpentComponents($project);
        $materialCosts = $costs['material'];
        $laborCosts = $costs['labor'];
        $miscellaneousExpenses = $costs['miscellaneous'];
        $spent = $materialCosts + $laborCosts + $miscellaneousExpenses;

        $milestones = $project->milestones;
        $formattedMilestones = $milestones->map(function ($milestone) {
            $tasks = $milestone->tasks->map(function ($task) {
                $progressUpdates = $task->progressUpdates->map(function ($update) {
                    return [
                        'id' => (string) $update->id,
                        'description' => $update->description,
                        'author' => $update->createdBy ? $update->createdBy->name : 'Unknown',
                        'date' => $update->created_at->toISOString(),
                    ];
                })->sortByDesc('date')->values();

                return [
                    'id' => (string) $task->id,
                    'name' => $task->title,
                    'description' => $task->description ?? '',
                    'status' => $task->status === 'completed' ? 'completed' : ($task->status === 'in_progress' ? 'in-progress' : 'pending'),
                    'assignedTo' => $task->assignedUser ? $task->assignedUser->name : 'Unassigned',
                    'dueDate' => $task->due_date,
                ];
            });

            return [
                'id' => (string) $milestone->id,
                'name' => $milestone->name,
                'description' => $milestone->description ?? '',
                'status' => $milestone->status === 'completed' ? 'completed' : ($milestone->status === 'in_progress' ? 'in-progress' : 'pending'),
                'progress' => $tasks->count() > 0
                    ? round(($tasks->where('status', 'completed')->count() / $tasks->count()) * 100)
                    : ($milestone->status === 'completed' ? 100 : ($milestone->status === 'in_progress' ? 50 : 0)),
                'dueDate' => $milestone->due_date,
                'completedDate' => $milestone->status === 'completed' ? $milestone->updated_at->toDateString() : null,
                'tasks' => $tasks,
            ];
        });

        $requestUpdates = ClientUpdateRequest::where('project_id', $project->id)
            ->where('client_id', $clientId)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($req) {
                return [
                    'id' => (string) $req->id,
                    'title' => $req->subject,
                    'description' => $req->message,
                    'type' => 'request',
                    'author' => 'You',
                    'date' => $req->created_at->toISOString(),
                ];
            });

        $allProgressUpdates = collect();
        foreach ($project->milestones as $milestone) {
            foreach ($milestone->tasks as $task) {
                foreach ($task->progressUpdates as $update) {
                    $fileData = null;
                    if ($update->file_path && $baseUrl) {
                        if (Storage::disk('public')->exists($update->file_path)) {
                            $fileData = [
                                'path' => $update->file_path,
                                'type' => $update->file_type,
                                'name' => $update->original_name,
                                'size' => $update->file_size,
                                'url' => $baseUrl.'/storage/'.$update->file_path,
                            ];
                        }
                    }
                    $allProgressUpdates->push([
                        'id' => (string) $update->id,
                        'title' => 'Progress Update - '.$task->title,
                        'description' => $update->description,
                        'type' => 'progress',
                        'author' => $update->createdBy ? $update->createdBy->name : 'Unknown',
                        'date' => $update->created_at->toISOString(),
                        'taskId' => (string) $task->id,
                        'taskName' => $task->title,
                        'milestoneId' => (string) $milestone->id,
                        'milestoneName' => $milestone->name,
                        'file' => $fileData,
                    ]);
                }
            }
        }
        $allProgressUpdates = $allProgressUpdates->sortByDesc('date')->values();

        $formattedIssues = $project->issues->map(function ($issue) {
            return [
                'id' => (string) $issue->id,
                'title' => $issue->title,
                'description' => $issue->description ?? '',
                'priority' => $issue->priority ?? 'medium',
                'status' => $issue->status ?? 'open',
                'reportedBy' => $issue->reportedBy ? $issue->reportedBy->name : 'Unknown',
                'assignedTo' => $issue->assignedTo ? $issue->assignedTo->name : 'Unassigned',
                'dueDate' => $issue->due_date ? $issue->due_date->toDateString() : null,
                'resolvedAt' => $issue->resolved_at ? $issue->resolved_at->toDateString() : null,
                'milestoneId' => $issue->project_milestone_id ? (string) $issue->project_milestone_id : null,
                'milestoneName' => $issue->milestone?->name,
                'taskId' => $issue->project_task_id ? (string) $issue->project_task_id : null,
                'taskName' => $issue->task?->title,
                'createdAt' => $issue->created_at->toISOString(),
            ];
        })->sortByDesc('createdAt')->values();

        $formattedMaterialAllocations = $project->materialAllocations->map(function ($allocation) {
            $item = $allocation->inventoryItem;
            $unitPrice = $item ? (float) $item->unit_price : 0;
            $totalCost = (float) ($allocation->quantity_received * $unitPrice);

            return [
                'id' => (string) $allocation->id,
                'itemName' => $item ? $item->item_name : 'Unknown Item',
                'itemCode' => $item ? $item->item_code : 'N/A',
                'unit' => $item ? $item->unit : 'N/A',
                'quantityAllocated' => (float) $allocation->quantity_allocated,
                'quantityReceived' => (float) $allocation->quantity_received,
                'quantityRemaining' => (float) $allocation->quantity_remaining,
                'status' => $allocation->status,
                'unitPrice' => $unitPrice,
                'totalCost' => $totalCost,
                'allocatedBy' => $allocation->allocatedBy ? $allocation->allocatedBy->name : 'Unknown',
                'allocatedAt' => $allocation->allocated_at ? $allocation->allocated_at->toISOString() : null,
                'notes' => $allocation->notes ?? '',
            ];
        })->sortByDesc('allocatedAt')->values();

        $formattedLaborCosts = $project->laborCosts->map(function ($laborCost) {
            return [
                'id' => (string) $laborCost->id,
                'assignableName' => $laborCost->assignable_name,
                'workDate' => $laborCost->work_date ? $laborCost->work_date->toDateString() : null,
                'hoursWorked' => (float) $laborCost->hours_worked,
                'hourlyRate' => (float) $laborCost->hourly_rate,
                'totalCost' => (float) ($laborCost->hours_worked * $laborCost->hourly_rate),
                'description' => $laborCost->description ?? '',
                'notes' => $laborCost->notes ?? '',
            ];
        })->sortByDesc('workDate')->values();

        $formattedMiscellaneousExpenses = $project->miscellaneousExpenses->map(function ($expense) {
            return [
                'id' => (string) $expense->id,
                'expenseType' => $expense->expense_type,
                'expenseName' => $expense->expense_name,
                'expenseDate' => $expense->expense_date ? $expense->expense_date->toDateString() : null,
                'amount' => (float) $expense->amount,
                'description' => $expense->description ?? '',
                'notes' => $expense->notes ?? '',
                'createdBy' => $expense->createdBy ? $expense->createdBy->name : 'Unknown',
                'createdAt' => $expense->created_at->toISOString(),
            ];
        })->sortByDesc('expenseDate')->values();

        $teamMembers = $project->team->where('is_active', true)->map(function ($teamMember) {
            $name = 'Unknown';
            if ($teamMember->user) {
                $name = $teamMember->user->name;
            } elseif ($teamMember->employee) {
                $name = $teamMember->employee->full_name;
            }

            return [
                'id' => (string) $teamMember->id,
                'name' => $name,
                'role' => $teamMember->role,
            ];
        });

        $allUpdates = $requestUpdates->concat($allProgressUpdates)->sortByDesc('date')->values();

        return [
            'id' => (string) $project->id,
            'name' => $project->project_name,
            'description' => $project->description ?? '',
            'status' => $this->statusForClient($project->status),
            'progress' => $progress,
            'startDate' => $project->start_date,
            'expectedCompletion' => $project->planned_end_date,
            'budget' => (float) $project->contract_amount,
            'spent' => $spent,
            'budgetBreakdown' => [
                'materialCosts' => (float) $materialCosts,
                'laborCosts' => (float) $laborCosts,
                'miscellaneousExpenses' => (float) $miscellaneousExpenses,
                'total' => $spent,
            ],
            'location' => $project->location ?? '',
            'projectManager' => $this->getProjectManagerName($project),
            'milestones' => $formattedMilestones,
            'recentUpdates' => $allUpdates->all(),
            'issues' => $formattedIssues->all(),
            'materialAllocations' => $formattedMaterialAllocations->all(),
            'laborCosts' => $formattedLaborCosts->all(),
            'miscellaneousExpenses' => $formattedMiscellaneousExpenses->all(),
            'teamMembers' => $teamMembers,
        ];
    }

    /**
     * @return array{material: float, labor: float, miscellaneous: float}
     */
    private function getSpentComponents(Project $project): array
    {
        $projectId = $project->id;
        $material = (float) DB::table('project_material_allocations')
            ->join('inventory_items', 'project_material_allocations.inventory_item_id', '=', 'inventory_items.id')
            ->where('project_material_allocations.project_id', $projectId)
            ->where('project_material_allocations.quantity_received', '>', 0)
            ->sum(DB::raw('project_material_allocations.quantity_received * inventory_items.unit_price'));
        $labor = (float) ProjectLaborCost::where('project_id', $projectId)->sum(DB::raw('hours_worked * hourly_rate'));
        $miscellaneous = (float) ProjectMiscellaneousExpense::where('project_id', $projectId)->sum('amount');

        return ['material' => $material, 'labor' => $labor, 'miscellaneous' => $miscellaneous];
    }
}
