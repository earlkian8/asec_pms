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
use App\Models\ProjectMiscellaneousExpense;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Inertia\Inertia;
use Carbon\Carbon;
use Maatwebsite\Excel\Facades\Excel;
use App\Exports\Reports\ProjectPerformanceExport;
use App\Exports\Reports\FinancialReportExport;
use App\Exports\Reports\ClientReportExport;
use App\Exports\Reports\InventoryReportExport;
use App\Exports\Reports\TeamProductivityExport;
use App\Exports\Reports\BudgetReportExport;
use App\Exports\Reports\AllReportsExport;

class ReportsController extends Controller
{
    public function index(Request $request)
    {
        $dateRange = $request->get('date_range', 'last_6_months');
        $startDate = $request->get('start_date');
        $endDate   = $request->get('end_date');
        $projectId = $request->get('project_id');
        $clientId  = $request->get('client_id');

        [$dateStart, $dateEnd] = $this->parseDateRange($dateRange, $startDate, $endDate);

        $financialReport    = $this->getFinancialReport($dateStart, $dateEnd, $projectId, $clientId);
        $inventoryReport    = $this->getInventoryReport();
        $projectReport      = $this->getProjectReport($dateStart, $dateEnd, $projectId, $clientId);
        $trends             = $this->getTrendsData($dateStart, $dateEnd);

        $projects = Project::orderBy('project_name')->get(['id', 'project_code', 'project_name']);
        $clients  = Client::orderBy('client_name')->get(['id', 'client_code', 'client_name']);

        return Inertia::render('Reports/index', [
            'financialReport' => $financialReport,
            'inventoryReport' => $inventoryReport,
            'projectReport'   => $projectReport,
            'trends'          => $trends,
            'filters'         => [
                'date_range' => $dateRange,
                'start_date' => $startDate,
                'end_date'   => $endDate,
                'project_id' => $projectId,
                'client_id'  => $clientId,
            ],
            'options' => [
                'projects' => $projects,
                'clients'  => $clients,
            ],
        ]);
    }

    // -------------------------------------------------------------------------
    // Date helpers
    // -------------------------------------------------------------------------

    private function parseDateRange($range, $startDate, $endDate)
    {
        if ($startDate && $endDate) {
            return [Carbon::parse($startDate), Carbon::parse($endDate)];
        }

        return match ($range) {
            'today'         => [now()->startOfDay(), now()->endOfDay()],
            'this_week'     => [now()->startOfWeek(), now()->endOfWeek()],
            'this_month'    => [now()->startOfMonth(), now()->endOfMonth()],
            'last_month'    => [now()->subMonth()->startOfMonth(), now()->subMonth()->endOfMonth()],
            'this_quarter'  => [now()->startOfQuarter(), now()->endOfQuarter()],
            'this_year'     => [now()->startOfYear(), now()->endOfYear()],
            'last_year'     => [now()->subYear()->startOfYear(), now()->subYear()->endOfYear()],
            default         => [now()->subMonths(6), now()],
        };
    }

    // -------------------------------------------------------------------------
    // Financial Report (Revenue, Expenses: Labor + Materials + Misc, Profit)
    // -------------------------------------------------------------------------

