<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\Client;
use App\Models\Billing;
use App\Models\BillingPayment;
use App\Models\InventoryItem;
use App\Models\ProjectTeam;
use App\Models\ProjectMilestone;
use App\Models\ProjectTask;
use App\Models\ProjectLaborCost;
use App\Models\ProjectMaterialAllocation;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;

class ReportsController extends Controller
{
    public function index(Request $request)
    {
        $dateRange = $request->get('date_range', 'last_6_months');
        $startDate = $request->get('start_date');
        $endDate = $request->get('end_date');
        $projectId = $request->get('project_id');
        $clientId = $request->get('client_id');

        // Parse date range
        [$dateStart, $dateEnd] = $this->parseDateRange($dateRange, $startDate, $endDate);

        // Project Performance Report
        $projectPerformance = $this->getProjectPerformanceReport($dateStart, $dateEnd, $projectId, $clientId);

        // Financial Report
        $financialReport = $this->getFinancialReport($dateStart, $dateEnd, $projectId, $clientId);

        // Client Report
        $clientReport = $this->getClientReport($dateStart, $dateEnd, $clientId);

        // Inventory Report
        $inventoryReport = $this->getInventoryReport();

        // Team Productivity Report
        $teamProductivity = $this->getTeamProductivityReport($dateStart, $dateEnd, $projectId);

        // Budget vs Actual Report
        $budgetReport = $this->getBudgetReport($dateStart, $dateEnd, $projectId, $clientId);

        // Time-based Trends
        $trends = $this->getTrendsData($dateStart, $dateEnd);

        // Get filter options
        $projects = Project::orderBy('project_name')->get(['id', 'project_code', 'project_name']);
        $clients = Client::orderBy('client_name')->get(['id', 'client_code', 'client_name']);

        return Inertia::render('Reports/index', [
            'projectPerformance' => $projectPerformance,
            'financialReport' => $financialReport,
            'clientReport' => $clientReport,
            'inventoryReport' => $inventoryReport,
            'teamProductivity' => $teamProductivity,
            'budgetReport' => $budgetReport,
            'trends' => $trends,
            'filters' => [
                'date_range' => $dateRange,
                'start_date' => $startDate,
                'end_date' => $endDate,
                'project_id' => $projectId,
                'client_id' => $clientId,
            ],
            'options' => [
                'projects' => $projects,
                'clients' => $clients,
            ],
        ]);
    }

    private function parseDateRange($range, $startDate, $endDate)
    {
        if ($startDate && $endDate) {
            return [Carbon::parse($startDate), Carbon::parse($endDate)];
        }

        return match ($range) {
            'today' => [now()->startOfDay(), now()->endOfDay()],
            'this_week' => [now()->startOfWeek(), now()->endOfWeek()],
            'this_month' => [now()->startOfMonth(), now()->endOfMonth()],
            'last_month' => [now()->subMonth()->startOfMonth(), now()->subMonth()->endOfMonth()],
            'this_quarter' => [now()->startOfQuarter(), now()->endOfQuarter()],
            'this_year' => [now()->startOfYear(), now()->endOfYear()],
            'last_year' => [now()->subYear()->startOfYear(), now()->subYear()->endOfYear()],
            default => [now()->subMonths(6), now()], // last_6_months
        };
    }

    private function getProjectPerformanceReport($startDate, $endDate, $projectId, $clientId)
    {
        $query = Project::query();

        if ($projectId) {
            $query->where('id', $projectId);
        }

        if ($clientId) {
            $query->where('client_id', $clientId);
        }

        $projects = $query->with(['client:id,client_name', 'milestones'])
            ->where(function ($q) use ($startDate, $endDate) {
                $q->whereBetween('start_date', [$startDate, $endDate])
                  ->orWhereBetween('planned_end_date', [$startDate, $endDate]);
            })
            ->get()
            ->map(function ($project) {
                $milestones = $project->milestones;
                $totalMilestones = $milestones->count();
                $completedMilestones = $milestones->where('status', 'completed')->count();
                $project->completion_percentage = $totalMilestones > 0 
                    ? round(($completedMilestones / $totalMilestones) * 100, 2) 
                    : 0;
                return $project;
            });

        $totalProjects = $projects->count();
        $completedProjects = $projects->where('status', 'completed')->count();
        $activeProjects = $projects->where('status', 'active')->count();
        $onHoldProjects = $projects->where('status', 'on_hold')->count();
        $cancelledProjects = $projects->where('status', 'cancelled')->count();

        $avgCompletion = $projects->avg('completion_percentage') ?? 0;
        $totalContractValue = $projects->sum('contract_amount');

        // Projects by type
        $byType = $projects->load('projectType')->groupBy(function ($project) {
            return $project->projectType ? $project->projectType->name : 'Unknown';
        })->map(function ($group) {
            return $group->count();
        });

        // Projects by status
        $byStatus = $projects->groupBy('status')->map(function ($group) {
            return $group->count();
        });

        // Top performing projects (by completion)
        $topProjects = $projects->sortByDesc('completion_percentage')->take(10)->values();

        // Overdue projects
        $overdueProjects = $projects->filter(function ($project) {
            return $project->status !== 'completed' 
                && $project->status !== 'cancelled'
                && $project->planned_end_date 
                && Carbon::parse($project->planned_end_date)->isPast();
        });

        return [
            'summary' => [
                'total' => $totalProjects,
                'completed' => $completedProjects,
                'active' => $activeProjects,
                'on_hold' => $onHoldProjects,
                'cancelled' => $cancelledProjects,
                'avg_completion' => round($avgCompletion, 2),
                'total_contract_value' => $totalContractValue,
            ],
            'by_type' => $byType,
            'by_status' => $byStatus,
            'top_projects' => $topProjects,
            'overdue_count' => $overdueProjects->count(),
        ];
    }

