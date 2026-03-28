<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DirectSupply;
use App\Models\Project;
use App\Models\ProjectMaterialAllocation;
use App\Traits\ActivityLogsTrait;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;
use Inertia\Inertia;

class DirectSuppliesController extends Controller
{
    use ActivityLogsTrait, NotificationTrait;

    public function index(Request $request)
    {
        $search = $request->input('search');
        $category = $request->input('category');
        $isActive = $request->input('is_active');
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');

        $allowedSortColumns = ['created_at', 'supply_code', 'supply_name', 'category', 'unit_price', 'supplier_name', 'is_active'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'created_at';
        }

        $sortOrder = in_array(strtolower($sortOrder), ['asc', 'desc']) ? strtolower($sortOrder) : 'desc';

        $supplies = DirectSupply::with(['createdBy'])
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('supply_code', 'like', "%{$search}%")
                      ->orWhere('supply_name', 'like', "%{$search}%")
                      ->orWhere('category', 'like', "%{$search}%")
                      ->orWhere('supplier_name', 'like', "%{$search}%");
                });
            })
            ->when($category, function ($query, $category) {
                $query->where('category', $category);
            })
            ->when($isActive !== null && $isActive !== '', function ($query) use ($isActive) {
                $query->where('is_active', filter_var($isActive, FILTER_VALIDATE_BOOLEAN));
            })
            ->orderBy($sortBy, $sortOrder)
            ->when($sortBy !== 'created_at', function ($query) {
                $query->orderBy('created_at', 'desc');
            })
            ->paginate(10);

        $stats = [
            'total_supplies' => DirectSupply::count(),
            'active_supplies' => DirectSupply::where('is_active', true)->count(),
        ];

        $categories = DirectSupply::distinct()
            ->whereNotNull('category')
            ->pluck('category')
            ->sort()
            ->values();

        $projects = Project::whereNull('archived_at')
            ->where('status', 'active')
            ->orderBy('project_name')
            ->get(['id', 'project_code', 'project_name']);

        return Inertia::render('DirectSupplyManagement/index', [
            'supplies' => $supplies,
            'search' => $search,
            'filters' => [
                'category' => $category,
                'is_active' => $isActive,
            ],
            'filterOptions' => [
                'categories' => $categories,
            ],
            'sort_by' => $sortBy,
            'sort_order' => $sortOrder,
            'stats' => $stats,
            'projects' => $projects,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'supply_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:255',
            'unit_of_measure' => 'required|string|max:50',
            'unit_price' => 'required|numeric|min:0',
            'supplier_name' => 'required|string|max:255',
            'supplier_contact' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        do {
            $random = str_pad(rand(1, 999999), 6, '0', STR_PAD_LEFT);
            $supplyCode = 'DS-' . $random;
        } while (DirectSupply::where('supply_code', $supplyCode)->exists());

        $data['supply_code'] = $supplyCode;
        $data['created_by'] = auth()->id();
        $data['is_active'] = $data['is_active'] ?? true;

        $supply = DirectSupply::create($data);

        $this->adminActivityLogs(
            'Direct Supply',
            'Created',
            'Created direct supply "' . $supply->supply_name . '" with code "' . $supply->supply_code . '"'
        );

        $this->createSystemNotification(
            'general',
            'New Direct Supply Added',
            "A new direct supply '{$supply->supply_name}' ({$supply->supply_code}) from supplier '{$supply->supplier_name}' has been added.",
            null,
            route('direct-supply-management.index')
        );

        return back()->with('success', 'Direct supply created successfully');
    }

    public function update(Request $request, DirectSupply $directSupply)
    {
        $data = $request->validate([
            'supply_name' => 'required|string|max:255',
            'description' => 'nullable|string',
            'category' => 'nullable|string|max:255',
            'unit_of_measure' => 'required|string|max:50',
            'unit_price' => 'required|numeric|min:0',
            'supplier_name' => 'required|string|max:255',
            'supplier_contact' => 'nullable|string|max:255',
            'is_active' => 'boolean',
        ]);

        unset($data['supply_code']);

        $directSupply->update($data);

        $this->adminActivityLogs(
            'Direct Supply',
            'Updated',
            'Updated direct supply "' . $directSupply->supply_name . '"'
        );

        $this->createSystemNotification(
            'general',
            'Direct Supply Updated',
            "Direct supply '{$directSupply->supply_name}' ({$directSupply->supply_code}) has been updated.",
            null,
            route('direct-supply-management.index')
        );

        return back()->with('success', 'Direct supply updated successfully');
    }

    public function destroy(DirectSupply $directSupply)
    {
        $supplyName = $directSupply->supply_name;
        $supplyCode = $directSupply->supply_code;

        $directSupply->delete();

        $this->adminActivityLogs(
            'Direct Supply',
            'Deleted',
            'Deleted direct supply "' . $supplyName . '" with code "' . $supplyCode . '"'
        );

        $this->createSystemNotification(
            'general',
            'Direct Supply Deleted',
            "Direct supply '{$supplyName}' ({$supplyCode}) has been deleted.",
            null,
            route('direct-supply-management.index')
        );

        return back()->with('success', 'Direct supply deleted successfully');
    }

    public function updateStatus(Request $request, DirectSupply $directSupply)
    {
        $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        $directSupply->update([
            'is_active' => $request->input('is_active'),
        ]);

        $this->adminActivityLogs(
            'Direct Supply',
            'Update Status',
            'Updated direct supply "' . $directSupply->supply_name . '" status to ' . ($request->boolean('is_active') ? 'Active' : 'Inactive')
        );

        return back()->with('success', 'Direct supply status updated successfully.');
    }

    public function allocate(Request $request, DirectSupply $directSupply)
    {
        $data = $request->validate([
            'project_id' => ['required', 'exists:projects,id'],
            'quantity'   => ['required', 'numeric', 'min:0.01'],
            'unit_price' => ['nullable', 'numeric', 'min:0'],
            'notes'      => ['nullable', 'string'],
        ]);

        ProjectMaterialAllocation::create([
            'project_id'         => $data['project_id'],
            'direct_supply_id'   => $directSupply->id,
            'inventory_item_id'  => null,
            'unit_price'         => $data['unit_price'] ?? $directSupply->unit_price,
            'quantity_allocated' => $data['quantity'],
            'quantity_received'  => 0,
            'status'             => 'pending',
            'allocated_by'       => auth()->id(),
            'allocated_at'       => now(),
            'notes'              => $data['notes'] ?? null,
        ]);

        $project = Project::find($data['project_id']);

        $this->adminActivityLogs(
            'Direct Supply',
            'Allocated',
            'Allocated ' . $data['quantity'] . ' ' . $directSupply->unit_of_measure . ' of "' . $directSupply->supply_name . '" to project "' . ($project->project_name ?? '') . '"'
        );

        $this->createSystemNotification(
            'general',
            'Direct Supply Allocated',
            "'{$directSupply->supply_name}' ({$data['quantity']} {$directSupply->unit_of_measure}) has been allocated to project '{$project->project_name}'.",
            $project,
            route('project-management.view', $data['project_id'])
        );

        return back()->with('success', 'Direct supply allocated to project successfully.');
    }
}
