<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\DirectSupply;
use App\Models\MaterialReceivingReport;
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
        $search    = $request->input('search');
        $category  = $request->input('category');
        $isActive  = $request->input('is_active');
        $sortBy    = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');

        $allowedSortColumns = ['created_at', 'supply_code', 'supply_name', 'category', 'unit_price', 'supplier_name', 'is_active'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'created_at';
        }
        $sortOrder = in_array(strtolower($sortOrder), ['asc', 'desc']) ? strtolower($sortOrder) : 'desc';

        $supplies = DirectSupply::with(['createdBy'])
            ->withCount('allocations')
            ->where('is_archived', false)
            ->when($search, function ($query, $search) {
                $query->where(function ($q) use ($search) {
                    $q->where('supply_code', 'like', "%{$search}%")
                      ->orWhere('supply_name', 'like', "%{$search}%")
                      ->orWhere('category', 'like', "%{$search}%")
                      ->orWhere('supplier_name', 'like', "%{$search}%");
                });
            })
            ->when($category, fn ($q, $v) => $q->where('category', $v))
            ->when($isActive !== null && $isActive !== '', fn ($q) => $q->where('is_active', filter_var($isActive, FILTER_VALIDATE_BOOLEAN)))
            ->orderBy($sortBy, $sortOrder)
            ->when($sortBy !== 'created_at', fn ($q) => $q->orderBy('created_at', 'desc'))
            ->paginate(10);

        $stats = [
            'total_supplies'  => DirectSupply::where('is_archived', false)->count(),
            'active_supplies' => DirectSupply::where('is_active', true)->where('is_archived', false)->count(),
        ];

        $categories = DirectSupply::distinct()
            ->where('is_archived', false)
            ->whereNotNull('category')
            ->pluck('category')->sort()->values();

        $projects = Project::whereNull('archived_at')
            ->where('status', 'active')
            ->orderBy('project_name')
            ->get(['id', 'project_code', 'project_name']);

        // Transactions — all allocations for direct supplies
        $transactionsSearch = $request->input('transactions_search');
        $transactions = ProjectMaterialAllocation::with([
                'directSupply:id,supply_code,supply_name,unit_of_measure',
                'project:id,project_code,project_name',
                'allocatedBy:id,first_name,middle_name,last_name',
            ])
            ->whereNotNull('direct_supply_id')
            ->when($transactionsSearch, function ($q, $s) {
                $q->where(function ($q2) use ($s) {
                    $q2->whereHas('directSupply', fn ($dq) =>
                        $dq->where('supply_name', 'ilike', "%{$s}%")->orWhere('supply_code', 'ilike', "%{$s}%")
                    )->orWhereHas('project', fn ($pq) =>
                        $pq->where('project_name', 'ilike', "%{$s}%")->orWhere('project_code', 'ilike', "%{$s}%")
                    )->orWhere('notes', 'ilike', "%{$s}%");
                });
            })
            ->orderBy('allocated_at', 'desc')
            ->paginate(20)
            ->withQueryString();

        // Receiving reports — only for direct supply allocations
        $receivingSearch = $request->input('receiving_reports_search');
        $receivingReports = MaterialReceivingReport::with([
                'materialAllocation' => fn ($q) => $q->with([
                    'directSupply:id,supply_code,supply_name,unit_of_measure',
                    'project:id,project_code,project_name',
                ]),
                'receivedBy:id,first_name,middle_name,last_name',
            ])
            ->whereHas('materialAllocation', fn ($q) => $q->whereNotNull('direct_supply_id'))
            ->when($receivingSearch, function ($q, $s) {
                $q->where(function ($q2) use ($s) {
                    $q2->whereHas('materialAllocation', function ($aq) use ($s) {
                        $aq->whereHas('directSupply', fn ($dq) =>
                            $dq->where('supply_name', 'ilike', "%{$s}%")->orWhere('supply_code', 'ilike', "%{$s}%")
                        )->orWhereHas('project', fn ($pq) =>
                            $pq->where('project_name', 'ilike', "%{$s}%")->orWhere('project_code', 'ilike', "%{$s}%")
                        );
                    })->orWhere('notes', 'ilike', "%{$s}%");
                });
            })
            ->orderBy('received_at', 'desc')
            ->paginate(20)
            ->withQueryString();

        return Inertia::render('DirectSupplyManagement/index', [
            'supplies'              => $supplies,
            'search'                => $search,
            'filters'               => ['category' => $category, 'is_active' => $isActive],
            'filterOptions'         => ['categories' => $categories],
            'sort_by'               => $sortBy,
            'sort_order'            => $sortOrder,
            'stats'                 => $stats,
            'projects'              => $projects,
            'transactions'          => $transactions,
            'transactionsSearch'    => $transactionsSearch,
            'receivingReports'      => $receivingReports,
            'receivingReportsSearch' => $receivingSearch,
        ]);
    }

    public function store(Request $request)
    {
        $data = $request->validate([
            'supply_name'     => 'required|string|max:255',
            'description'     => 'nullable|string',
            'category'        => 'nullable|string|max:255',
            'unit_of_measure' => 'required|string|max:50',
            'unit_price'      => 'required|numeric|min:0',
            'supplier_name'   => 'required|string|max:255',
            'supplier_contact'=> 'nullable|string|max:255',
            'is_active'       => 'boolean',
        ]);

        do {
            $random     = str_pad(rand(1, 999999), 6, '0', STR_PAD_LEFT);
            $supplyCode = 'DS-' . $random;
        } while (DirectSupply::where('supply_code', $supplyCode)->exists());

        $data['supply_code'] = $supplyCode;
        $data['created_by']  = auth()->id();
        $data['is_active']   = $data['is_active'] ?? true;
        $data['is_archived'] = false;

        $supply = DirectSupply::create($data);

        $this->adminActivityLogs('Direct Supply', 'Created', 'Created direct supply "' . $supply->supply_name . '" with code "' . $supply->supply_code . '"');
        $this->createSystemNotification('general', 'New Direct Supply Added', "A new direct supply '{$supply->supply_name}' ({$supply->supply_code}) from supplier '{$supply->supplier_name}' has been added.", null, route('direct-supply-management.index'));

        return back()->with('success', 'Direct supply created successfully');
    }

    public function update(Request $request, DirectSupply $directSupply)
    {
        $data = $request->validate([
            'supply_name'     => 'required|string|max:255',
            'description'     => 'nullable|string',
            'category'        => 'nullable|string|max:255',
            'unit_of_measure' => 'required|string|max:50',
            'unit_price'      => 'required|numeric|min:0',
            'supplier_name'   => 'required|string|max:255',
            'supplier_contact'=> 'nullable|string|max:255',
            'is_active'       => 'boolean',
        ]);

        unset($data['supply_code']);
        $directSupply->update($data);

        $this->adminActivityLogs('Direct Supply', 'Updated', 'Updated direct supply "' . $directSupply->supply_name . '"');
        $this->createSystemNotification('general', 'Direct Supply Updated', "Direct supply '{$directSupply->supply_name}' ({$directSupply->supply_code}) has been updated.", null, route('direct-supply-management.index'));

        return back()->with('success', 'Direct supply updated successfully');
    }

    public function destroy(DirectSupply $directSupply)
    {
        if ($directSupply->allocations()->exists()) {
            return back()->with('error', 'Cannot delete this supply because it has existing allocations. Please archive it instead to preserve the history.');
        }

        $supplyName = $directSupply->supply_name;
        $supplyCode = $directSupply->supply_code;
        $directSupply->delete();

        $this->adminActivityLogs('Direct Supply', 'Deleted', 'Deleted direct supply "' . $supplyName . '" with code "' . $supplyCode . '"');
        $this->createSystemNotification('general', 'Direct Supply Deleted', "Direct supply '{$supplyName}' ({$supplyCode}) has been deleted.", null, route('direct-supply-management.index'));

        return back()->with('success', 'Direct supply deleted successfully');
    }

    public function updateStatus(Request $request, DirectSupply $directSupply)
    {
        $request->validate(['is_active' => ['required', 'boolean']]);
        $directSupply->update(['is_active' => $request->input('is_active')]);

        $this->adminActivityLogs('Direct Supply', 'Update Status', 'Updated direct supply "' . $directSupply->supply_name . '" status to ' . ($request->boolean('is_active') ? 'Active' : 'Inactive'));

        return back()->with('success', 'Direct supply status updated successfully.');
    }

    public function archive(DirectSupply $directSupply)
    {
        $directSupply->update([
            'is_archived' => true,
            'is_active'   => false,
            'archived_at' => now(),
        ]);

        $this->adminActivityLogs('Direct Supply', 'Archived', 'Archived direct supply "' . $directSupply->supply_name . '" (' . $directSupply->supply_code . ')');
        $this->createSystemNotification('general', 'Direct Supply Archived', "Direct supply '{$directSupply->supply_name}' ({$directSupply->supply_code}) has been archived.", null, route('direct-supply-management.index'));

        return back()->with('success', 'Direct supply archived successfully.');
    }

    public function restore(DirectSupply $directSupply)
    {
        $directSupply->update([
            'is_archived' => false,
            'is_active'   => true,
            'archived_at' => null,
        ]);

        $this->adminActivityLogs('Direct Supply', 'Restored', 'Restored direct supply "' . $directSupply->supply_name . '" (' . $directSupply->supply_code . ')');

        return back()->with('success', 'Direct supply restored successfully.');
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

        $this->adminActivityLogs('Direct Supply', 'Allocated', 'Allocated ' . $data['quantity'] . ' ' . $directSupply->unit_of_measure . ' of "' . $directSupply->supply_name . '" to project "' . ($project->project_name ?? '') . '"');
        $this->createSystemNotification('general', 'Direct Supply Allocated', "'{$directSupply->supply_name}' ({$data['quantity']} {$directSupply->unit_of_measure}) has been allocated to project '{$project->project_name}'.", $project, route('project-management.view', $data['project_id']));

        return back()->with('success', 'Direct supply allocated to project successfully.');
    }
}