    private function getFinancialReport($startDate, $endDate, $projectId, $clientId)
    {
        // Revenue (from payments)
        $paymentQuery = BillingPayment::whereBetween('payment_date', [$startDate, $endDate]);
        
        if ($projectId) {
            $paymentQuery->whereHas('billing', function ($q) use ($projectId) {
                $q->where('project_id', $projectId);
            });
        }

        $totalRevenue = $paymentQuery->sum('payment_amount');

        // Total Billed
        $billingQuery = Billing::whereBetween('billing_date', [$startDate, $endDate]);
        
        if ($projectId) {
            $billingQuery->where('project_id', $projectId);
        } elseif ($clientId) {
            $billingQuery->whereHas('project', function ($q) use ($clientId) {
                $q->where('client_id', $clientId);
            });
        }

        $totalBilled = $billingQuery->sum('billing_amount');
        $totalOutstanding = $totalBilled - $totalRevenue;

        // Expenses (Labor + Materials)
        $laborQuery = ProjectLaborCost::whereBetween('work_date', [$startDate, $endDate]);
        $materialQuery = ProjectMaterialAllocation::whereBetween('allocated_at', [$startDate, $endDate]);

        if ($projectId) {
            $laborQuery->where('project_id', $projectId);
            $materialQuery->where('project_id', $projectId);
        } elseif ($clientId) {
            $laborQuery->whereHas('project', function ($q) use ($clientId) {
                $q->where('client_id', $clientId);
            });
            $materialQuery->whereHas('project', function ($q) use ($clientId) {
                $q->where('client_id', $clientId);
            });
        }

        $totalLaborCost = $laborQuery->get()->sum(function ($cost) {
            return (float) $cost->hours_worked * (float) $cost->hourly_rate;
        });

        $totalMaterialCost = $materialQuery->with('inventoryItem')
            ->get()
            ->sum(function ($allocation) {
                if ($allocation->inventoryItem) {
                    return (float) $allocation->quantity_received * (float) $allocation->inventoryItem->unit_price;
                }
                return 0;
            });

        $totalExpenses = $totalLaborCost + $totalMaterialCost;
        $netProfit = $totalRevenue - $totalExpenses;
        $profitMargin = $totalRevenue > 0 ? ($netProfit / $totalRevenue) * 100 : 0;

        // Billing status breakdown
        $billingStatus = $billingQuery->select('status', DB::raw('count(*) as count'), DB::raw('sum(billing_amount) as total'))
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        return [
            'revenue' => [
                'total_billed' => $totalBilled,
                'total_received' => $totalRevenue,
                'outstanding' => $totalOutstanding,
                'collection_rate' => $totalBilled > 0 ? ($totalRevenue / $totalBilled) * 100 : 0,
            ],
            'expenses' => [
                'labor' => $totalLaborCost,
                'materials' => $totalMaterialCost,
                'total' => $totalExpenses,
            ],
            'profit' => [
                'net' => $netProfit,
                'margin' => round($profitMargin, 2),
            ],
            'billing_status' => $billingStatus,
        ];
    }

