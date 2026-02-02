<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectType;
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

class DashboardController extends Controller
{
    public function index()
    {
        // Project Statistics
        $totalProjects = Project::count();
        $activeProjects = Project::where('status', 'active')->count();
        $projectsByStatus = Project::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->pluck('count', 'status');
        
        $projectsByType = Project::with('projectType')
            ->select('project_type_id', DB::raw('count(*) as count'))
            ->whereNotNull('project_type_id')
            ->groupBy('project_type_id')
            ->get()
            ->mapWithKeys(function ($item) {
                $typeName = $item->projectType ? $item->projectType->name : 'Unknown';
                return [$typeName => $item->count];
            });

        $totalContractAmount = Project::sum('contract_amount');
        
        // Calculate average completion based on milestones
        $allProjects = Project::with('milestones')->get();
        $completionPercentages = $allProjects->map(function ($project) {
            $milestones = $project->milestones;
            $totalMilestones = $milestones->count();
            $completedMilestones = $milestones->where('status', 'completed')->count();
            return $totalMilestones > 0 
                ? round(($completedMilestones / $totalMilestones) * 100, 2) 
                : 0;
        });
        $averageCompletion = $completionPercentages->avg() ?? 0;

        // Recent Projects (last 5)
        $recentProjects = Project::with(['client:id,client_name', 'projectType:id,name', 'milestones'])
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get()
            ->map(function ($project) {
                $milestones = $project->milestones;
                $totalMilestones = $milestones->count();
                $completedMilestones = $milestones->where('status', 'completed')->count();
                $project->milestones_completion_percentage = $totalMilestones > 0 
                    ? round(($completedMilestones / $totalMilestones) * 100, 2) 
                    : 0;
                return $project->only(['id', 'project_code', 'project_name', 'status', 'milestones_completion_percentage', 'client_id', 'project_type_id', 'created_at']);
            });

        // Client Statistics
        $totalClients = Client::count();
        $activeClients = Client::where('is_active', true)->count();

        // Billing Statistics - Based on transactions (payments) to handle deleted billings
        // Total billed: Sum of all billing amounts from existing billings
        $totalBilled = Billing::sum('billing_amount');
        
        // Total paid: Sum of all payment transactions with status='paid' (even if billing is deleted)
        // Only count confirmed paid payments - exclude pending, failed, or cancelled payments
        $totalPaid = BillingPayment::where('payment_status', 'paid')->sum('payment_amount');
        
        // Total remaining: Calculate from existing billings minus payments
        // This ensures accuracy even if some billings are deleted
        $totalRemaining = $totalBilled - $totalPaid;
        
        // Billing status counts - based on existing billings
        $billingsByStatus = Billing::select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->pluck('count', 'status');

        // Recent Billings (last 5)
        $recentBillings = Billing::with(['project:id,project_code,project_name', 'milestone:id,name'])
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get(['id', 'billing_code', 'project_id', 'billing_amount', 'status', 'billing_date', 'milestone_id', 'created_at']);

        // Inventory Statistics
        $totalInventoryItems = InventoryItem::count();
        $activeInventoryItems = InventoryItem::where('is_active', true)->count();
        $lowStockItems = InventoryItem::where('is_active', true)
            ->get()
            ->filter(function ($item) {
                return $item->isLowStock();
            })
            ->count();

        // Team Statistics
        $totalTeamMembers = ProjectTeam::where('is_active', true)
            ->where(function ($query) {
                $query->whereNull('end_date')
                    ->orWhere('end_date', '>=', now()->toDateString());
            })
            ->count();

        // Milestone Statistics
        $totalMilestones = ProjectMilestone::count();
        $completedMilestones = ProjectMilestone::where('status', 'completed')->count();
        $inProgressMilestones = ProjectMilestone::where('status', 'in_progress')->count();

        // Task Statistics
        $totalTasks = ProjectTask::count();
        $completedTasks = ProjectTask::where('status', 'completed')->count();
        $inProgressTasks = ProjectTask::where('status', 'in_progress')->count();

        // Budget Statistics
        $totalLaborCost = ProjectLaborCost::get()->sum(function ($cost) {
            return (float) $cost->hours_worked * (float) $cost->hourly_rate;
        });

        $totalMaterialCost = ProjectMaterialAllocation::with('inventoryItem')
            ->get()
            ->sum(function ($allocation) {
                if ($allocation->inventoryItem) {
                    return (float) $allocation->quantity_received * (float) $allocation->inventoryItem->unit_price;
                }
                return 0;
            });

        $totalBudgetUsed = $totalLaborCost + $totalMaterialCost;

        // Monthly Revenue (last 6 months) - Only count paid payments
        $monthlyRevenue = BillingPayment::where('payment_status', 'paid')
            ->select(
                DB::raw("DATE_TRUNC('month', payment_date) as month"),
                DB::raw('SUM(payment_amount) as total')
            )
            ->where('payment_date', '>=', now()->subMonths(6))
            ->groupBy('month')
            ->orderBy('month', 'asc')
            ->get()
            ->keyBy(function ($item) {
                return Carbon::parse($item->month)->format('Y-m');
            });

        // Monthly Expenses (last 6 months) - Labor + Materials
        $monthlyLaborCosts = ProjectLaborCost::select(
            DB::raw("DATE_TRUNC('month', work_date) as month"),
            DB::raw('SUM(hours_worked * hourly_rate) as total')
        )
            ->where('work_date', '>=', now()->subMonths(6))
            ->groupBy('month')
            ->orderBy('month', 'asc')
            ->get()
            ->keyBy(function ($item) {
                return Carbon::parse($item->month)->format('Y-m');
            });

        $monthlyMaterialCosts = ProjectMaterialAllocation::with('inventoryItem')
            ->where('allocated_at', '>=', now()->subMonths(6))
            ->get()
            ->groupBy(function ($allocation) {
                return Carbon::parse($allocation->allocated_at)->format('Y-m');
            })
            ->map(function ($allocations) {
                return $allocations->sum(function ($allocation) {
                    if ($allocation->inventoryItem) {
                        return (float) $allocation->quantity_received * (float) $allocation->inventoryItem->unit_price;
                    }
                    return 0;
                });
            });

        // Generate last 6 months array
        $last6Months = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = now()->subMonths($i);
            $monthKey = $month->format('Y-m');
            $monthLabel = $month->format('M Y');
            
            $revenueData = $monthlyRevenue->get($monthKey);
            $laborData = $monthlyLaborCosts->get($monthKey);
            
            $last6Months[] = [
                'month' => $monthLabel,
                'month_key' => $monthKey,
                'revenue' => $revenueData ? (float) $revenueData->total : 0,
                'labor_cost' => $laborData ? (float) $laborData->total : 0,
                'material_cost' => (float) ($monthlyMaterialCosts->get($monthKey) ?? 0),
            ];
        }