    private function getFinancialReport($startDate, $endDate, $projectId, $clientId)
    {
        // ── Revenue ──────────────────────────────────────────────────────────
        $paymentQuery = BillingPayment::where('payment_status', 'paid')
            ->whereBetween('payment_date', [$startDate, $endDate]);

        if ($projectId) {
            $paymentQuery->whereHas('billing', fn($q) => $q->where('project_id', $projectId));
        } elseif ($clientId) {
            $paymentQuery->whereHas('billing.project', fn($q) => $q->where('client_id', $clientId));
        }

        $totalRevenue = $paymentQuery->sum('payment_amount');

        // Total billed (for collection rate)
        $billingQuery = Billing::whereBetween('billing_date', [$startDate, $endDate]);

        if ($projectId) {
            $billingQuery->where('project_id', $projectId);
        } elseif ($clientId) {
            $billingQuery->whereHas('project', fn($q) => $q->where('client_id', $clientId));
        }

        $totalBilled      = $billingQuery->sum('billing_amount');
        $totalOutstanding = $totalBilled - $totalRevenue;

        // ── Expenses ─────────────────────────────────────────────────────────

        // Labor
        $laborQuery = ProjectLaborCost::whereBetween('work_date', [$startDate, $endDate]);
        if ($projectId) {
            $laborQuery->where('project_id', $projectId);
        } elseif ($clientId) {
            $laborQuery->whereHas('project', fn($q) => $q->where('client_id', $clientId));
        }
        $totalLaborCost = $laborQuery->sum('total_cost');

        // Materials
        $materialQuery = ProjectMaterialAllocation::whereBetween('allocated_at', [$startDate, $endDate])
            ->with('inventoryItem');
        if ($projectId) {
            $materialQuery->where('project_id', $projectId);
        } elseif ($clientId) {
            $materialQuery->whereHas('project', fn($q) => $q->where('client_id', $clientId));
        }
        $totalMaterialCost = $materialQuery->get()->sum(function ($allocation) {
            return $allocation->inventoryItem
                ? (float) $allocation->quantity_received * (float) $allocation->inventoryItem->unit_price
                : 0;
        });

        // Miscellaneous
        $miscQuery = ProjectMiscellaneousExpense::whereBetween('expense_date', [$startDate, $endDate]);
        if ($projectId) {
            $miscQuery->where('project_id', $projectId);
        } elseif ($clientId) {
            $miscQuery->whereHas('project', fn($q) => $q->where('client_id', $clientId));
        }
        $totalMiscCost = $miscQuery->sum('amount');

        // Misc breakdown by type
        $miscByType = ProjectMiscellaneousExpense::whereBetween('expense_date', [$startDate, $endDate])
            ->when($projectId, fn($q) => $q->where('project_id', $projectId))
            ->when(!$projectId && $clientId, fn($q) => $q->whereHas('project', fn($q2) => $q2->where('client_id', $clientId)))
            ->select('expense_type', DB::raw('sum(amount) as total'), DB::raw('count(*) as count'))
            ->groupBy('expense_type')
            ->get()
            ->keyBy('expense_type');

        $totalExpenses = $totalLaborCost + $totalMaterialCost + $totalMiscCost;
        $netProfit     = $totalRevenue - $totalExpenses;
        $profitMargin  = $totalRevenue > 0 ? ($netProfit / $totalRevenue) * 100 : 0;

        // ── Billing status breakdown ─────────────────────────────────────────
        $billingStatus = Billing::whereBetween('billing_date', [$startDate, $endDate])
            ->when($projectId, fn($q) => $q->where('project_id', $projectId))
            ->when(!$projectId && $clientId, fn($q) => $q->whereHas('project', fn($q2) => $q2->where('client_id', $clientId)))
            ->select('status', DB::raw('count(*) as count'), DB::raw('sum(billing_amount) as total'))
            ->groupBy('status')
            ->get()
            ->keyBy('status');

        // ── Monthly expense breakdown (for charts) ───────────────────────────
        $monthlyExpenses = $this->getMonthlyExpenseBreakdown($startDate, $endDate, $projectId, $clientId);

        return [
            'revenue' => [
                'total_billed'    => $totalBilled,
                'total_received'  => $totalRevenue,
                'outstanding'     => $totalOutstanding,
                'collection_rate' => $totalBilled > 0 ? round(($totalRevenue / $totalBilled) * 100, 2) : 0,
            ],
            'expenses' => [
                'labor'        => $totalLaborCost,
                'materials'    => $totalMaterialCost,
                'miscellaneous'=> $totalMiscCost,
                'total'        => $totalExpenses,
                'misc_by_type' => $miscByType,
            ],
            'profit' => [
                'net'    => $netProfit,
                'margin' => round($profitMargin, 2),
            ],
            'billing_status'  => $billingStatus,
            'monthly_expenses'=> $monthlyExpenses,
        ];
    }