    private function getClientReport($startDate, $endDate, $clientId)
    {
        $query = Client::query();

        if ($clientId) {
            $query->where('id', $clientId);
        }

        $clients = $query->withCount(['projects' => function ($q) use ($startDate, $endDate) {
            $q->where(function ($query) use ($startDate, $endDate) {
                $query->whereBetween('start_date', [$startDate, $endDate])
                      ->orWhereBetween('planned_end_date', [$startDate, $endDate]);
            });
        }])
        ->with(['projects' => function ($q) use ($startDate, $endDate) {
            $q->where(function ($query) use ($startDate, $endDate) {
                $query->whereBetween('start_date', [$startDate, $endDate])
                      ->orWhereBetween('planned_end_date', [$startDate, $endDate]);
            })
            ->with('milestones')
            ->select('id', 'client_id', 'project_name', 'contract_amount', 'status');
        }])
        ->get();
        
        // Calculate completion_percentage for each project
        $clients->each(function ($client) {
            $client->projects->each(function ($project) {
                $milestones = $project->milestones;
                $totalMilestones = $milestones->count();
                $completedMilestones = $milestones->where('status', 'completed')->count();
                $project->completion_percentage = $totalMilestones > 0 
                    ? round(($completedMilestones / $totalMilestones) * 100, 2) 
                    : 0;
            });
        });

        $topClients = $clients->map(function ($client) {
            $totalContractValue = $client->projects->sum('contract_amount');
            $activeProjects = $client->projects->where('status', 'active')->count();
            $completedProjects = $client->projects->where('status', 'completed')->count();
            
            return [
                'id' => $client->id,
                'client_code' => $client->client_code,
                'client_name' => $client->client_name,
                'client_type' => $client->client_type,
                'total_projects' => $client->projects_count,
                'active_projects' => $activeProjects,
                'completed_projects' => $completedProjects,
                'total_contract_value' => $totalContractValue,
            ];
        })->sortByDesc('total_contract_value')->take(10)->values();

        return [
            'total_clients' => $clients->count(),
            'active_clients' => $clients->where('is_active', true)->count(),
            'top_clients' => $topClients,
        ];
    }

    private function getInventoryReport()
    {
        $totalItems = InventoryItem::count();
        $activeItems = InventoryItem::where('is_active', true)->count();
        
        $lowStockItems = InventoryItem::where('is_active', true)
            ->get()
            ->filter(function ($item) {
                return $item->isLowStock();
            });

        $totalValue = InventoryItem::where('is_active', true)
            ->get()
            ->sum(function ($item) {
                return (float) $item->current_stock * (float) ($item->unit_price ?? 0);
            });

        // Items by category
        $byCategory = InventoryItem::where('is_active', true)
            ->select('category', DB::raw('count(*) as count'))
            ->groupBy('category')
            ->get()
            ->pluck('count', 'category');

        // Most used items (by allocations)
        $mostUsed = ProjectMaterialAllocation::select('inventory_item_id', DB::raw('sum(quantity_received) as total_used'))
            ->groupBy('inventory_item_id')
            ->orderByDesc('total_used')
            ->limit(10)
            ->with('inventoryItem:id,item_code,item_name')
            ->get();

        return [
            'summary' => [
                'total_items' => $totalItems,
                'active_items' => $activeItems,
                'low_stock_count' => $lowStockItems->count(),
                'total_value' => $totalValue,
            ],
            'by_category' => $byCategory,
            'low_stock_items' => $lowStockItems->take(10)->values(),
            'most_used' => $mostUsed,
        ];
    }

    private function getTeamProductivityReport($startDate, $endDate, $projectId)
    {
        $query = ProjectLaborCost::whereBetween('work_date', [$startDate, $endDate]);

        if ($projectId) {
            $query->where('project_id', $projectId);
        }

        $laborCosts = $query->with(['user:id,name', 'project:id,project_name'])
            ->get();

        // Total hours and cost by user
        $byUser = $laborCosts->groupBy('user_id')->map(function ($costs, $userId) {
            $user = $costs->first()->user;
            $totalHours = $costs->sum('hours_worked');
            $totalCost = $costs->sum(function ($cost) {
                return (float) $cost->hours_worked * (float) $cost->hourly_rate;
            });
            $avgHourlyRate = $costs->avg('hourly_rate');

            return [
                'user_id' => $userId,
                'user_name' => $user->name ?? 'Unknown',
                'total_hours' => round($totalHours, 2),
                'total_cost' => $totalCost,
                'avg_hourly_rate' => round($avgHourlyRate, 2),
                'work_days' => $costs->count(),
            ];
        })->sortByDesc('total_hours')->take(10)->values();

        // Total hours and cost by project
        $byProject = $laborCosts->groupBy('project_id')->map(function ($costs, $projectId) {
            $project = $costs->first()->project;
            $totalHours = $costs->sum('hours_worked');
            $totalCost = $costs->sum(function ($cost) {
                return (float) $cost->hours_worked * (float) $cost->hourly_rate;
            });

            return [
                'project_id' => $projectId,
                'project_name' => $project->project_name ?? 'Unknown',
                'total_hours' => round($totalHours, 2),
                'total_cost' => $totalCost,
            ];
        })->sortByDesc('total_hours')->take(10)->values();

        $totalHours = $laborCosts->sum('hours_worked');
        $totalCost = $laborCosts->sum(function ($cost) {
            return (float) $cost->hours_worked * (float) $cost->hourly_rate;
        });

        return [
            'summary' => [
                'total_hours' => round($totalHours, 2),
                'total_cost' => $totalCost,
                'avg_hourly_rate' => $totalHours > 0 ? round($totalCost / $totalHours, 2) : 0,
            ],
            'by_user' => $byUser,
            'by_project' => $byProject,
        ];
    }

