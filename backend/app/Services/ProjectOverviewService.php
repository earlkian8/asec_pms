<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectLaborCost;
use App\Models\ProjectMaterialAllocation;
use App\Models\ProjectMiscellaneousExpense;
use App\Models\Billing;
use App\Models\ProjectMilestone;
use App\Models\ProjectTeam;
use App\Models\ProjectTask;

class ProjectOverviewService
{
    public function getProjectOverviewData(Project $project): array
    {
        $project->load(['client', 'projectType']);

        // ── Labor Costs ───────────────────────────────────────────────────────
        $laborCosts      = ProjectLaborCost::where('project_id', $project->id)->get();
        $totalLaborCost  = (float) $laborCosts->sum('gross_pay');
        $totalLaborDays  = (float) $laborCosts->sum('days_present');

        // ── Material Costs ────────────────────────────────────────────────────
        $materialAllocations = ProjectMaterialAllocation::where('project_id', $project->id)
            ->with('inventoryItem')
            ->get();

        $totalMaterialCost     = $materialAllocations->sum(function ($a) {
            return $a->inventoryItem
                ? (float) $a->quantity_received * (float) $a->inventoryItem->unit_price
                : 0;
        });
        $totalMaterialQuantity = (float) $materialAllocations->sum('quantity_received');

        // ── Miscellaneous Expenses ────────────────────────────────────────────
        $miscExpenses               = ProjectMiscellaneousExpense::where('project_id', $project->id)->get();
        $totalMiscellaneousExpenses = (float) $miscExpenses->sum('amount');

        // ── Budget Summary ────────────────────────────────────────────────────
        $totalBudgetUsed            = $totalLaborCost + $totalMaterialCost + $totalMiscellaneousExpenses;
        $contractAmount             = (float) $project->contract_amount;
        $budgetRemaining            = $contractAmount - $totalBudgetUsed;
        $budgetUtilizationPct       = $contractAmount > 0 ? ($totalBudgetUsed / $contractAmount) * 100 : 0;

        // ── Billing ───────────────────────────────────────────────────────────
        $billings     = Billing::where('project_id', $project->id)->with(['payments', 'milestone'])->get();
        $totalBilled  = (float) $billings->sum('billing_amount');
        $totalPaid    = (float) $billings->sum(fn ($b) => $b->total_paid);
        $totalRemaining     = $totalBilled - $totalPaid;
        $paymentPercentage  = $totalBilled > 0 ? ($totalPaid / $totalBilled) * 100 : 0;

        $billingStatusCounts = [
            'unpaid'  => $billings->where('status', 'unpaid')->count(),
            'partial' => $billings->where('status', 'partial')->count(),
            'paid'    => $billings->where('status', 'paid')->count(),
        ];

        $recentBillings = $billings->sortByDesc('billing_date')->take(5)->values();

        // ── Team ──────────────────────────────────────────────────────────────
        $teamMembers      = ProjectTeam::where('project_id', $project->id)
            ->active()->current()
            ->with(['user', 'employee'])
            ->get();
        $totalTeamMembers  = $teamMembers->count();
        $activeTeamMembers = $teamMembers->where('is_active', true)->count();

        // ── Milestones ────────────────────────────────────────────────────────
        $milestones          = ProjectMilestone::where('project_id', $project->id)->get();
        $totalMilestones     = $milestones->count();
        $completedMilestones = $milestones->where('status', 'completed')->count();
        $inProgressMilestones= $milestones->where('status', 'in_progress')->count();
        $pendingMilestones   = $milestones->where('status', 'pending')->count();

        // ── Tasks ─────────────────────────────────────────────────────────────
        $milestoneIds   = $milestones->pluck('id');
        $tasks          = ProjectTask::whereIn('project_milestone_id', $milestoneIds)->get();
        $totalTasks     = $tasks->count();
        $completedTasks = $tasks->where('status', 'completed')->count();
        $inProgressTasks= $tasks->where('status', 'in_progress')->count();
        $pendingTasks   = $tasks->where('status', 'pending')->count();

        $overallProgress = 0;
        if ($milestones->count() > 0) {
            $milestoneProgressValues = $milestones->map(function ($milestone) use ($tasks) {
                $milestoneTasks = $tasks->where('project_milestone_id', $milestone->id);
                $total          = $milestoneTasks->count();
                if ($total === 0) return 0.0;
                return ($milestoneTasks->where('status', 'completed')->count() / $total) * 100;
            });
            $overallProgress = round($milestoneProgressValues->avg(), 2);
        }
        // ── Monthly Breakdown (last 6 months) ─────────────────────────────────

        // Labor — group by period_start month, sum gross_pay
        $monthlyLaborCosts = ProjectLaborCost::where('project_id', $project->id)
            ->where('period_start', '>=', now()->subMonths(6))
            ->get()
            ->groupBy(fn ($c) => $c->period_start->format('Y-m'))
            ->map(fn ($costs) => (float) $costs->sum('gross_pay'));

        // Materials
        $monthlyMaterialCosts = ProjectMaterialAllocation::where('project_id', $project->id)
            ->where('allocated_at', '>=', now()->subMonths(6))
            ->with('inventoryItem')
            ->get()
            ->groupBy(fn ($a) => $a->allocated_at->format('Y-m'))
            ->map(fn ($allocations) => $allocations->sum(fn ($a) => $a->inventoryItem
                ? (float) $a->quantity_received * (float) $a->inventoryItem->unit_price
                : 0
            ));

        // Misc
        $monthlyMiscExpenses = ProjectMiscellaneousExpense::where('project_id', $project->id)
            ->where('expense_date', '>=', now()->subMonths(6))
            ->get()
            ->groupBy(fn ($e) => $e->expense_date->format('Y-m'))
            ->map(fn ($expenses) => (float) $expenses->sum('amount'));

        $last6Months = [];
        for ($i = 5; $i >= 0; $i--) {
            $month    = now()->subMonths($i);
            $monthKey = $month->format('Y-m');
            $last6Months[] = [
                'month'                   => $month->format('M Y'),
                'month_key'               => $monthKey,
                'labor_cost'              => $monthlyLaborCosts->get($monthKey, 0),
                'material_cost'           => $monthlyMaterialCosts->get($monthKey, 0),
                'miscellaneous_expenses'  => $monthlyMiscExpenses->get($monthKey, 0),
            ];
        }

        // ── Timeline ──────────────────────────────────────────────────────────
        $daysElapsed   = $project->start_date ? (int) now()->diffInDays($project->start_date) : 0;
        $daysRemaining = $project->planned_end_date
            ? max(0, (int) now()->diffInDays($project->planned_end_date, false))
            : null;
        $isOverdue = $project->planned_end_date
            && now()->greaterThan($project->planned_end_date)
            && $project->status !== 'completed';

        return [
            'project' => $project,
            'overall_progress' => $overallProgress,
            'budget'  => [
                'contract_amount'               => $contractAmount,
                'total_labor_cost'              => $totalLaborCost,
                'total_material_cost'           => $totalMaterialCost,
                'total_miscellaneous_expenses'  => $totalMiscellaneousExpenses,
                'total_budget_used'             => $totalBudgetUsed,
                'budget_remaining'              => $budgetRemaining,
                'budget_utilization_percentage' => round($budgetUtilizationPct, 2),
                'total_labor_days'              => $totalLaborDays,   // replaces total_labor_hours
                'total_material_quantity'       => round($totalMaterialQuantity, 2),
                'monthly_breakdown'             => $last6Months,
            ],
            'billing' => [
                'total_billed'       => $totalBilled,
                'total_paid'         => $totalPaid,
                'total_remaining'    => $totalRemaining,
                'payment_percentage' => round($paymentPercentage, 2),
                'status_counts'      => $billingStatusCounts,
                'recent_billings'    => $recentBillings->map(fn ($b) => [
                    'id'               => $b->id,
                    'billing_code'     => $b->billing_code,
                    'billing_amount'   => $b->billing_amount,
                    'billing_date'     => $b->billing_date,
                    'status'           => $b->status,
                    'total_paid'       => $b->total_paid,
                    'remaining_amount' => $b->remaining_amount,
                    'milestone'        => $b->milestone
                        ? ['id' => $b->milestone->id, 'name' => $b->milestone->name]
                        : null,
                ]),
            ],
            'team' => [
                'total_members'  => $totalTeamMembers,
                'active_members' => $activeTeamMembers,
                'members'        => $teamMembers->map(fn ($m) => [
                    'id'              => $m->id,
                    'assignable_name' => $m->assignable_name,
                    'assignable_type' => $m->assignable_type,
                    'user'            => $m->user ? [
                        'id'    => $m->user->id,
                        'name'  => $m->user->name,
                        'email' => $m->user->email,
                    ] : null,
                    'employee'        => $m->employee ? [
                        'id'         => $m->employee->id,
                        'first_name' => $m->employee->first_name,
                        'last_name'  => $m->employee->last_name,
                        'email'      => $m->employee->email,
                    ] : null,
                    'role'   => $m->role,
                    'status' => $m->is_active ? 'active' : 'inactive',
                ]),
            ],
            'milestones' => [
                'total'                => $totalMilestones,
                'completed'            => $completedMilestones,
                'in_progress'          => $inProgressMilestones,
                'pending'              => $pendingMilestones,
                'completion_percentage'=> $totalMilestones > 0
                    ? round(($completedMilestones / $totalMilestones) * 100, 2)
                    : 0,
            ],
            'tasks' => [
                'total'                => $totalTasks,
                'completed'            => $completedTasks,
                'in_progress'          => $inProgressTasks,
                'pending'              => $pendingTasks,
                'completion_percentage'=> $totalTasks > 0
                    ? round(($completedTasks / $totalTasks) * 100, 2)
                    : 0,
            ],
            'timeline' => [
                'days_elapsed'     => $daysElapsed,
                'days_remaining'   => $daysRemaining,
                'is_overdue'       => $isOverdue,
                'start_date'       => $project->start_date,
                'planned_end_date' => $project->planned_end_date,
                'actual_end_date'  => $project->actual_end_date,
            ],
        ];
    }
}