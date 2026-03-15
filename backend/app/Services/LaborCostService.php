<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectLaborCost;

class LaborCostService
{
    public function getProjectLaborCostsData(Project $project): array
    {
        $search    = request('search');
        $dateFrom  = request('date_from');
        $dateTo    = request('date_to');
        $status    = request('status_filter');
        $sortBy    = request('sort_by',    'period_start');
        $sortOrder = request('sort_order', 'desc');

        $allowedSorts = ['period_start', 'period_end', 'gross_pay', 'days_present', 'created_at'];
        if (!in_array($sortBy, $allowedSorts)) $sortBy = 'period_start';
        if (!in_array($sortOrder, ['asc', 'desc'])) $sortOrder = 'desc';

        $laborCosts = ProjectLaborCost::where('project_id', $project->id)
            ->when($search, function ($q) use ($search) {
                $q->where(function ($q2) use ($search) {
                    $q2->whereHas('user', fn ($u) => $u->where('name', 'ilike', "%{$search}%"))
                       ->orWhereHas('employee', fn ($e) =>
                            $e->where('first_name', 'ilike', "%{$search}%")
                              ->orWhere('last_name',  'ilike', "%{$search}%")
                       )
                       ->orWhere('description', 'ilike', "%{$search}%")
                       ->orWhere('notes',       'ilike', "%{$search}%");
                });
            })
            ->when($dateFrom, fn ($q) => $q->where('period_start', '>=', $dateFrom))
            ->when($dateTo,   fn ($q) => $q->where('period_end',   '<=', $dateTo))
            ->when($status && $status !== 'all', fn ($q) => $q->where('status', $status))
            ->with(['user', 'employee', 'createdBy'])
            ->orderBy($sortBy, $sortOrder)
            ->paginate(10)
            ->withQueryString();

        // Team members for the add/edit dropdowns
        $teamMembers = $project->team()
            ->active()
            ->current()
            ->with(['user', 'employee'])
            ->get()
            ->map(function ($tm) {
                if ($tm->assignable_type === 'employee' && $tm->employee) {
                    return [
                        'id'         => $tm->employee->id,
                        'name'       => trim($tm->employee->first_name . ' ' . $tm->employee->last_name),
                        'email'      => $tm->employee->email,
                        'daily_rate' => $tm->daily_rate ?? ($tm->hourly_rate ? $tm->hourly_rate * 8 : 0),
                        'type'       => 'employee',
                    ];
                } elseif ($tm->user) {
                    return [
                        'id'         => $tm->user->id,
                        'name'       => $tm->user->name,
                        'email'      => $tm->user->email,
                        'daily_rate' => $tm->daily_rate ?? ($tm->hourly_rate ? $tm->hourly_rate * 8 : 0),
                        'type'       => 'user',
                    ];
                }
                return null;
            })
            ->filter()
            ->values();

        // Summary totals (unfiltered for the project, filtered for the cards)
        $baseQuery = ProjectLaborCost::where('project_id', $project->id)
            ->when($dateFrom, fn ($q) => $q->where('period_start', '>=', $dateFrom))
            ->when($dateTo,   fn ($q) => $q->where('period_end',   '<=', $dateTo))
            ->when($status && $status !== 'all', fn ($q) => $q->where('status', $status));

        $totalGrossPay    = (float) (clone $baseQuery)->sum('gross_pay');
        $totalDaysPresent = (float) (clone $baseQuery)->sum('days_present');
        $totalDraft       = (clone $baseQuery)->where('status', 'draft')->count();
        $totalSubmitted   = (clone $baseQuery)->where('status', 'submitted')->count();

        return [
            'project'        => $project->load('client'),
            'laborCosts'     => $laborCosts,
            'teamMembers'    => $teamMembers,
            'totalGrossPay'  => $totalGrossPay,
            'totalDays'      => $totalDaysPresent,
            'totalDraft'     => $totalDraft,
            'totalSubmitted' => $totalSubmitted,
            'search'         => $search,
            'filters'        => [
                'date_from' => $dateFrom,
                'date_to'   => $dateTo,
                'status'    => $status ?? 'all',
            ],
            'sort_by'    => $sortBy,
            'sort_order' => $sortOrder,
        ];
    }
}