    private function getBudgetReport($startDate, $endDate, $projectId, $clientId)
    {
        $query = Project::query();

        if ($projectId) {
            $query->where('id', $projectId);
        }

        if ($clientId) {
            $query->where('client_id', $clientId);
        }

        $projects = $query->where(function ($q) use ($startDate, $endDate) {
                $q->whereBetween('start_date', [$startDate, $endDate])
                  ->orWhereBetween('planned_end_date', [$startDate, $endDate]);
            })
            ->get();

        $budgetData = $projects->map(function ($project) {
            // Labor costs
            $laborCosts = ProjectLaborCost::where('project_id', $project->id)
                ->get()
                ->sum(function ($cost) {
                    return (float) $cost->hours_worked * (float) $cost->hourly_rate;
                });

            // Material costs
            $materialCosts = ProjectMaterialAllocation::where('project_id', $project->id)
                ->with('inventoryItem')
                ->get()
                ->sum(function ($allocation) {
                    if ($allocation->inventoryItem) {
                        return (float) $allocation->quantity_received * (float) $allocation->inventoryItem->unit_price;
                    }
                    return 0;
                });

            // Miscellaneous expenses
            $miscellaneousExpenses = \App\Models\ProjectMiscellaneousExpense::where('project_id', $project->id)
                ->sum('amount');

            $totalSpent = $laborCosts + $materialCosts + $miscellaneousExpenses;
            $budget = $project->contract_amount;
            $variance = $budget - $totalSpent;
            $variancePercentage = $budget > 0 ? ($variance / $budget) * 100 : 0;

            return [
                'project_id' => $project->id,
                'project_code' => $project->project_code,
                'project_name' => $project->project_name,
                'budget' => $budget,
                'labor_cost' => $laborCosts,
                'material_cost' => $materialCosts,
                'miscellaneous_expenses' => $miscellaneousExpenses,
                'total_spent' => $totalSpent,
                'variance' => $variance,
                'variance_percentage' => round($variancePercentage, 2),
                'status' => $project->status,
            ];
        })->sortByDesc('total_spent')->take(20)->values();

        $totalBudget = $budgetData->sum('budget');
        $totalSpent = $budgetData->sum('total_spent');
        $totalVariance = $totalBudget - $totalSpent;

        return [
            'summary' => [
                'total_budget' => $totalBudget,
                'total_spent' => $totalSpent,
                'total_variance' => $totalVariance,
                'variance_percentage' => $totalBudget > 0 ? round(($totalVariance / $totalBudget) * 100, 2) : 0,
            ],
            'projects' => $budgetData,
        ];
    }

    private function getTrendsData($startDate, $endDate)
    {
        $months = collect();
        $current = $startDate->copy()->startOfMonth();

        while ($current->lte($endDate)) {
            $monthEnd = $current->copy()->endOfMonth();
            if ($monthEnd->gt($endDate)) {
                $monthEnd = $endDate;
            }

            // Revenue
            $revenue = BillingPayment::whereBetween('payment_date', [$current, $monthEnd])
                ->sum('payment_amount');

            // Expenses
            $laborCost = ProjectLaborCost::whereBetween('work_date', [$current, $monthEnd])
                ->get()
                ->sum(function ($cost) {
                    return (float) $cost->hours_worked * (float) $cost->hourly_rate;
                });

            $materialCost = ProjectMaterialAllocation::whereBetween('allocated_at', [$current, $monthEnd])
                ->with('inventoryItem')
                ->get()
                ->sum(function ($allocation) {
                    if ($allocation->inventoryItem) {
                        return (float) $allocation->quantity_received * (float) $allocation->inventoryItem->unit_price;
                    }
                    return 0;
                });

            // Projects
            $projectsStarted = Project::whereBetween('start_date', [$current, $monthEnd])->count();
            $projectsCompleted = Project::where('status', 'completed')
                ->whereBetween('actual_end_date', [$current, $monthEnd])
                ->count();

            $months->push([
                'month' => $current->format('M Y'),
                'month_key' => $current->format('Y-m'),
                'revenue' => $revenue,
                'labor_cost' => $laborCost,
                'material_cost' => $materialCost,
                'total_expenses' => $laborCost + $materialCost,
                'net_profit' => $revenue - ($laborCost + $materialCost),
                'projects_started' => $projectsStarted,
                'projects_completed' => $projectsCompleted,
            ]);

            $current->addMonth();
        }

        return $months;
    }
}

