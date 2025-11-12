<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Traits\ActivityLogsTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class EmployeesController extends Controller
{
    use ActivityLogsTrait;

    public function index(Request $request)
    {
        $search = $request->input('search');

        $employees = Employee::when($search, function ($query, $search) {
                return $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'ilike', "%{$search}%")
                      ->orWhere('last_name', 'ilike', "%{$search}%")
                      ->orWhere('email', 'ilike', "%{$search}%")
                      ->orWhere('phone', 'ilike', "%{$search}%")
                      ->orWhere('position', 'ilike', "%{$search}%")
                      ->orWhere('is_active', 'ilike', "%{$search}%");
                });
            })
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return Inertia::render('EmployeeManagement/index', [
            'employees' => $employees,
            'search' => $search,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'first_name' => ['required', 'max:100'],
            'last_name'  => ['required', 'max:100'],
            'email'      => ['required', 'email', Rule::unique('employees', 'email')],
            'phone'      => ['nullable', 'string', 'max:20'],
            'position'   => ['nullable', 'string', 'max:100'],
            'is_active' => ['required', 'boolean'],
        ]);

        $employee = Employee::create($validated);

        $this->adminActivityLogs('Employee', 'Add', 'Added Employee ' . $employee->first_name . ' ' . $employee->last_name);
    }

    public function update(Request $request, Employee $employee)
    {
        $validated = $request->validate([
            'first_name' => ['required', 'max:100'],
            'last_name'  => ['required', 'max:100'],
            'email' => [
                    'required',
                    'email',
                    Rule::unique('employees', 'email')->ignore($employee->id, $employee->getKeyName())

                ],
            'phone'      => ['nullable', 'string', 'max:20'],
            'position'   => ['nullable', 'string', 'max:100'],
            'is_active' => ['required', 'boolean'],
        ]);

        $oldName = $employee->first_name . ' ' . $employee->last_name;

        $employee->update($validated);

        $this->adminActivityLogs('Employee', 'Update', 'Updated Employee ' . $oldName . ' to ' . $validated['first_name'] . ' ' . $validated['last_name']);
    }

    public function destroy(Employee $employee)
    {
        $name = $employee->first_name . ' ' . $employee->last_name;

        try {
            $employee->delete();

            $this->adminActivityLogs('Employee', 'Delete', 'Deleted Employee ' . $name);

            return redirect()->back()->with('success', 'Employee deleted successfully.');
        } catch (\Illuminate\Database\QueryException $e) {
            // Check for foreign key violation (Postgres: 23503)
            if ($e->getCode() == "23503") {
                return redirect()->back()->with('error', "Cannot delete employee {$name} because they are still assigned to a project team.");
            }

            return redirect()->back()->with('error', 'Failed to delete employee. Please try again.');
        }
    }


    public function handleStatus(Request $request, Employee $employee)
    {
        $request->validate([
            'is_active' => ['required'],
        ]);

        // ✅ Check if employee is assigned to any project team
        // if ($employee->projectTeams()->exists()) {
        //     return redirect()->back()->with(
        //         'error',
        //         "Cannot update status. Employee {$employee->first_name} {$employee->last_name} is still assigned to a project team."
        //     );
        // }

        $employee->update([
            'is_active' => $request->boolean('is_active'),
        ]);

        $this->adminActivityLogs(
            'Employee',
            'Update Status',
            'Updated Employee ' . $employee->first_name . ' ' . $employee->last_name .
            ' status to ' . ($employee->is_active ? 'Active' : 'Inactive')
        );

        return redirect()->back()->with('success', 'Status updated successfully.');
    }
}
