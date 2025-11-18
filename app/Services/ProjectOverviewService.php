<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectLaborCost;
use App\Models\ProjectMaterialAllocation;
use App\Models\Billing;
use App\Models\BillingPayment;
use App\Models\ProjectMilestone;
use App\Models\ProjectTeam;
use App\Models\ProjectTask;

class ProjectOverviewService
{
    public function getProjectOverviewData(Project $project)
    {
        // Load project with relationships
        $project->load(['client']);

        // Calculate Labor Costs
        $laborCosts = ProjectLaborCost::where('project_id', $project->id)->get();
        $totalLaborHours = $laborCosts->sum('hours_worked');
        $totalLaborCost = $laborCosts->sum(function ($cost) {
            return (float) $cost->hours_worked * (float) $cost->hourly_rate;
        });

        // Calculate Material Costs
        $materialAllocations = ProjectMaterialAllocation::where('project_id', $project->id)
            ->with('inventoryItem')
            ->get();
        
        $totalMaterialCost = $materialAllocations->sum(function ($allocation) {
            if ($allocation->inventoryItem) {
                return (float) $allocation->quantity_received * (float) $allocation->inventoryItem->unit_price;
            }
            return 0;
        });

        $totalMaterialQuantity = $materialAllocations->sum('quantity_received');

        // Total Budget Used
        $totalBudgetUsed = $totalLaborCost + $totalMaterialCost;
        $contractAmount = (float) $project->contract_amount;
        $budgetRemaining = $contractAmount - $totalBudgetUsed;
        $budgetUtilizationPercentage = $contractAmount > 0 ? ($totalBudgetUsed / $contractAmount) * 100 : 0;

        // Billing Information
        $billings = Billing::where('project_id', $project->id)
            ->with(['payments', 'milestone'])
            ->get();
        
        $totalBilled = $billings->sum('billing_amount');
        $totalPaid = $billings->sum(function ($billing) {
            return $billing->payments->sum('payment_amount');
        });
        $totalRemaining = $totalBilled - $totalPaid;
        $paymentPercentage = $totalBilled > 0 ? ($totalPaid / $totalBilled) * 100 : 0;

        // Billing breakdown by status
        $billingStatusCounts = [
            'unpaid' => $billings->where('status', 'unpaid')->count(),
            'partial' => $billings->where('status', 'partial')->count(),
            'paid' => $billings->where('status', 'paid')->count(),
        ];

        // Recent billings (last 5)
        $recentBillings = $billings->sortByDesc('billing_date')->take(5)->values();

        // Team Statistics
        $teamMembers = ProjectTeam::where('project_id', $project->id)
            ->active()
            ->current()
            ->with('user')
            ->get();
        
        $totalTeamMembers = $teamMembers->count();
        $activeTeamMembers = $teamMembers->where('is_active', true)->count();

        // Milestone Statistics
        $milestones = ProjectMilestone::where('project_id', $project->id)->get();
        $totalMilestones = $milestones->count();
        $completedMilestones = $milestones->where('status', 'completed')->count();
        $inProgressMilestones = $milestones->where('status', 'in_progress')->count();
        $pendingMilestones = $milestones->where('status', 'pending')->count();

        // Task Statistics
        $tasks = ProjectTask::whereHas('milestone', function ($query) use ($project) {
            $query->where('project_id', $project->id);
        })->get();
        
        $totalTasks = $tasks->count();
        $completedTasks = $tasks->where('status', 'completed')->count();
        $inProgressTasks = $tasks->where('status', 'in_progress')->count();
        $pendingTasks = $tasks->where('status', 'pending')->count();

        // Budget breakdown by month (last 6 months)
        $monthlyLaborCosts = ProjectLaborCost::where('project_id', $project->id)
            ->where('work_date', '>=', now()->subMonths(6))
            ->get()
            ->groupBy(function ($cost) {
                return $cost->work_date->format('Y-m');
            })
            ->map(function ($costs) {
                return $costs->sum(function ($cost) {
                    return (float) $cost->hours_worked * (float) $cost->hourly_rate;
                });
            });

        $monthlyMaterialCosts = ProjectMaterialAllocation::where('project_id', $project->id)
            ->where('allocated_at', '>=', now()->subMonths(6))
            ->with('inventoryItem')
            ->get()
            ->groupBy(function ($allocation) {
                return $allocation->allocated_at->format('Y-m');
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
            $last6Months[] = [
                'month' => $month->format('M Y'),
                'month_key' => $monthKey,
                'labor_cost' => $monthlyLaborCosts->get($monthKey, 0),
                'material_cost' => $monthlyMaterialCosts->get($monthKey, 0),
            ];
        }

        // Project timeline information
        $daysElapsed = $project->start_date ? now()->diffInDays($project->start_date) : 0;
        $daysRemaining = $project->planned_end_date ? max(0, now()->diffInDays($project->planned_end_date, false)) : null;
        $isOverdue = $project->planned_end_date && now()->greaterThan($project->planned_end_date) && $project->status !== 'completed';

        return [
            'project' => $project,
            'budget' => [
                'contract_amount' => $contractAmount,
                'total_labor_cost' => $totalLaborCost,
                'total_material_cost' => $totalMaterialCost,
                'total_budget_used' => $totalBudgetUsed,
                'budget_remaining' => $budgetRemaining,
                'budget_utilization_percentage' => round($budgetUtilizationPercentage, 2),
                'total_labor_hours' => round($totalLaborHours, 2),
                'total_material_quantity' => round($totalMaterialQuantity, 2),
                'monthly_breakdown' => $last6Months,
            ],
            'billing' => [
                'total_billed' => $totalBilled,
                'total_paid' => $totalPaid,
                'total_remaining' => $totalRemaining,
                'payment_percentage' => round($paymentPercentage, 2),
                'status_counts' => $billingStatusCounts,
                'recent_billings' => $recentBillings->map(function ($billing) {
                    return [
                        'id' => $billing->id,
                        'billing_code' => $billing->billing_code,
                        'billing_amount' => $billing->billing_amount,
                        'billing_date' => $billing->billing_date,
                        'status' => $billing->status,
                        'total_paid' => $billing->total_paid,
                        'remaining_amount' => $billing->remaining_amount,
                        'milestone' => $billing->milestone ? [
                            'id' => $billing->milestone->id,
                            'name' => $billing->milestone->name,
                        ] : null,
                    ];
                }),
            ],
            'team' => [
                'total_members' => $totalTeamMembers,
                'active_members' => $activeTeamMembers,
                'members' => $teamMembers->map(function ($member) {
                    return [
                        'id' => $member->id,
                        'user' => $member->user ? [
                            'id' => $member->user->id,
                            'name' => $member->user->name,
                            'email' => $member->user->email,
                        ] : null,
                        'role' => $member->role,
                        'status' => $member->is_active ? 'active' : 'inactive',
                    ];
                }),
            ],
            'milestones' => [
                'total' => $totalMilestones,
                'completed' => $completedMilestones,
                'in_progress' => $inProgressMilestones,
                'pending' => $pendingMilestones,
                'completion_percentage' => $totalMilestones > 0 ? round(($completedMilestones / $totalMilestones) * 100, 2) : 0,
            ],
            'tasks' => [
                'total' => $totalTasks,
                'completed' => $completedTasks,
                'in_progress' => $inProgressTasks,
                'pending' => $pendingTasks,
                'completion_percentage' => $totalTasks > 0 ? round(($completedTasks / $totalTasks) * 100, 2) : 0,
            ],
            'timeline' => [
                'days_elapsed' => $daysElapsed,
                'days_remaining' => $daysRemaining,
                'is_overdue' => $isOverdue,
                'start_date' => $project->start_date,
                'planned_end_date' => $project->planned_end_date,
                'actual_end_date' => $project->actual_end_date,
            ],
        ];
    }
}

