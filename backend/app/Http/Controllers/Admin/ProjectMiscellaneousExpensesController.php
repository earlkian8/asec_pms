<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectMiscellaneousExpense;
use App\Traits\ActivityLogsTrait;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;

class ProjectMiscellaneousExpensesController extends Controller
{
    use ActivityLogsTrait, NotificationTrait;

    // Store miscellaneous expense
    public function store(Project $project, Request $request)
    {
        $data = $request->validate([
            'expense_type' => ['required', 'string', 'max:100'],
            'expense_name' => ['required', 'string', 'max:255'],
            'expense_date' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'description' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string'],
        ]);

        $data['project_id'] = $project->id;
        $data['created_by'] = auth()->id();

        $expense = ProjectMiscellaneousExpense::create($data);

        $this->adminActivityLogs(
            'Miscellaneous Expense',
            'Created',
            'Created miscellaneous expense: '.$data['expense_name'].' - ₱'.number_format($data['amount'], 2).' on '.$data['expense_date'].' for project "'.$project->project_name.'"'
        );

        // System-wide notification for new expense
        $this->createSystemNotification(
            'general',
            'New Expense Recorded',
            "A miscellaneous expense '{$data['expense_name']}' (₱".number_format($data['amount'], 2).") has been recorded for project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );

        return back()->with('success', 'Miscellaneous expense created successfully.');
    }

    // Update miscellaneous expense
    public function update(Project $project, Request $request, ProjectMiscellaneousExpense $expense)
    {
        $data = $request->validate([
            'expense_type' => ['required', 'string', 'max:100'],
            'expense_name' => ['required', 'string', 'max:255'],
            'expense_date' => ['required', 'date'],
            'amount' => ['required', 'numeric', 'min:0.01'],
            'description' => ['nullable', 'string', 'max:500'],
            'notes' => ['nullable', 'string'],
        ]);

        $expense->update($data);

        $this->adminActivityLogs(
            'Miscellaneous Expense',
            'Updated',
            'Updated miscellaneous expense: '.$data['expense_name'].' for project "'.$project->project_name.'"'
        );

        return back()->with('success', 'Miscellaneous expense updated successfully.');
    }

    // Delete miscellaneous expense
    public function destroy(Project $project, ProjectMiscellaneousExpense $expense)
    {
        $expenseName = $expense->expense_name;
        $expenseDate = $expense->expense_date;
        $amount = $expense->amount;

        $expense->delete();

        $this->adminActivityLogs(
            'Miscellaneous Expense',
            'Deleted',
            'Deleted miscellaneous expense: '.$expenseName.' - ₱'.number_format($amount, 2).' on '.$expenseDate.' from project "'.$project->project_name.'"'
        );

        // System-wide notification for miscellaneous expense deletion
        $this->createSystemNotification(
            'general',
            'Miscellaneous Expense Deleted',
            "Miscellaneous expense '{$expenseName}' (₱".number_format($amount, 2).") has been deleted from project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );

        return back()->with('success', 'Miscellaneous expense deleted successfully.');
    }
}