    private function getMonthlyExpenseBreakdown($startDate, $endDate, $projectId, $clientId)
    {
        $months  = collect();
        $current = $startDate->copy()->startOfMonth();

        while ($current->lte($endDate)) {
            $monthEnd = $current->copy()->endOfMonth();
            if ($monthEnd->gt($endDate)) {
                $monthEnd = $endDate->copy();
            }

            $laborQ = ProjectLaborCost::whereBetween('work_date', [$current, $monthEnd]);
            $matQ   = ProjectMaterialAllocation::whereBetween('allocated_at', [$current, $monthEnd])->with('inventoryItem');
            $miscQ  = ProjectMiscellaneousExpense::whereBetween('expense_date', [$current, $monthEnd]);

            if ($projectId) {
                $laborQ->where('project_id', $projectId);
                $matQ->where('project_id', $projectId);
                $miscQ->where('project_id', $projectId);
            } elseif ($clientId) {
                $laborQ->whereHas('project', fn($q) => $q->where('client_id', $clientId));
                $matQ->whereHas('project', fn($q) => $q->where('client_id', $clientId));
                $miscQ->whereHas('project', fn($q) => $q->where('client_id', $clientId));
            }

            $labor    = $laborQ->sum('total_cost');
            $material = $matQ->get()->sum(fn($a) => $a->inventoryItem
                ? (float) $a->quantity_received * (float) $a->inventoryItem->unit_price : 0);
            $misc     = $miscQ->sum('amount');

            $months->push([
                'month'     => $current->format('M Y'),
                'month_key' => $current->format('Y-m'),
                'labor'     => $labor,
                'materials' => $material,
                'misc'      => $misc,
                'total'     => $labor + $material + $misc,
            ]);

            $current->addMonth();
        }

        return $months;
    }

    // -------------------------------------------------------------------------
    // Inventory Report
    // -------------------------------------------------------------------------

    private function getInventoryReport()
    {
        $totalItems  = InventoryItem::count();
        $activeItems = InventoryItem::where('is_active', true)->count();

        $allActive = InventoryItem::where('is_active', true)->get();

        $lowStockItems = $allActive->filter(fn($item) => $item->isLowStock());

        $totalValue = $allActive->sum(fn($item) => (float) $item->current_stock * (float) ($item->unit_price ?? 0));

        // By category: count + value
        $byCategory = InventoryItem::where('is_active', true)
            ->select('category', DB::raw('count(*) as count'), DB::raw('sum(current_stock * unit_price) as total_value'))
            ->groupBy('category')
            ->get();

        // Most used items
        $mostUsed = ProjectMaterialAllocation::select('inventory_item_id', DB::raw('sum(quantity_received) as total_used'))
            ->groupBy('inventory_item_id')
            ->orderByDesc('total_used')
            ->limit(10)
            ->with('inventoryItem:id,item_code,item_name,unit_of_measure,unit_price')
            ->get();

        // Stock health distribution
        $stockHealth = [
            'healthy'   => $allActive->filter(fn($i) => !$i->isLowStock() && $i->current_stock > 0)->count(),
            'low_stock' => $lowStockItems->count(),
            'out_of_stock' => $allActive->filter(fn($i) => $i->current_stock <= 0)->count(),
        ];

        return [
            'summary' => [
                'total_items'     => $totalItems,
                'active_items'    => $activeItems,
                'low_stock_count' => $lowStockItems->count(),
                'total_value'     => $totalValue,
            ],
            'by_category'     => $byCategory,
            'low_stock_items' => $lowStockItems->take(10)->values(),
            'most_used'       => $mostUsed,
            'stock_health'    => $stockHealth,
        ];
    }

    // -------------------------------------------------------------------------
    // Project Report (Performance + Budget combined)
    // -------------------------------------------------------------------------

