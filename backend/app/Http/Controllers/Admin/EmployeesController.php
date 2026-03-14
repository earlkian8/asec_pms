<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Employee;
use App\Models\User;
use App\Traits\ActivityLogsTrait;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class EmployeesController extends Controller
{
    use ActivityLogsTrait, NotificationTrait;

    // ── Image helpers ─────────────────────────────────────────────────────────

    private array $imageFields = [
        'profile_image',
        'sss_id_image',
        'philhealth_id_image',
        'pagibig_id_image',
        'tin_id_image',
    ];

    private function imageRules(): array
    {
        return [
            'profile_image'       => 'nullable|image|mimes:jpg,jpeg,png,webp|max:2048',
            'sss_id_image'        => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'philhealth_id_image' => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'pagibig_id_image'    => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
            'tin_id_image'        => 'nullable|image|mimes:jpg,jpeg,png,webp|max:5120',
        ];
    }

    private function storeImage(Request $request, string $field, string $folder): ?string
    {
        return ($request->hasFile($field) && $request->file($field)->isValid())
            ? $request->file($field)->store($folder, 'public')
            : null;
    }

    private function replaceImage(Request $request, string $field, string $folder, ?string $existing): ?string
    {
        if ($request->hasFile($field) && $request->file($field)->isValid()) {
            if ($existing) Storage::disk('public')->delete($existing);
            return $request->file($field)->store($folder, 'public');
        }
        return $existing;
    }

    // ── Shared validation rules ───────────────────────────────────────────────

    private function baseRules(bool $isCreate = true, ?Employee $employee = null): array
    {
        return array_merge([
            'first_name' => ['required', 'string', 'max:100'],
            'last_name'  => ['required', 'string', 'max:100'],
            'email'      => [
                'required', 'email',
                $isCreate
                    ? Rule::unique('employees', 'email')
                    : Rule::unique('employees', 'email')->ignore($employee->id),
            ],
            'phone'     => ['nullable', 'string', 'max:30'],
            'position'  => ['nullable', 'string', 'max:150'],
            'is_active' => ['required', 'boolean'],

            // Personal
            'secondary_phone' => ['nullable', 'string', 'max:30'],
            'gender'          => ['nullable', 'in:male,female,other,prefer_not_to_say'],
            'date_of_birth'   => ['nullable', 'date', 'before:today'],
            'civil_status'    => ['nullable', 'in:single,married,widowed,separated,divorced'],
            'nationality'     => ['nullable', 'string', 'max:100'],

            // Address
            'region'            => ['nullable', 'string', 'max:150'],
            'province'          => ['nullable', 'string', 'max:150'],
            'city_municipality' => ['nullable', 'string', 'max:150'],
            'barangay'          => ['nullable', 'string', 'max:150'],
            'address'           => ['nullable', 'string'],
            'zip_code'          => ['nullable', 'string', 'max:20'],

            // Emergency
            'emergency_contact_name'         => ['nullable', 'string', 'max:150'],
            'emergency_contact_relationship' => ['nullable', 'string', 'max:80'],
            'emergency_contact_phone'        => ['nullable', 'string', 'max:30'],

            // Gov IDs
            'sss_number'        => ['nullable', 'string', 'max:30'],
            'philhealth_number' => ['nullable', 'string', 'max:30'],
            'pagibig_number'    => ['nullable', 'string', 'max:30'],
            'tin_number'        => ['nullable', 'string', 'max:30'],

            'notes' => ['nullable', 'string'],
        ], $this->imageRules());
    }

    // ── index ─────────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $search    = $request->input('search');
        $isActive  = $request->input('is_active');
        $position  = $request->input('position');
        $sortBy    = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');

        $allowedSortColumns = ['created_at', 'first_name', 'last_name', 'email', 'position', 'is_active'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'created_at';
        }
        $sortOrder = in_array(strtolower($sortOrder), ['asc', 'desc']) ? strtolower($sortOrder) : 'desc';

        $employees = Employee::withCount('projectTeams')
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('first_name', 'like', "%{$search}%")
                      ->orWhere('last_name', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('phone', 'like', "%{$search}%")
                      ->orWhere('position', 'like', "%{$search}%")
                      ->orWhere('employee_id', 'like', "%{$search}%")
                      ->orWhereRaw("CONCAT(first_name, ' ', last_name) LIKE ?", ["%{$search}%"]);
                });
            })
            ->when($isActive !== null && $isActive !== '', function ($query) use ($isActive) {
                $query->where('is_active', filter_var($isActive, FILTER_VALIDATE_BOOLEAN));
            })
            ->when($position, function ($query, $position) {
                $query->where('position', 'like', "%{$position}%");
            })
            ->orderBy($sortBy, $sortOrder)
            ->when($sortBy !== 'created_at', fn ($q) => $q->orderBy('created_at', 'desc'))
            ->paginate(10);

        $stats = [
            'total'    => Employee::count(),
            'active'   => Employee::where('is_active', true)->count(),
            'inactive' => Employee::where('is_active', false)->count(),
        ];

        $positions = Employee::distinct()->whereNotNull('position')->pluck('position')->sort()->values();

        return Inertia::render('EmployeeManagement/index', [
            'employees'     => $employees,
            'search'        => $search,
            'filters'       => ['is_active' => $isActive, 'position' => $position],
            'filterOptions' => ['positions' => $positions],
            'sort_by'       => $sortBy,
            'sort_order'    => $sortOrder,
            'stats'         => $stats,
        ]);
    }

    // ── store ─────────────────────────────────────────────────────────────────

    public function store(Request $request)
    {
        $v = $request->validate($this->baseRules(true));

        $employee = Employee::create([
            'first_name' => $v['first_name'],
            'last_name'  => $v['last_name'],
            'email'      => $v['email'],
            'phone'      => $v['phone'] ?? null,
            'position'   => $v['position'] ?? null,
            'is_active'  => $v['is_active'],

            'profile_image'   => $this->storeImage($request, 'profile_image', 'employee-profile-images'),

            'secondary_phone' => $v['secondary_phone'] ?? null,
            'gender'          => $v['gender'] ?? null,
            'date_of_birth'   => $v['date_of_birth'] ?? null,
            'civil_status'    => $v['civil_status'] ?? null,
            'nationality'     => $v['nationality'] ?? null,

            'region'            => $v['region'] ?? null,
            'province'          => $v['province'] ?? null,
            'city_municipality' => $v['city_municipality'] ?? null,
            'barangay'          => $v['barangay'] ?? null,
            'address'           => $v['address'] ?? null,
            'zip_code'          => $v['zip_code'] ?? null,

            'emergency_contact_name'         => $v['emergency_contact_name'] ?? null,
            'emergency_contact_relationship' => $v['emergency_contact_relationship'] ?? null,
            'emergency_contact_phone'        => $v['emergency_contact_phone'] ?? null,

            'sss_number'          => $v['sss_number'] ?? null,
            'sss_id_image'        => $this->storeImage($request, 'sss_id_image', 'employee-gov-ids/sss'),
            'philhealth_number'   => $v['philhealth_number'] ?? null,
            'philhealth_id_image' => $this->storeImage($request, 'philhealth_id_image', 'employee-gov-ids/philhealth'),
            'pagibig_number'      => $v['pagibig_number'] ?? null,
            'pagibig_id_image'    => $this->storeImage($request, 'pagibig_id_image', 'employee-gov-ids/pagibig'),
            'tin_number'          => $v['tin_number'] ?? null,
            'tin_id_image'        => $this->storeImage($request, 'tin_id_image', 'employee-gov-ids/tin'),

            'notes' => $v['notes'] ?? null,
        ]);

        // employee_id is auto-generated via model boot (EMP-00001 etc.)

        $this->adminActivityLogs('Employee', 'Add', "Added Employee {$employee->full_name} ({$employee->employee_id})");
        $this->createSystemNotification(
            'general', 'New Employee Added',
            "A new employee '{$employee->full_name}' ({$employee->position}) has been added.",
            null, route('employee-management.index')
        );

        return redirect()->back()->with('success', 'Employee added successfully.');
    }

    // ── update ────────────────────────────────────────────────────────────────

    public function update(Request $request, Employee $employee)
    {
        $v = $request->validate($this->baseRules(false, $employee));

        $oldName = $employee->full_name;

        $employee->update([
            'first_name' => $v['first_name'],
            'last_name'  => $v['last_name'],
            'email'      => $v['email'],
            'phone'      => $v['phone'] ?? null,
            'position'   => $v['position'] ?? null,
            'is_active'  => $v['is_active'],

            'profile_image' => $this->replaceImage($request, 'profile_image', 'employee-profile-images', $employee->profile_image),

            'secondary_phone' => $v['secondary_phone'] ?? null,
            'gender'          => $v['gender'] ?? null,
            'date_of_birth'   => $v['date_of_birth'] ?? null,
            'civil_status'    => $v['civil_status'] ?? null,
            'nationality'     => $v['nationality'] ?? null,

            'region'            => $v['region'] ?? null,
            'province'          => $v['province'] ?? null,
            'city_municipality' => $v['city_municipality'] ?? null,
            'barangay'          => $v['barangay'] ?? null,
            'address'           => $v['address'] ?? null,
            'zip_code'          => $v['zip_code'] ?? null,

            'emergency_contact_name'         => $v['emergency_contact_name'] ?? null,
            'emergency_contact_relationship' => $v['emergency_contact_relationship'] ?? null,
            'emergency_contact_phone'        => $v['emergency_contact_phone'] ?? null,

            'sss_number'          => $v['sss_number'] ?? null,
            'sss_id_image'        => $this->replaceImage($request, 'sss_id_image', 'employee-gov-ids/sss', $employee->sss_id_image),
            'philhealth_number'   => $v['philhealth_number'] ?? null,
            'philhealth_id_image' => $this->replaceImage($request, 'philhealth_id_image', 'employee-gov-ids/philhealth', $employee->philhealth_id_image),
            'pagibig_number'      => $v['pagibig_number'] ?? null,
            'pagibig_id_image'    => $this->replaceImage($request, 'pagibig_id_image', 'employee-gov-ids/pagibig', $employee->pagibig_id_image),
            'tin_number'          => $v['tin_number'] ?? null,
            'tin_id_image'        => $this->replaceImage($request, 'tin_id_image', 'employee-gov-ids/tin', $employee->tin_id_image),

            'notes' => $v['notes'] ?? null,
        ]);

        $this->adminActivityLogs('Employee', 'Update', "Updated Employee {$oldName} to {$employee->full_name}");
        $this->createSystemNotification(
            'general', 'Employee Updated',
            "Employee '{$employee->full_name}' has been updated.",
            null, route('employee-management.index')
        );

        return back()->with('success', 'Employee updated successfully.');
    }

    // ── destroy ───────────────────────────────────────────────────────────────

    public function destroy(Employee $employee)
    {
        $name = $employee->full_name;

        if ($employee->projectTeams()->exists()) {
            return redirect()->back()->with(
                'error',
                "Cannot delete employee {$name} because they are still assigned to a project team."
            );
        }

        try {
            // Soft delete — do NOT delete images (record still exists and may be restored)
            $employee->delete();

            $this->adminActivityLogs('Employee', 'Delete', "Deleted Employee {$name}");
            $this->createSystemNotification(
                'general', 'Employee Deleted',
                "Employee '{$name}' has been deleted.",
                null, route('employee-management.index')
            );

            return redirect()->back()->with('success', 'Employee deleted successfully.');
        } catch (\Illuminate\Database\QueryException $e) {
            if ($e->getCode() == '23503') {
                return redirect()->back()->with('error', "Cannot delete employee {$name} because they are still assigned to a project team.");
            }
            return redirect()->back()->with('error', 'Failed to delete employee. Please try again.');
        }
    }

    // ── handleStatus ──────────────────────────────────────────────────────────

    public function handleStatus(Request $request, Employee $employee)
    {
        $request->validate(['is_active' => ['required']]);

        if ($employee->projectTeams()->exists()) {
            return redirect()->back()->with(
                'error',
                "Cannot update status. Employee {$employee->full_name} is still assigned to a project team."
            );
        }

        $employee->update(['is_active' => $request->boolean('is_active')]);

        $this->adminActivityLogs(
            'Employee', 'Update Status',
            "Updated Employee {$employee->full_name} status to " . ($employee->is_active ? 'Active' : 'Inactive')
        );

        $status = $employee->is_active ? 'Active' : 'Inactive';
        $this->createSystemNotification(
            'status_change', 'Employee Status Updated',
            "Employee '{$employee->full_name}' status has been changed to {$status}.",
            null, route('employee-management.index')
        );

        return back()->with('success', 'Status updated successfully.');
    }
}