        // Overdue Projects
        $overdueProjects = Project::where('status', '!=', 'completed')
            ->where('status', '!=', 'cancelled')
            ->whereNotNull('planned_end_date')
            ->where('planned_end_date', '<', now())
            ->with('client:id,client_name')
            ->get(['id', 'project_code', 'project_name', 'planned_end_date', 'client_id', 'status']);

        // Upcoming Due Dates (next 7 days)
        $upcomingDueDates = Project::where('status', '!=', 'completed')
            ->where('status', '!=', 'cancelled')
            ->whereNotNull('planned_end_date')
            ->whereBetween('planned_end_date', [now(), now()->addDays(7)])
            ->with('client:id,client_name')
            ->orderBy('planned_end_date', 'asc')
            ->get(['id', 'project_code', 'project_name', 'planned_end_date', 'client_id', 'status']);

        // Overdue Billings
        $overdueBillings = Billing::where('status', '!=', 'paid')
            ->whereNotNull('due_date')
            ->where('due_date', '<', now())
            ->with(['project:id,project_code,project_name'])
            ->get(['id', 'billing_code', 'project_id', 'billing_amount', 'due_date', 'status']);

        return Inertia::render('Dashboard', [
            'statistics' => [
                'projects' => [
                    'total' => $totalProjects,
                    'active' => $activeProjects,
                    'by_status' => $projectsByStatus,
                    'by_type' => $projectsByType,
                    'total_contract_amount' => $totalContractAmount,
                    'average_completion' => round($averageCompletion, 2),
                ],
                'clients' => [
                    'total' => $totalClients,
                    'active' => $activeClients,
                ],
                'billing' => [
                    'total_billed' => $totalBilled,
                    'total_paid' => $totalPaid,
                    'total_remaining' => $totalRemaining,
                    'by_status' => $billingsByStatus,
                ],
                'inventory' => [
                    'total_items' => $totalInventoryItems,
                    'active_items' => $activeInventoryItems,
                    'low_stock_items' => $lowStockItems,
                ],
                'team' => [
                    'total_members' => $totalTeamMembers,
                ],
                'milestones' => [
                    'total' => $totalMilestones,
                    'completed' => $completedMilestones,
                    'in_progress' => $inProgressMilestones,
                ],
                'tasks' => [
                    'total' => $totalTasks,
                    'completed' => $completedTasks,
                    'in_progress' => $inProgressTasks,
                ],
                'budget' => [
                    'total_labor_cost' => $totalLaborCost,
                    'total_material_cost' => $totalMaterialCost,
                    'total_budget_used' => $totalBudgetUsed,
                ],
            ],
            'recentProjects' => $recentProjects,
            'recentBillings' => $recentBillings,
            'monthlyData' => $last6Months,
            'alerts' => [
                'overdue_projects' => $overdueProjects,
                'upcoming_due_dates' => $upcomingDueDates,
                'overdue_billings' => $overdueBillings,
            ],
        ]);
    }
}

