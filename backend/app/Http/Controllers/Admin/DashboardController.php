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
use App\Models\ProjectMiscellaneousExpense;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;

class DashboardController extends Controller
{
    public function index()
    {
        // Project Statistics — exclude archived projects
        $totalProjects = Project::notArchived()->count();
        $activeProjects = Project::notArchived()->where('status', 'active')->count();
        $projectsByStatus = Project::notArchived()
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->pluck('count', 'status');

        $projectsByType = Project::notArchived()
            ->with('projectType')
            ->select('project_type_id', DB::raw('count(*) as count'))
            ->whereNotNull('project_type_id')
            ->groupBy('project_type_id')
            ->get()
            ->mapWithKeys(function ($item) {
                $typeName = $item->projectType ? $item->projectType->name : 'Unknown';
                return [$typeName => $item->count];
            });

        $totalContractAmount = Project::notArchived()->sum('contract_amount');

        // Calculate average completion in SQL to avoid loading all projects into memory.
        $averageCompletion = (float) DB::query()
            ->fromSub(
                ProjectMilestone::whereHas('project', fn($q) => $q->whereNull('archived_at'))
                    ->selectRaw(
                        "project_id, (SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END)::decimal / NULLIF(COUNT(*), 0)) * 100 as completion_percentage"
                    )
                    ->groupBy('project_id'),
                'project_completion'
            )
            ->selectRaw('COALESCE(AVG(completion_percentage), 0) as average_completion')
            ->value('average_completion');

        // Recent Projects (last 5) — exclude archived
        $recentProjects = Project::notArchived()
            ->with([
                'client:id,client_name',
                'projectType:id,name',
                'milestones' => fn($query) => $query->withCount([
                    'tasks',
                    'tasks as completed_tasks_count' => fn($taskQuery) => $taskQuery->where('status', 'completed'),
                ]),
            ])
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get()
            ->map(function ($project) {
                $milestones = $project->milestones;

                $milestoneProgress = $milestones->map(function ($milestone) {
                    $totalTasks = (int) ($milestone->tasks_count ?? 0);
                    $completedTasks = (int) ($milestone->completed_tasks_count ?? 0);

                    if ($totalTasks === 0) {
                        return 0;
                    }

                    return ($completedTasks / $totalTasks) * 100;
                });

                $project->milestones_completion_percentage = round($milestoneProgress->avg() ?? 0, 2);
                return $project->only(['id', 'project_code', 'project_name', 'status', 'milestones_completion_percentage', 'client_id', 'project_type_id', 'created_at']);
            });

        // Client Statistics
        $totalClients = Client::count();
        $activeClients = Client::where('is_active', true)->count();

        // Billing Statistics — exclude archived billings
        $totalBilled = Billing::active()->sum('billing_amount');

        // Total paid: only from non-archived billings on non-archived projects
        $totalPaid = BillingPayment::where('payment_status', 'paid')
            ->whereHas('billing', fn($q) => $q->whereNull('archived_at')
                ->whereHas('project', fn($q2) => $q2->whereNull('archived_at')))
            ->sum('payment_amount');

        $totalRemaining = $totalBilled - $totalPaid;

        // Billing status counts — exclude archived billings
        $billingsByStatus = Billing::active()
            ->select('status', DB::raw('count(*) as count'))
            ->groupBy('status')
            ->get()
            ->pluck('count', 'status');

        // Recent Billings (last 5) — exclude archived
        $recentBillings = Billing::active()
            ->with(['project:id,project_code,project_name', 'milestone:id,name'])
            ->orderBy('created_at', 'desc')
            ->take(5)
            ->get(['id', 'billing_code', 'project_id', 'billing_amount', 'status', 'billing_date', 'milestone_id', 'created_at']);

        // Inventory Statistics
        $totalInventoryItems = InventoryItem::count();
        $activeInventoryItems = InventoryItem::where('is_active', true)->count();
        $lowStockItems = InventoryItem::where('is_active', true)
            ->whereNotNull('min_stock_level')
            ->whereColumn('current_stock', '<=', 'min_stock_level')
            ->count();

        // Team Statistics — only from non-archived projects
        $totalTeamMembers = ProjectTeam::where('is_active', true)
            ->where(function ($query) {
                $query->whereNull('end_date')
                    ->orWhere('end_date', '>=', now()->toDateString());
            })
            ->whereHas('project', fn($q) => $q->whereNull('archived_at'))
            ->count();

        // Milestone Statistics — only from non-archived projects
        $totalMilestones = ProjectMilestone::whereHas('project', fn($q) => $q->whereNull('archived_at'))->count();
        $completedMilestones = ProjectMilestone::whereHas('project', fn($q) => $q->whereNull('archived_at'))->where('status', 'completed')->count();
        $inProgressMilestones = ProjectMilestone::whereHas('project', fn($q) => $q->whereNull('archived_at'))->where('status', 'in_progress')->count();

        // Task Statistics — only from non-archived projects
        $totalTasks = ProjectTask::whereHas('milestone.project', fn($q) => $q->whereNull('archived_at'))->count();
        $completedTasks = ProjectTask::whereHas('milestone.project', fn($q) => $q->whereNull('archived_at'))->where('status', 'completed')->count();
        $inProgressTasks = ProjectTask::whereHas('milestone.project', fn($q) => $q->whereNull('archived_at'))->where('status', 'in_progress')->count();

        // Budget Statistics — only from non-archived projects
        $totalLaborCost = (float) ProjectLaborCost::whereHas('project', fn($q) => $q->whereNull('archived_at'))->sum('gross_pay');

        $totalMaterialCost = (float) ProjectMaterialAllocation::whereHas('project', fn($q) => $q->whereNull('archived_at'))
            ->leftJoin('inventory_items', 'project_material_allocations.inventory_item_id', '=', 'inventory_items.id')
            ->selectRaw('COALESCE(SUM(project_material_allocations.quantity_received * COALESCE(inventory_items.unit_price, 0)), 0) as total')
            ->value('total');

        $totalMiscCost = (float) ProjectMiscellaneousExpense::whereHas('project', fn($q) => $q->whereNull('archived_at'))->sum('amount');

        $totalBudgetUsed = $totalLaborCost + $totalMaterialCost + $totalMiscCost;

        // Monthly Revenue (last 6 months) — only from non-archived billings/projects
        $monthlyRevenue = BillingPayment::where('payment_status', 'paid')
            ->whereHas('billing', fn($q) => $q->whereNull('archived_at')
                ->whereHas('project', fn($q2) => $q2->whereNull('archived_at')))
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

        // Monthly Expenses (last 6 months) — only from non-archived projects
        $monthlyLaborCosts = ProjectLaborCost::whereHas('project', fn($q) => $q->whereNull('archived_at'))
            ->select(
                DB::raw("DATE_TRUNC('month', period_start) as month"),
                DB::raw('SUM(gross_pay) as total')
            )
            ->where('period_start', '>=', now()->subMonths(6))
            ->groupBy('month')
            ->orderBy('month', 'asc')
            ->get()
            ->keyBy(function ($item) {
                return Carbon::parse($item->month)->format('Y-m');
            });

        $monthlyMaterialCosts = ProjectMaterialAllocation::whereHas('project', fn($q) => $q->whereNull('archived_at'))
            ->leftJoin('inventory_items', 'project_material_allocations.inventory_item_id', '=', 'inventory_items.id')
            ->select(
                DB::raw("DATE_TRUNC('month', project_material_allocations.allocated_at) as month"),
                DB::raw('SUM(project_material_allocations.quantity_received * COALESCE(inventory_items.unit_price, 0)) as total')
            )
            ->where('allocated_at', '>=', now()->subMonths(6))
            ->groupBy('month')
            ->orderBy('month', 'asc')
            ->get()
            ->keyBy(function ($item) {
                return Carbon::parse($item->month)->format('Y-m');
            });

        $monthlyMiscCosts = ProjectMiscellaneousExpense::whereHas('project', fn($q) => $q->whereNull('archived_at'))
            ->select(
                DB::raw("DATE_TRUNC('month', expense_date) as month"),
                DB::raw('SUM(amount) as total')
            )
            ->where('expense_date', '>=', now()->subMonths(6))
            ->groupBy('month')
            ->orderBy('month', 'asc')
            ->get()
            ->keyBy(function ($item) {
                return Carbon::parse($item->month)->format('Y-m');
            });

        // Generate last 6 months array
        $last6Months = [];
        for ($i = 5; $i >= 0; $i--) {
            $month = now()->subMonths($i);
            $monthKey = $month->format('Y-m');
            $monthLabel = $month->format('M Y');

            $revenueData = $monthlyRevenue->get($monthKey);
            $laborData = $monthlyLaborCosts->get($monthKey);
            $miscData = $monthlyMiscCosts->get($monthKey);

            $last6Months[] = [
                'month' => $monthLabel,
                'month_key' => $monthKey,
                'revenue' => $revenueData ? (float) $revenueData->total : 0,
                'labor_cost' => $laborData ? (float) $laborData->total : 0,
                'material_cost' => (float) ($monthlyMaterialCosts->get($monthKey)?->total ?? 0),
                'misc_cost' => $miscData ? (float) $miscData->total : 0,
            ];
        }

        // Overdue Projects — exclude archived
        $overdueProjects = Project::notArchived()
            ->where('status', '!=', 'completed')
            ->where('status', '!=', 'cancelled')
            ->whereNotNull('planned_end_date')
            ->where('planned_end_date', '<', now())
            ->with('client:id,client_name')
            ->limit(10)
            ->get(['id', 'project_code', 'project_name', 'planned_end_date', 'client_id', 'status']);

        // Upcoming Due Dates (next 7 days) — exclude archived
        $upcomingDueDates = Project::notArchived()
            ->where('status', '!=', 'completed')
            ->where('status', '!=', 'cancelled')
            ->whereNotNull('planned_end_date')
            ->whereBetween('planned_end_date', [now(), now()->addDays(7)])
            ->with('client:id,client_name')
            ->orderBy('planned_end_date', 'asc')
            ->limit(10)
            ->get(['id', 'project_code', 'project_name', 'planned_end_date', 'client_id', 'status']);

        // Overdue Billings — exclude archived
        $overdueBillings = Billing::active()
            ->where('status', '!=', 'paid')
            ->whereNotNull('due_date')
            ->where('due_date', '<', now())
            ->with(['project:id,project_code,project_name'])
            ->limit(10)
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
                    'total_misc_cost' => $totalMiscCost,
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
