<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectMaterialAllocation;
use App\Models\ProjectLaborCost;
use App\Models\ProjectMiscellaneousExpense;
use App\Models\ProjectMilestone;
use App\Models\ProjectTask;
use App\Models\ProjectIssue;
use App\Models\ProgressUpdate;
use App\Models\InventoryItem;
use App\Models\ClientUpdateRequest;
use App\Models\Billing;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Storage;

class ClientDashboardController extends Controller
{
    use NotificationTrait;

    private function computeProjectPaymentStatus(int $projectId): array
    {
        // Consider only non-archived billings (and exclude soft-deleted by default).
        $billings = Billing::active()
            ->where('project_id', $projectId)
            ->get();

        $total = (float) $billings->sum('billing_amount');
        $remaining = (float) $billings->sum(fn ($b) => (float) $b->remaining_amount);

        $status = 'paid';
        if ($total <= 0) {
            // No billings created yet -> treat as unpaid (nothing to pay) but keep status informative.
            $status = 'unpaid';
        } elseif ($remaining >= $total) {
            $status = 'unpaid';
        } elseif ($remaining > 0) {
            $status = 'partial';
        } else {
            $status = 'paid';
        }

        return [
            'status' => $status,
            'totalAmount' => $total,
            'remainingAmount' => $remaining,
            'paidAmount' => max(0, $total - $remaining),
        ];
    }
    /**
     * Get dashboard statistics for authenticated client
     */
    public function statistics(Request $request)
    {
        $client = $request->user();
        
        // Get all *visible* projects for this client
        // Exclude archived and soft-deleted projects from client portal.
        $projects = Project::where('client_id', $client->id)
            ->whereNull('archived_at')
            ->get();
        $projectIds = $projects->pluck('id');
        
        // Calculate statistics
        $activeProjects = $projects->where('status', 'active')->count();
        $completedProjects = $projects->where('status', 'completed')->count();
        $totalBudget = $projects->sum('contract_amount');
        
        // Calculate total spent (material costs + labor costs + miscellaneous expenses) - optimized
        // Material costs: left join to include direct supply allocations; prefer allocation-level unit_price snapshot
        $materialCosts = DB::table('project_material_allocations')
            ->leftJoin('inventory_items', 'project_material_allocations.inventory_item_id', '=', 'inventory_items.id')
            ->whereIn('project_material_allocations.project_id', $projectIds)
            ->where('project_material_allocations.quantity_received', '>', 0)
            ->sum(DB::raw('project_material_allocations.quantity_received * COALESCE(project_material_allocations.unit_price, inventory_items.unit_price, 0)'));
        
        // Labor costs
        // NOTE: Labor is now period-based with computed gross_pay.
        $laborCosts = ProjectLaborCost::whereIn('project_id', $projectIds)
            ->sum('gross_pay');
        
        // Miscellaneous expenses
        $miscellaneousExpenses = ProjectMiscellaneousExpense::whereIn('project_id', $projectIds)
            ->sum('amount');
        
        $totalSpent = (float) $materialCosts + (float) $laborCosts + (float) $miscellaneousExpenses;
        
        // Calculate on-time projects (completed on or before planned end date)
        $onTimeProjects = $projects->filter(function ($project) {
            if ($project->status === 'completed' && $project->actual_end_date && $project->planned_end_date) {
                return $project->actual_end_date <= $project->planned_end_date;
            }
            // For active projects, consider them on-time if they haven't passed planned end date
            if ($project->status === 'active' && $project->planned_end_date) {
                return now()->toDateString() <= $project->planned_end_date;
            }
            return false;
        })->count();
        
        $overdueProjects = $projects->filter(function ($project) {
            if ($project->status === 'completed' && $project->actual_end_date && $project->planned_end_date) {
                return $project->actual_end_date > $project->planned_end_date;
            }
            if ($project->status === 'active' && $project->planned_end_date) {
                return now()->toDateString() > $project->planned_end_date;
            }
            return false;
        })->count();
        
        return response()->json([
            'success' => true,
            'data' => [
                'totalProjects' => $projects->count(),
                'activeProjects' => $activeProjects,
                'completedProjects' => $completedProjects,
                'totalBudget' => (float) $totalBudget,
                'totalSpent' => $totalSpent,
                'onTimeProjects' => $onTimeProjects,
                'overdueProjects' => $overdueProjects,
            ],
        ]);
    }

