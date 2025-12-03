<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectMiscellaneousExpense;

class MiscellaneousExpenseService
{
    public function getProjectMiscellaneousExpensesData(Project $project)
    {
        $search = request('search');
        $expenseType = request('expense_type');
        $dateFrom = request('date_from');
        $dateTo = request('date_to');
        $sortBy = request('sort_by', 'expense_date');
        $sortOrder = request('sort_order', 'desc');

        $allowedSortColumns = ['expense_date', 'expense_type', 'expense_name', 'amount', 'created_at'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'expense_date';
        }
        $sortOrder = in_array(strtolower($sortOrder), ['asc', 'desc']) ? strtolower($sortOrder) : 'desc';

        // Load miscellaneous expenses with related data and pagination
        $expenses = ProjectMiscellaneousExpense::where('project_id', $project->id)
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('expense_name', 'ilike', "%{$search}%")
                      ->orWhere('expense_type', 'ilike', "%{$search}%")
                      ->orWhere('description', 'ilike', "%{$search}%")
                      ->orWhere('notes', 'ilike', "%{$search}%");
                });
            })
            ->when($expenseType, function ($query, $expenseType) {
                $query->where('expense_type', 'ilike', "%{$expenseType}%");
            })
            ->when($dateFrom, function ($query, $dateFrom) {
                $query->where('expense_date', '>=', $dateFrom);
            })
            ->when($dateTo, function ($query, $dateTo) {
                $query->where('expense_date', '<=', $dateTo);
            })
            ->with(['createdBy'])
            ->orderBy($sortBy, $sortOrder)
            ->paginate(10)
            ->withQueryString();

        // Calculate totals
        $totalExpenses = (float) ProjectMiscellaneousExpense::where('project_id', $project->id)
            ->when($dateFrom, function ($query, $dateFrom) {
                $query->where('expense_date', '>=', $dateFrom);
            })
            ->when($dateTo, function ($query, $dateTo) {
                $query->where('expense_date', '<=', $dateTo);
            })
            ->sum('amount') ?? 0;

        // Get unique expense types for filters
        $expenseTypes = ProjectMiscellaneousExpense::where('project_id', $project->id)
            ->distinct()
            ->whereNotNull('expense_type')
            ->pluck('expense_type')
            ->sort()
            ->values();

        return [
            'project' => $project->load('client'),
            'expenses' => $expenses,
            'totalExpenses' => $totalExpenses,
            'search' => $search,
            'filters' => [
                'expense_type' => $expenseType,
                'date_from' => $dateFrom,
                'date_to' => $dateTo,
            ],
            'filterOptions' => [
                'expenseTypes' => $expenseTypes,
            ],
            'sort_by' => $sortBy,
            'sort_order' => $sortOrder,
        ];
    }
}