    private function getProjectReport($startDate, $endDate, $projectId, $clientId)
    {
        $query = Project::query();

        if ($projectId) $query->where('id', $projectId);
        if ($clientId)  $query->where('client_id', $clientId);

        $projects = $query
            ->with(['client:id,client_name', 'milestones', 'projectType:id,name'])
            ->get()
            ->map(function ($project) {
                $milestones       = $project->milestones;
                $total            = $milestones->count();
                $completed        = $milestones->where('status', 'completed')->count();
                $completionPct    = $total > 0 ? round(($completed / $total) * 100, 2) : 0;

                // Actual costs
                $laborCost = ProjectLaborCost::where('project_id', $project->id)->sum('total_cost');
                $materialCost = ProjectMaterialAllocation::where('project_id', $project->id)
                    ->with('inventoryItem')
                    ->get()
                    ->sum(fn($a) => $a->inventoryItem
                        ? (float) $a->quantity_received * (float) $a->inventoryItem->unit_price : 0);
                $miscCost = ProjectMiscellaneousExpense::where('project_id', $project->id)->sum('amount');
                $totalSpent = $laborCost + $materialCost + $miscCost;

                $budget          = (float) $project->contract_amount;
                $variance        = $budget - $totalSpent;
                $variancePct     = $budget > 0 ? ($variance / $budget) * 100 : 0;

                // Timeline status
                $isOverdue = $project->status !== 'completed'
                    && $project->status !== 'cancelled'
                    && $project->planned_end_date
                    && Carbon::parse($project->planned_end_date)->isPast();

                return array_merge($project->toArray(), [
                    'completion_percentage' => $completionPct,
                    'total_milestones'      => $total,
                    'completed_milestones'  => $completed,
                    'labor_cost'            => $laborCost,
                    'material_cost'         => $materialCost,
                    'misc_cost'             => $miscCost,
                    'total_spent'           => $totalSpent,
                    'variance'              => $variance,
                    'variance_percentage'   => round($variancePct, 2),
                    'is_overdue'            => $isOverdue,
                    'project_type_name'     => $project->projectType->name ?? 'Unknown',
                    'client_name'           => $project->client->client_name ?? 'Unknown',
                ]);
            });

        // Summary
        $totalProjects     = $projects->count();
        $completedProjects = $projects->where('status', 'completed')->count();
        $activeProjects    = $projects->where('status', 'active')->count();
        $onHoldProjects    = $projects->where('status', 'on_hold')->count();
        $overdueProjects   = $projects->where('is_overdue', true)->count();
        $avgCompletion     = $projects->avg('completion_percentage') ?? 0;
        $totalBudget       = $projects->sum('contract_amount');
        $totalSpent        = $projects->sum('total_spent');

        // By status
        $byStatus = $projects->groupBy('status')
            ->map(fn($g) => $g->count());

        // By type
        $byType = $projects->groupBy('project_type_name')
            ->map(fn($g) => $g->count());

        // Top projects by contract value
        $topProjects = $projects->sortByDesc('contract_amount')->take(10)->values();

        return [
            'summary' => [
                'total'              => $totalProjects,
                'completed'          => $completedProjects,
                'active'             => $activeProjects,
                'on_hold'            => $onHoldProjects,
                'overdue'            => $overdueProjects,
                'avg_completion'     => round($avgCompletion, 2),
                'total_budget'       => $totalBudget,
                'total_spent'        => $totalSpent,
                'total_variance'     => $totalBudget - $totalSpent,
                'variance_percentage'=> $totalBudget > 0 ? round((($totalBudget - $totalSpent) / $totalBudget) * 100, 2) : 0,
            ],
            'by_status'   => $byStatus,
            'by_type'     => $byType,
            'projects'    => $topProjects,
        ];
    }

    // -------------------------------------------------------------------------
    // Trend data (monthly revenue + expenses for charts)
    // -------------------------------------------------------------------------

    private function getTrendsData($startDate, $endDate)
    {
        $months  = collect();
        $current = $startDate->copy()->startOfMonth();

        while ($current->lte($endDate)) {
            $monthEnd = $current->copy()->endOfMonth();
            if ($monthEnd->gt($endDate)) $monthEnd = $endDate->copy();

            $revenue = BillingPayment::where('payment_status', 'paid')
                ->whereBetween('payment_date', [$current, $monthEnd])
                ->sum('payment_amount');

            $laborCost = ProjectLaborCost::whereBetween('work_date', [$current, $monthEnd])
                ->sum('total_cost');

            $materialCost = ProjectMaterialAllocation::whereBetween('allocated_at', [$current, $monthEnd])
                ->with('inventoryItem')
                ->get()
                ->sum(fn($a) => $a->inventoryItem
                    ? (float) $a->quantity_received * (float) $a->inventoryItem->unit_price : 0);

            $miscCost = ProjectMiscellaneousExpense::whereBetween('expense_date', [$current, $monthEnd])
                ->sum('amount');

            $projectsStarted   = Project::whereBetween('start_date', [$current, $monthEnd])->count();
            $projectsCompleted = Project::where('status', 'completed')
                ->whereBetween('actual_end_date', [$current, $monthEnd])
                ->count();

            $totalExpenses = $laborCost + $materialCost + $miscCost;

            $months->push([
                'month'              => $current->format('M Y'),
                'month_key'          => $current->format('Y-m'),
                'revenue'            => $revenue,
                'labor_cost'         => $laborCost,
                'material_cost'      => $materialCost,
                'misc_cost'          => $miscCost,
                'total_expenses'     => $totalExpenses,
                'net_profit'         => $revenue - $totalExpenses,
                'projects_started'   => $projectsStarted,
                'projects_completed' => $projectsCompleted,
            ]);

            $current->addMonth();
        }

        return $months;
    }

    // =========================================================================
    // Export methods
    // =========================================================================