    /**
     * Get projects for authenticated client
     */
    public function projects(Request $request)
    {
        $client = $request->user();
        $status = $request->query('status'); // Optional filter by status
        $search = $request->query('search'); // Optional search query
        $sortBy = $request->query('sort_by', 'name'); // Sort field
        $sortOrder = $request->query('sort_order', 'asc'); // Sort direction
        
        $query = Project::where('client_id', $client->id)
            ->whereNull('archived_at')
            ->with(['team.user', 'team.employee', 'milestones.tasks']);
        
        // Search filter
        if ($search) {
            $query->where(function ($q) use ($search) {
                // Use portable case-insensitive search across DBs (MySQL/Postgres/etc.)
                $needle = '%' . strtolower($search) . '%';
                $q->whereRaw('LOWER(project_name) LIKE ?', [$needle])
                  ->orWhereRaw('LOWER(location) LIKE ?', [$needle])
                  ->orWhereRaw('LOWER(description) LIKE ?', [$needle]);
            });
        }
        
        // Status filter
        if ($status && $status !== 'all') {
            // Map frontend status to backend status
            $statusMap = [
                'active' => 'active',
                'on-hold' => 'on_hold',
                'completed' => 'completed',
            ];
            $backendStatus = $statusMap[$status] ?? $status;
            $query->where('status', $backendStatus);
        }
        
        // Apply sorting
        $sortFieldMap = [
            'name' => 'project_name',
            'progress' => 'id', // Will sort after calculation
            'budget' => 'contract_amount',
            'date' => 'planned_end_date',
            'status' => 'status',
        ];
        
        $dbSortField = $sortFieldMap[$sortBy] ?? 'project_name';
        $query->orderBy($dbSortField, $sortOrder === 'desc' ? 'desc' : 'asc');
        
        $projects = $query->get();
        $projectIds = $projects->pluck('id');
        
        // Pre-calculate all material costs - left join to include direct supply allocations
        $materialCostsByProject = DB::table('project_material_allocations')
            ->leftJoin('inventory_items', 'project_material_allocations.inventory_item_id', '=', 'inventory_items.id')
            ->whereIn('project_material_allocations.project_id', $projectIds)
            ->where('project_material_allocations.quantity_received', '>', 0)
            ->select('project_material_allocations.project_id', DB::raw('SUM(project_material_allocations.quantity_received * COALESCE(project_material_allocations.unit_price, inventory_items.unit_price, 0)) as total'))
            ->groupBy('project_material_allocations.project_id')
            ->pluck('total', 'project_id');

        // Pre-calculate all labor costs
        $laborCostsByProject = ProjectLaborCost::whereIn('project_id', $projectIds)
            ->select('project_id', DB::raw('SUM(gross_pay) as total'))
            ->groupBy('project_id')
            ->pluck('total', 'project_id');
        
        // Pre-calculate all miscellaneous expenses
        $miscellaneousExpensesByProject = ProjectMiscellaneousExpense::whereIn('project_id', $projectIds)
            ->select('project_id', DB::raw('SUM(amount) as total'))
            ->groupBy('project_id')
            ->pluck('total', 'project_id');
        
        $mappedProjects = $projects->map(function ($project) use ($materialCostsByProject, $laborCostsByProject, $miscellaneousExpensesByProject) {
            // Calculate progress from milestones
            $milestones = $project->milestones;
            $progress = 0;
            if ($milestones->count() > 0) {
                $totalProgress = $milestones->sum(function ($milestone) {
                    // Calculate milestone progress based on tasks if available
                    $tasks = $milestone->tasks ?? collect();
                    if ($tasks->count() > 0) {
                        $completedTasks = $tasks->where('status', 'completed')->count();
                        return ($completedTasks / $tasks->count()) * 100;
                    }
                    // Fallback: use milestone status
                    return $milestone->status === 'completed' ? 100 : ($milestone->status === 'in_progress' ? 50 : 0);
                });
                $progress = round($totalProgress / $milestones->count(), 2);
            }
            
            // Get spent from pre-calculated values
            $materialCost = (float) ($materialCostsByProject[$project->id] ?? 0);
            $laborCost = (float) ($laborCostsByProject[$project->id] ?? 0);
            $miscellaneousExpense = (float) ($miscellaneousExpensesByProject[$project->id] ?? 0);
            $spent = $materialCost + $laborCost + $miscellaneousExpense;
            
            // Get project manager
            $projectManager = $project->team
                ->where('role', 'Project Manager')
                ->where('is_active', true)
                ->first();
            $projectManagerName = 'N/A';
            if ($projectManager) {
                if ($projectManager->user) {
                    $projectManagerName = $projectManager->user->name;
                } elseif ($projectManager->employee) {
                    $projectManagerName = $projectManager->employee->full_name;
                }
            }
            
            // Map backend status to frontend status
            $statusMap = [
                'active' => 'active',
                'on_hold' => 'on-hold',
                'completed' => 'completed',
                'cancelled' => 'on-hold',
            ];
            
            return [
                'id' => (string) $project->id,
                'name' => $project->project_name,
                'description' => $project->description ?? '',
                'status' => $statusMap[$project->status] ?? 'active',
                'progress' => $progress,
                'startDate' => $project->start_date,
                'expectedCompletion' => $project->planned_end_date,
                'budget' => (float) $project->contract_amount,
                'spent' => $spent,
                'location' => $project->location ?? '',
                'projectManager' => $projectManagerName,
                'paymentStatus' => $this->computeProjectPaymentStatus((int) $project->id),
            ];
        });
        
        // Apply client-side sorting for progress (since it's calculated)
        if ($sortBy === 'progress') {
            $mappedProjects = $mappedProjects->sortBy('progress', SORT_REGULAR, $sortOrder === 'desc');
            $mappedProjects = $mappedProjects->values();
        }
        
        return response()->json([
            'success' => true,
            'data' => $mappedProjects,
        ]);
    }

