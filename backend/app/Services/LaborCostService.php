<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectLaborCost;

class LaborCostService
{
    public function getProjectLaborCostsData(Project $project)
    {
        $search = request('search');
        $dateFrom = request('date_from');
        $dateTo = request('date_to');

        // Load labor costs with related data and pagination
        $laborCosts = ProjectLaborCost::where('project_id', $project->id)
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->whereHas('user', function ($userQuery) use ($search) {
                        $userQuery->where('name', 'ilike', "%{$search}%");
                    })
                        ->orWhereHas('employee', function ($employeeQuery) use ($search) {
                            $employeeQuery->where('first_name', 'ilike', "%{$search}%")
                                ->orWhere('last_name', 'ilike', "%{$search}%")
                                ->orWhere('email', 'ilike', "%{$search}%");
                        })
                        ->orWhere('description', 'ilike', "%{$search}%")
                        ->orWhere('notes', 'ilike', "%{$search}%");
                });
            })
            ->when($dateFrom, function ($query, $dateFrom) {
                $query->where('work_date', '>=', $dateFrom);
            })
            ->when($dateTo, function ($query, $dateTo) {
                $query->where('work_date', '<=', $dateTo);
            })
            ->with([
                'user',
                'employee',
                'createdBy',
            ])
            ->orderBy('work_date', 'desc')
            ->orderBy('created_at', 'desc')
            ->paginate(10)
            ->withQueryString();

        // Get project team members for dropdown with hourly rates (both users and employees)
        $teamMembers = $project->team()
            ->active()
            ->current()
            ->with(['user', 'employee'])
            ->get()
            ->map(function ($teamMember) {
                if ($teamMember->assignable_type === 'employee' && $teamMember->employee) {
                    return [
                        'id' => $teamMember->employee->id,
                        'name' => $teamMember->employee->first_name.' '.$teamMember->employee->last_name,
                        'email' => $teamMember->employee->email,
                        'hourly_rate' => $teamMember->hourly_rate,
                        'type' => 'employee',
                    ];
                } elseif ($teamMember->user) {
                    return [
                        'id' => $teamMember->user->id,
                        'name' => $teamMember->user->name,
                        'email' => $teamMember->user->email,
                        'hourly_rate' => $teamMember->hourly_rate,
                        'type' => 'user',
                    ];
                }

                return null;
            })
            ->filter();

        // Calculate totals
        $totalHours = (float) ProjectLaborCost::where('project_id', $project->id)
            ->when($dateFrom, function ($query, $dateFrom) {
                $query->where('work_date', '>=', $dateFrom);
            })
            ->when($dateTo, function ($query, $dateTo) {
                $query->where('work_date', '<=', $dateTo);
            })
            ->sum('hours_worked') ?? 0;

        $totalCost = (float) ProjectLaborCost::where('project_id', $project->id)
            ->when($dateFrom, function ($query, $dateFrom) {
                $query->where('work_date', '>=', $dateFrom);
            })
            ->when($dateTo, function ($query, $dateTo) {
                $query->where('work_date', '<=', $dateTo);
            })
            ->get()
            ->sum(function ($cost) {
                return (float) $cost->hours_worked * (float) $cost->hourly_rate;
            }) ?? 0;

        return [
            'project' => $project->load('client'),
            'laborCosts' => $laborCosts,
            'teamMembers' => $teamMembers,
            'totalHours' => $totalHours,
            'totalCost' => $totalCost,
            'search' => $search,
            'dateFrom' => $dateFrom,
            'dateTo' => $dateTo,
        ];
    }
}