    public function exportProjectPerformance(Request $request)
    {
        [$dateStart, $dateEnd] = $this->parseDateRange(
            $request->get('date_range', 'last_6_months'),
            $request->get('start_date'),
            $request->get('end_date')
        );

        $projectReport = $this->getProjectReport($dateStart, $dateEnd, $request->get('project_id'), $request->get('client_id'));
        $format        = $request->get('format', 'xlsx');
        $filename      = $this->generateFilename('project-report', $request->get('date_range', 'last_6_months'), $request->get('start_date'), $request->get('end_date'), $format);

        return $format === 'csv'
            ? Excel::download(new ProjectPerformanceExport($projectReport), $filename, \Maatwebsite\Excel\Excel::CSV)
            : Excel::download(new ProjectPerformanceExport($projectReport), $filename);
    }

    public function exportFinancial(Request $request)
    {
        [$dateStart, $dateEnd] = $this->parseDateRange(
            $request->get('date_range', 'last_6_months'),
            $request->get('start_date'),
            $request->get('end_date')
        );

        $financialReport = $this->getFinancialReport($dateStart, $dateEnd, $request->get('project_id'), $request->get('client_id'));
        $format          = $request->get('format', 'xlsx');
        $filename        = $this->generateFilename('financial-report', $request->get('date_range', 'last_6_months'), $request->get('start_date'), $request->get('end_date'), $format);

        return $format === 'csv'
            ? Excel::download(new FinancialReportExport($financialReport), $filename, \Maatwebsite\Excel\Excel::CSV)
            : Excel::download(new FinancialReportExport($financialReport), $filename);
    }

    public function exportClient(Request $request)
    {
        [$dateStart, $dateEnd] = $this->parseDateRange(
            $request->get('date_range', 'last_6_months'),
            $request->get('start_date'),
            $request->get('end_date')
        );

        $clientReport = $this->getClientReport($dateStart, $dateEnd, $request->get('client_id'));
        $format       = $request->get('format', 'xlsx');
        $filename     = $this->generateFilename('client-report', $request->get('date_range', 'last_6_months'), $request->get('start_date'), $request->get('end_date'), $format);

        return $format === 'csv'
            ? Excel::download(new ClientReportExport($clientReport), $filename, \Maatwebsite\Excel\Excel::CSV)
            : Excel::download(new ClientReportExport($clientReport), $filename);
    }

    public function exportInventory(Request $request)
    {
        $inventoryReport = $this->getInventoryReport();
        $format          = $request->get('format', 'xlsx');
        $filename        = $this->generateFilename('inventory-report', 'all', null, null, $format);

        return $format === 'csv'
            ? Excel::download(new InventoryReportExport($inventoryReport), $filename, \Maatwebsite\Excel\Excel::CSV)
            : Excel::download(new InventoryReportExport($inventoryReport), $filename);
    }

    public function exportTeamProductivity(Request $request)
    {
        [$dateStart, $dateEnd] = $this->parseDateRange(
            $request->get('date_range', 'last_6_months'),
            $request->get('start_date'),
            $request->get('end_date')
        );

        $teamProductivity = $this->getTeamProductivityReport($dateStart, $dateEnd, $request->get('project_id'));
        $format           = $request->get('format', 'xlsx');
        $filename         = $this->generateFilename('team-productivity', $request->get('date_range', 'last_6_months'), $request->get('start_date'), $request->get('end_date'), $format);

        return $format === 'csv'
            ? Excel::download(new TeamProductivityExport($teamProductivity), $filename, \Maatwebsite\Excel\Excel::CSV)
            : Excel::download(new TeamProductivityExport($teamProductivity), $filename);
    }

    public function exportBudget(Request $request)
    {
        [$dateStart, $dateEnd] = $this->parseDateRange(
            $request->get('date_range', 'last_6_months'),
            $request->get('start_date'),
            $request->get('end_date')
        );

        $projectReport = $this->getProjectReport($dateStart, $dateEnd, $request->get('project_id'), $request->get('client_id'));
        $format        = $request->get('format', 'xlsx');
        $filename      = $this->generateFilename('budget-report', $request->get('date_range', 'last_6_months'), $request->get('start_date'), $request->get('end_date'), $format);

        return $format === 'csv'
            ? Excel::download(new BudgetReportExport($projectReport), $filename, \Maatwebsite\Excel\Excel::CSV)
            : Excel::download(new BudgetReportExport($projectReport), $filename);
    }