    /**
     * Export projects for authenticated client
     */
    public function exportProjects(Request $request)
    {
        $client = $request->user();
        $format = $request->query('format', 'csv'); // csv, json
        
        // Get all projects (same logic as projects method but without pagination)
        $query = Project::where('client_id', $client->id)
            ->whereNull('archived_at')
            ->with(['team.user', 'team.employee', 'milestones.tasks']);
        
        $projects = $query->get();
        $projectIds = $projects->pluck('id');
        
        // Pre-calculate costs - left join to include direct supply allocations
        $materialCostsByProject = DB::table('project_material_allocations')
            ->leftJoin('inventory_items', 'project_material_allocations.inventory_item_id', '=', 'inventory_items.id')
            ->whereIn('project_material_allocations.project_id', $projectIds)
            ->where('project_material_allocations.quantity_received', '>', 0)
            ->select('project_material_allocations.project_id', DB::raw('SUM(project_material_allocations.quantity_received * COALESCE(project_material_allocations.unit_price, inventory_items.unit_price, 0)) as total'))
            ->groupBy('project_material_allocations.project_id')
            ->pluck('total', 'project_id');
        
        $laborCostsByProject = ProjectLaborCost::whereIn('project_id', $projectIds)
            ->select('project_id', DB::raw('SUM(gross_pay) as total'))
            ->groupBy('project_id')
            ->pluck('total', 'project_id');
        
        // Pre-calculate all miscellaneous expenses
        $miscellaneousExpensesByProject = ProjectMiscellaneousExpense::whereIn('project_id', $projectIds)
            ->select('project_id', DB::raw('SUM(amount) as total'))
            ->groupBy('project_id')
            ->pluck('total', 'project_id');
        
        $exportData = $projects->map(function ($project) use ($materialCostsByProject, $laborCostsByProject, $miscellaneousExpensesByProject) {
            $milestones = $project->milestones;
            $progress = 0;
            if ($milestones->count() > 0) {
                $totalProgress = $milestones->sum(function ($milestone) {
                    $tasks = $milestone->tasks ?? collect();
                    if ($tasks->count() > 0) {
                        $completedTasks = $tasks->where('status', 'completed')->count();
                        return ($completedTasks / $tasks->count()) * 100;
                    }
                    return $milestone->status === 'completed' ? 100 : ($milestone->status === 'in_progress' ? 50 : 0);
                });
                $progress = round($totalProgress / $milestones->count(), 2);
            }
            
            $materialCost = (float) ($materialCostsByProject[$project->id] ?? 0);
            $laborCost = (float) ($laborCostsByProject[$project->id] ?? 0);
            $miscellaneousExpense = (float) ($miscellaneousExpensesByProject[$project->id] ?? 0);
            $spent = $materialCost + $laborCost + $miscellaneousExpense;
            
            $projectManager = $project->team
                ->where('role', 'Project Manager')
                ->where('is_active', true)
                ->first();
            $projectManagerName = 'N/A';
            if ($projectManager) {
                if ($projectManager->user) {
                    $projectManagerName = $projectManager->user->name;
                } elseif ($projectManager->employee) {
                    $projectManagerName = $projectManager->employee->full_name;
                }
            }
            
            $statusMap = [
                'active' => 'Active',
                'on_hold' => 'On Hold',
                'completed' => 'Completed',
                'cancelled' => 'On Hold',
            ];
            
            return [
                'Project Name' => $project->project_name,
                'Status' => $statusMap[$project->status] ?? 'Active',
                'Progress (%)' => $progress,
                'Location' => $project->location ?? '',
                'Project Manager' => $projectManagerName,
                'Budget (PHP)' => (float) $project->contract_amount,
                'Spent (PHP)' => $spent,
                'Remaining (PHP)' => (float) ($project->contract_amount - $spent),
                'Start Date' => $project->start_date ? date('Y-m-d', strtotime($project->start_date)) : '',
                'Expected Completion' => $project->planned_end_date ? date('Y-m-d', strtotime($project->planned_end_date)) : '',
                'Description' => $project->description ?? '',
            ];
        });
        
        if ($format === 'csv') {
            $csv = "Project Name,Status,Progress (%),Location,Project Manager,Budget (PHP),Spent (PHP),Remaining (PHP),Start Date,Expected Completion,Description\n";
            
            foreach ($exportData as $row) {
                $csv .= '"' . str_replace('"', '""', $row['Project Name']) . '",';
                $csv .= '"' . str_replace('"', '""', $row['Status']) . '",';
                $csv .= $row['Progress (%)'] . ',';
                $csv .= '"' . str_replace('"', '""', $row['Location']) . '",';
                $csv .= '"' . str_replace('"', '""', $row['Project Manager']) . '",';
                $csv .= $row['Budget (PHP)'] . ',';
                $csv .= $row['Spent (PHP)'] . ',';
                $csv .= $row['Remaining (PHP)'] . ',';
                $csv .= $row['Start Date'] . ',';
                $csv .= $row['Expected Completion'] . ',';
                $csv .= '"' . str_replace('"', '""', $row['Description']) . '"';
                $csv .= "\n";
            }
            
            return response($csv, 200)
                ->header('Content-Type', 'text/csv')
                ->header('Content-Disposition', 'attachment; filename="projects_' . date('Y-m-d') . '.csv"');
        }
        
        // Return JSON format
        return response()->json([
            'success' => true,
            'data' => $exportData,
        ]);
    }