    public function exportAll(Request $request)
    {
        [$dateStart, $dateEnd] = $this->parseDateRange(
            $request->get('date_range', 'last_6_months'),
            $request->get('start_date'),
            $request->get('end_date')
        );

        $projectId = $request->get('project_id');
        $clientId  = $request->get('client_id');

        $financialReport = $this->getFinancialReport($dateStart, $dateEnd, $projectId, $clientId);
        $inventoryReport = $this->getInventoryReport();
        $projectReport   = $this->getProjectReport($dateStart, $dateEnd, $projectId, $clientId);

        $filename = $this->generateFilename('all-reports', $request->get('date_range', 'last_6_months'), $request->get('start_date'), $request->get('end_date'), 'xlsx');

        return Excel::download(
            new AllReportsExport($projectReport, $financialReport, null, $inventoryReport, null, $projectReport),
            $filename
        );
    }

    // -------------------------------------------------------------------------
    // Legacy helpers (kept for backward compat with existing export classes)
    // -------------------------------------------------------------------------

    private function getClientReport($startDate, $endDate, $clientId)
    {
        $query = Client::query();
        if ($clientId) $query->where('id', $clientId);

        $clients = $query->withCount(['projects' => function ($q) use ($startDate, $endDate) {
            $q->where(fn($q2) => $q2->whereBetween('start_date', [$startDate, $endDate])
                ->orWhereBetween('planned_end_date', [$startDate, $endDate]));
        }])->with(['projects' => function ($q) use ($startDate, $endDate) {
            $q->where(fn($q2) => $q2->whereBetween('start_date', [$startDate, $endDate])
                ->orWhereBetween('planned_end_date', [$startDate, $endDate]))
              ->select('id', 'client_id', 'project_name', 'contract_amount', 'status');
        }])->get();

        $topClients = $clients->map(function ($client) {
            return [
                'id'                   => $client->id,
                'client_code'          => $client->client_code,
                'client_name'          => $client->client_name,
                'client_type'          => $client->client_type,
                'total_projects'       => $client->projects_count,
                'active_projects'      => $client->projects->where('status', 'active')->count(),
                'completed_projects'   => $client->projects->where('status', 'completed')->count(),
                'total_contract_value' => $client->projects->sum('contract_amount'),
            ];
        })->sortByDesc('total_contract_value')->take(10)->values();

        return [
            'total_clients'  => $clients->count(),
            'active_clients' => $clients->where('is_active', true)->count(),
            'top_clients'    => $topClients,
        ];
    }

    private function getTeamProductivityReport($startDate, $endDate, $projectId)
    {
        $query = ProjectLaborCost::whereBetween('work_date', [$startDate, $endDate]);
        if ($projectId) $query->where('project_id', $projectId);

        $laborCosts = $query->with(['user:id,name', 'project:id,project_name'])->get();

        $byUser = $laborCosts->groupBy('user_id')->map(function ($costs, $userId) {
            return [
                'user_id'        => $userId,
                'user_name'      => $costs->first()->user->name ?? 'Unknown',
                'total_hours'    => round($costs->sum('hours_worked'), 2),
                'total_cost'     => $costs->sum('total_cost'),
                'avg_hourly_rate'=> round($costs->avg('hourly_rate'), 2),
                'work_days'      => $costs->count(),
            ];
        })->sortByDesc('total_hours')->take(10)->values();

        return [
            'summary' => [
                'total_hours'    => round($laborCosts->sum('hours_worked'), 2),
                'total_cost'     => $laborCosts->sum('total_cost'),
                'avg_hourly_rate'=> $laborCosts->sum('hours_worked') > 0
                    ? round($laborCosts->sum('total_cost') / $laborCosts->sum('hours_worked'), 2)
                    : 0,
            ],
            'by_user' => $byUser,
        ];
    }

    private function generateFilename($reportType, $dateRange, $startDate, $endDate, $format)
    {
        $timestamp    = now()->format('Ymd_His');
        $dateRangeStr = 'all';

        if ($startDate && $endDate) {
            $dateRangeStr = Carbon::parse($startDate)->format('Y-m-d') . '_to_' . Carbon::parse($endDate)->format('Y-m-d');
        } elseif ($dateRange && $dateRange !== 'custom') {
            $dateRangeStr = str_replace('_', '-', $dateRange);
        }

        $extension = $format === 'csv' ? 'csv' : 'xlsx';
        return "{$reportType}_{$dateRangeStr}_{$timestamp}.{$extension}";
    }
}