    /**
     * Submit a request update for a task (client portal)
     */
    public function requestUpdate(Request $request)
    {
        $client = $request->user();
        
        $validator = Validator::make($request->all(), [
            // NOTE: Request updates are task-scoped. project_id is optional metadata.
            'task_id' => 'required|integer|exists:project_tasks,id',
            'project_id' => 'nullable|integer|exists:projects,id',
            'subject' => 'required|string|max:255',
            'message' => 'required|string',
        ]);

        if ($validator->fails()) {
            return response()->json([
                'success' => false,
                'message' => 'Validation failed',
                'errors' => $validator->errors(),
            ], 422);
        }

        // Verify task ownership through milestone → project and client ownership
        $task = ProjectTask::with('milestone.project')->find($request->task_id);
        $milestone = $task?->milestone;
        $project = $milestone?->project;

        if (
            !$task ||
            !$milestone ||
            !$project ||
            (int) $project->client_id !== (int) $client->id ||
            !is_null($project->archived_at)
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or does not belong to you',
            ], 404);
        }

        // Optional: if project_id is provided, ensure it matches the task's project
        if ($request->filled('project_id') && (int) $request->project_id !== (int) $project->id) {
            return response()->json([
                'success' => false,
                'message' => 'Invalid project_id for the given task',
            ], 422);
        }

        // Create the request update (task-scoped)
        $updateRequest = ClientUpdateRequest::create([
            'client_id' => $client->id,
            'project_id' => $project->id,
            'task_id' => $task->id,
            'subject' => $request->subject,
            'message' => $request->message,
        ]);

        // System-wide notification for client update request
        $this->createSystemNotification(
            'general',
            'Client Update Request',
            "Client '{$client->client_name}' has submitted an update request for task '{$task->title}' in project '{$project->project_name}': {$request->subject}",
            $project,
            null // API doesn't have web routes
        );

        return response()->json([
            'success' => true,
            'message' => 'Update request submitted successfully',
            'data' => [
                'id' => $updateRequest->id,
                'subject' => $updateRequest->subject,
                'message' => $updateRequest->message,
                'project_id' => $updateRequest->project_id,
                'task_id' => $updateRequest->task_id,
                'created_at' => $updateRequest->created_at,
            ],
        ], 201);
    }

    /**
     * Get project details for authenticated client
     */
    public function projectDetail(Request $request, $id)
    {
        $client = $request->user();
        
        // Get project and verify ownership
        $project = Project::where('id', $id)
            ->where('client_id', $client->id)
            ->whereNull('archived_at')
            ->with([
                'team.user',
                'team.employee',
                'milestones.tasks.assignedUser',
                'milestones.tasks.progressUpdates.createdBy',
                'materialAllocations.inventoryItem',
                'materialAllocations.directSupply',
                'materialAllocations.allocatedBy',
                'laborCosts.user',
                'laborCosts.employee',
                'miscellaneousExpenses.createdBy',
                'issues.reportedBy',
                'issues.assignedTo',
                'issues.milestone',
                'issues.task',
            ])
            ->first();

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Project not found or does not belong to you',
            ], 404);
        }

        // Calculate progress from milestones
        $milestones = $project->milestones;
        $progress = 0;
        if ($milestones->count() > 0) {
            $totalProgress = $milestones->sum(function ($milestone) {
                $tasks = $milestone->tasks ?? collect();
                if ($tasks->count() > 0) {
                    $completedTasks = $tasks->where('status', 'completed')->count();
                    return ($completedTasks / $tasks->count()) * 100;
                }
                return $milestone->status === 'completed' ? 100 : ($milestone->status === 'in_progress' ? 50 : 0);
            });
            $progress = round($totalProgress / $milestones->count());
        }

        // Calculate spent - left join to include direct supply allocations; prefer allocation-level unit_price
        $projectId = $project->id;
        $materialCosts = DB::table('project_material_allocations')
            ->leftJoin('inventory_items', 'project_material_allocations.inventory_item_id', '=', 'inventory_items.id')
            ->where('project_material_allocations.project_id', $projectId)
            ->where('project_material_allocations.quantity_received', '>', 0)
            ->sum(DB::raw('project_material_allocations.quantity_received * COALESCE(project_material_allocations.unit_price, inventory_items.unit_price, 0)'));
        
        $laborCosts = ProjectLaborCost::where('project_id', $projectId)
            ->sum('gross_pay');
        
        $miscellaneousExpenses = ProjectMiscellaneousExpense::where('project_id', $projectId)
            ->sum('amount');
        
        $spent = (float) $materialCosts + (float) $laborCosts + (float) $miscellaneousExpenses;

        // Get project manager
        $projectManager = $project->team
            ->where('role', 'Project Manager')
            ->where('is_active', true)
            ->first();
        $projectManagerName = 'N/A';
        if ($projectManager) {
            if ($projectManager->user) {
                $projectManagerName = $projectManager->user->name;
            } elseif ($projectManager->employee) {
                $projectManagerName = $projectManager->employee->full_name;
            }
        }

        // Map backend status to frontend status
        $statusMap = [
            'active' => 'active',
            'on_hold' => 'on-hold',
            'completed' => 'completed',
            'cancelled' => 'on-hold',
        ];

        // Load per-task counts for milestone UI (updates/issues/requests)
        $project->milestones->each(function ($m) {
            $m->tasks->loadCount(['progressUpdates', 'issues', 'clientUpdateRequests']);
        });

        // Format milestones with tasks
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
                    'progressUpdatesCount' => (int) ($task->progress_updates_count ?? 0),
                    'issuesCount' => (int) ($task->issues_count ?? 0),
                    'requestUpdatesCount' => (int) ($task->client_update_requests_count ?? 0),
                ];
            });

            return [
                'id' => (string) $milestone->id,
                'name' => $milestone->name,
                'description' => $milestone->description ?? '',
                'status' => $milestone->status === 'completed' ? 'completed' : ($milestone->status === 'in_progress' ? 'in-progress' : 'pending'),
                'progress' => $tasks->count() > 0
                    ? round(($tasks->where('status', 'completed')->count() / $tasks->count()) * 100, 2)
                    : ($milestone->status === 'completed' ? 100 : ($milestone->status === 'in_progress' ? 50 : 0)),
                'dueDate' => $milestone->due_date,
                'completedDate' => $milestone->status === 'completed' ? $milestone->updated_at->toDateString() : null,
                'tasks' => $tasks,
            ];
        });

        // Get client update requests for this project
        $requestUpdates = ClientUpdateRequest::where('project_id', $project->id)
            ->where('client_id', $client->id)
            ->orderBy('created_at', 'desc')
            ->get()
            ->map(function ($request) {
                return [
                    'id' => (string) $request->id,
                    'title' => $request->subject,
                    'description' => $request->message,
                    'type' => 'request',
                    'author' => 'You', // Client is the author
                    'date' => $request->created_at->toISOString(),
                ];
            });

        // Get progress updates from all tasks
        $allProgressUpdates = collect();
        foreach ($project->milestones as $milestone) {
            foreach ($milestone->tasks as $task) {
                foreach ($task->progressUpdates as $update) {
                    $fileData = null;
                    if ($update->file_path) {
                        // Generate storage URL using request host (works for mobile apps, not just localhost)
                        // This matches TaskDetailModal's approach of using window.location.origin
                        $fileUrl = null;
                        if (Storage::disk(config('filesystems.default'))->exists($update->file_path)) {
                            $fileUrl = Storage::disk(config('filesystems.default'))->url($update->file_path);
                        }
                        
                        $fileData = [
                            'path' => $update->file_path,
                            'type' => $update->file_type,
                            'name' => $update->original_name,
                            'size' => $update->file_size,
                            'url' => $fileUrl,
                        ];
                    }

                    $allProgressUpdates->push([
                        'id' => (string) $update->id,
                        'title' => 'Progress Update - ' . $task->title,
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

        // Format issues
        $formattedIssues = $project->issues->map(function ($issue) {
            $reportedByName = 'Unknown';
            if ($issue->reportedBy) {
                $reportedByName = $issue->reportedBy->name;
            }
            
            $assignedToName = 'Unassigned';
            if ($issue->assignedTo) {
                $assignedToName = $issue->assignedTo->name;
            }
            
            $milestoneName = null;
            if ($issue->milestone) {
                $milestoneName = $issue->milestone->name;
            }
            
            $taskName = null;
            if ($issue->task) {
                $taskName = $issue->task->title;
            }
            
            return [
                'id' => (string) $issue->id,
                'title' => $issue->title,
                'description' => $issue->description ?? '',
                'priority' => $issue->priority ?? 'medium',
                'status' => $issue->status ?? 'open',
                'reportedBy' => $reportedByName,
                'assignedTo' => $assignedToName,
                'dueDate' => $issue->due_date ? $issue->due_date->toDateString() : null,
                'resolvedAt' => $issue->resolved_at ? $issue->resolved_at->toDateString() : null,
                'milestoneId' => $issue->project_milestone_id ? (string) $issue->project_milestone_id : null,
                'milestoneName' => $milestoneName,
                'taskId' => $issue->project_task_id ? (string) $issue->project_task_id : null,
                'taskName' => $taskName,
                'createdAt' => $issue->created_at->toISOString(),
            ];
        })->sortByDesc('createdAt')->values();

        // Format material allocations
        $formattedMaterialAllocations = $project->materialAllocations->map(function ($allocation) {
            $item = $allocation->inventoryItem;
            $supply = $allocation->directSupply;
            $allocatedByName = 'Unknown';
            if ($allocation->allocatedBy) {
                $allocatedByName = $allocation->allocatedBy->name;
            }

            // Prefer allocation-level unit_price snapshot (supports direct supplies), fallback to inventory item
            $unitPrice = (float) ($allocation->unit_price ?? ($item ? $item->unit_price : ($supply ? $supply->unit_price : 0)));
            $totalCost = (float) ($allocation->quantity_received * $unitPrice);

            return [
                'id' => (string) $allocation->id,
                'itemName' => $item ? $item->item_name : ($supply ? $supply->supply_name : 'Unknown Item'),
                'itemCode' => $item ? $item->item_code : ($supply ? $supply->supply_code : 'N/A'),
                'unit' => $item ? $item->unit_of_measure : ($supply ? $supply->unit_of_measure : 'N/A'),
                'quantityAllocated' => (float) $allocation->quantity_allocated,
                'quantityReceived' => (float) $allocation->quantity_received,
                'quantityRemaining' => (float) $allocation->quantity_remaining,
                'status' => $allocation->status,
                'unitPrice' => $unitPrice,
                'totalCost' => $totalCost,
                'allocatedBy' => $allocatedByName,
                'allocatedAt' => $allocation->allocated_at ? $allocation->allocated_at->toISOString() : null,
                'notes' => $allocation->notes ?? '',
            ];
        })->sortByDesc('allocatedAt')->values();

        // Format labor costs (period-based payroll schema)
        $formattedLaborCosts = $project->laborCosts->map(function ($laborCost) {
            return [
                'id' => (string) $laborCost->id,
                'assignableName' => $laborCost->assignable_name,
                'periodStart' => $laborCost->period_start ? $laborCost->period_start->toDateString() : null,
                'periodEnd' => $laborCost->period_end ? $laborCost->period_end->toDateString() : null,
                'payType' => $laborCost->pay_type,
                'daysPresent' => (float) $laborCost->days_present,
                'dailyRate' => (float) $laborCost->daily_rate,
                'monthlySalary' => (float) $laborCost->monthly_salary,
                'grossPay' => (float) $laborCost->gross_pay,
                'description' => $laborCost->description ?? '',
                'notes' => $laborCost->notes ?? '',
            ];
        })->sortByDesc('periodStart')->values();

        // Format miscellaneous expenses
        $formattedMiscellaneousExpenses = $project->miscellaneousExpenses->map(function ($expense) {
            $createdByName = 'Unknown';
            if ($expense->createdBy) {
                $createdByName = $expense->createdBy->name;
            }
            
            return [
                'id' => (string) $expense->id,
                'expenseType' => $expense->expense_type,
                'expenseName' => $expense->expense_name,
                'expenseDate' => $expense->expense_date ? $expense->expense_date->toDateString() : null,
                'amount' => (float) $expense->amount,
                'description' => $expense->description ?? '',
                'notes' => $expense->notes ?? '',
                'createdBy' => $createdByName,
                'createdAt' => $expense->created_at->toISOString(),
            ];
        })->sortByDesc('expenseDate')->values();

        // Format team members
        $teamMembers = $project->team
            ->where('is_active', true)
            ->map(function ($teamMember) {
                // Get name and profile image from user or employee
                $name = 'Unknown';
                $profileImage = null;
                if ($teamMember->user) {
                    $name = $teamMember->user->name;
                    $profileImage = $teamMember->user->profile_image_url;
                } elseif ($teamMember->employee) {
                    $name = $teamMember->employee->full_name;
                    $profileImage = $teamMember->employee->profile_image_url;
                }

                return [
                    'id'           => (string) $teamMember->id,
                    'name'         => $name,
                    'role'         => $teamMember->role,
                    'profileImage' => $profileImage,
                ];
            });

        // Combine all updates (request updates + progress updates)
        $allUpdates = $requestUpdates->concat($allProgressUpdates)->sortByDesc('date')->values();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => (string) $project->id,
                'name' => $project->project_name,
                'description' => $project->description ?? '',
                'status' => $statusMap[$project->status] ?? 'pending',
                'progress' => $progress,
                'startDate' => $project->start_date,
                'expectedCompletion' => $project->planned_end_date,
                'budget' => (float) $project->contract_amount,
                'spent' => $spent,
                'paymentStatus' => $this->computeProjectPaymentStatus((int) $project->id),
                'budgetBreakdown' => [
                    'materialCosts' => (float) $materialCosts,
                    'laborCosts' => (float) $laborCosts,
                    'miscellaneousExpenses' => (float) $miscellaneousExpenses,
                    'total' => $spent,
                ],
                'location' => $project->location ?? '',
                'projectManager' => $projectManagerName,
                'milestones' => $formattedMilestones,
                'recentUpdates' => $allUpdates->all(),
                'issues' => $formattedIssues->all(),
                'materialAllocations' => $formattedMaterialAllocations->all(),
                'laborCosts' => $formattedLaborCosts->all(),
                'miscellaneousExpenses' => $formattedMiscellaneousExpenses->all(),
                'teamMembers' => $teamMembers,
            ],
        ]);
    }

    /**
     * Get task details for authenticated client (task-scoped drilldown)
     */
    public function taskDetail(Request $request, $id)
    {
        $client = $request->user();

        $task = ProjectTask::where('id', $id)
            ->with([
                'assignedUser',
                'milestone.project',
                'progressUpdates.createdBy',
                'issues.reportedBy',
                'issues.assignedTo',
                'clientUpdateRequests.client',
            ])
            ->first();

        $milestone = $task?->milestone;
        $project = $milestone?->project;

        if (
            !$task ||
            !$milestone ||
            !$project ||
            (int) $project->client_id !== (int) $client->id ||
            !is_null($project->archived_at)
        ) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found or does not belong to you',
            ], 404);
        }

        $formattedProgressUpdates = $task->progressUpdates
            ->map(function ($update) use ($request) {
                $fileData = null;
                if ($update->file_path) {
                    $fileUrl = null;
                    if (Storage::disk(config('filesystems.default'))->exists($update->file_path)) {
                        $fileUrl = Storage::disk(config('filesystems.default'))->url($update->file_path);
                    }

                    $fileData = [
                        'path' => $update->file_path,
                        'type' => $update->file_type,
                        'name' => $update->original_name,
                        'size' => $update->file_size,
                        'url' => $fileUrl,
                    ];
                }

                return [
                    'id' => (string) $update->id,
                    'description' => $update->description,
                    'author' => $update->createdBy ? $update->createdBy->name : 'Unknown',
                    'date' => $update->created_at->toISOString(),
                    'file' => $fileData,
                ];
            })
            ->sortByDesc('date')
            ->values()
            ->all();

        $formattedIssues = $task->issues
            ->map(function ($issue) {
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
                    'createdAt' => $issue->created_at->toISOString(),
                ];
            })
            ->sortByDesc('createdAt')
            ->values()
            ->all();

        $formattedClientRequests = $task->clientUpdateRequests
            ->map(function ($req) {
                return [
                    'id' => (string) $req->id,
                    'subject' => $req->subject,
                    'message' => $req->message,
                    'author' => 'You',
                    'date' => $req->created_at->toISOString(),
                ];
            })
            ->sortByDesc('date')
            ->values()
            ->all();

        return response()->json([
            'success' => true,
            'data' => [
                'task' => [
                    'id' => (string) $task->id,
                    'name' => $task->title,
                    'description' => $task->description ?? '',
                    'status' => $task->status === 'completed' ? 'completed' : ($task->status === 'in_progress' ? 'in-progress' : 'pending'),
                    'assignedTo' => $task->assignedUser ? $task->assignedUser->name : 'Unassigned',
                    'dueDate' => $task->due_date,
                ],
                'milestone' => [
                    'id' => (string) $milestone->id,
                    'name' => $milestone->name,
                ],
                'project' => [
                    'id' => (string) $project->id,
                    'name' => $project->project_name,
                ],
                'progressUpdates' => $formattedProgressUpdates,
                'issues' => $formattedIssues,
                'requestUpdates' => $formattedClientRequests,
            ],
        ]);
    }

    /**
     * Download progress update file for authenticated client
     */
    public function downloadProgressUpdateFile(Request $request, $projectId, $updateId)
    {
        $client = $request->user();
        
        // Verify that the project belongs to the authenticated client
        $project = Project::where('id', $projectId)
            ->where('client_id', $client->id)
            ->whereNull('archived_at')
            ->first();

        if (!$project) {
            return response()->json([
                'success' => false,
                'message' => 'Project not found or does not belong to you',
            ], 404);
        }

        // Find the progress update
        $progressUpdate = ProgressUpdate::find($updateId);
        
        if (!$progressUpdate) {
            return response()->json([
                'success' => false,
                'message' => 'Progress update not found',
            ], 404);
        }

        // Verify the progress update belongs to a task in this project
        $task = ProjectTask::find($progressUpdate->project_task_id);
        if (!$task) {
            return response()->json([
                'success' => false,
                'message' => 'Task not found',
            ], 404);
        }

        $milestone = ProjectMilestone::find($task->project_milestone_id);
        if (!$milestone || $milestone->project_id !== $project->id) {
            return response()->json([
                'success' => false,
                'message' => 'Progress update does not belong to this project',
            ], 403);
        }

        if (!$progressUpdate->file_path) {
            return response()->json([
                'success' => false,
                'message' => 'No file attached to this progress update',
            ], 404);
        }

        $disk = config('filesystems.default');

        if (!Storage::disk($disk)->exists($progressUpdate->file_path)) {
            return response()->json([
                'success' => false,
                'message' => 'File not found on server',
            ], 404);
        }

        // Get the file content
        $fileContent = Storage::disk($disk)->get($progressUpdate->file_path);
        $mimeType = Storage::disk($disk)->mimeType($progressUpdate->file_path) ?? 'application/octet-stream';

        // Determine Content-Disposition: inline for images, attachment for other files
        $isImage = str_starts_with($mimeType, 'image/');
        $contentDisposition = $isImage 
            ? 'inline; filename="' . $progressUpdate->original_name . '"'
            : 'attachment; filename="' . $progressUpdate->original_name . '"';

        // Get the origin from the request for CORS
        $origin = $request->header('Origin');
        
        // Build response with file
        $response = response($fileContent, 200)
            ->header('Content-Type', $mimeType)
            ->header('Content-Disposition', $contentDisposition)
            ->header('Access-Control-Allow-Methods', 'GET, OPTIONS')
            ->header('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With, Accept')
            ->header('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type');
        
        // Set CORS origin (required when using credentials)
        if ($origin) {
            $response->header('Access-Control-Allow-Origin', $origin)
                     ->header('Access-Control-Allow-Credentials', 'true');
        } else {
            // Fallback for same-origin requests or when origin is not provided
            $response->header('Access-Control-Allow-Origin', '*');
        }
        
        return $response;
    }
}

