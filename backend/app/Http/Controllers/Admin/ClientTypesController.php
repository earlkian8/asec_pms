<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClientType;
use App\Traits\ActivityLogsTrait;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ClientTypesController extends Controller
{
    use ActivityLogsTrait, NotificationTrait;

    public function index(Request $request)
    {
        $search = $request->input('search');
        $isActive = $request->input('is_active');
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');

        // Validate sort column
        $allowedSortColumns = ['created_at', 'name', 'is_active', 'clients_count'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'created_at';
        }

        // Validate sort order
        $sortOrder = in_array(strtolower($sortOrder), ['asc', 'desc']) ? strtolower($sortOrder) : 'desc';

        $clientTypes = ClientType::withCount('clients')
            ->when($search, function ($query, $search) {
                return $query->where(function ($q) use ($search) {
                    $q->where('name', 'like', "%{$search}%")
                      ->orWhere('description', 'like', "%{$search}%");
                });
            })
            ->when($isActive !== null && $isActive !== '', function ($query) use ($isActive) {
                $query->where('is_active', $isActive === 'true' || $isActive === true || $isActive === '1' || $isActive === 1);
            })
            ->when($sortBy === 'clients_count', function ($query) use ($sortOrder) {
                // clients_count is an aggregate alias — must use orderByRaw
                $query->orderByRaw("clients_count {$sortOrder}")->orderBy('created_at', 'desc');
            })
            ->when($sortBy !== 'clients_count', function ($query) use ($sortBy, $sortOrder) {
                $query->orderBy($sortBy, $sortOrder)
                      ->when($sortBy !== 'created_at', fn ($q) => $q->orderBy('created_at', 'desc'))
                      ->when($sortBy === 'created_at', fn ($q) => $q->orderBy('id', 'desc'));
            })
            ->paginate(10);

        // Compute stats from ALL records (not paginated)
        $stats = [
            'total'          => ClientType::count(),
            'active'         => ClientType::where('is_active', true)->count(),
            'inactive'       => ClientType::where('is_active', false)->count(),
            'total_clients'  => ClientType::withCount('clients')->get()->sum('clients_count'),
        ];

        return Inertia::render('ClientTypeManagement/index', [
            'clientTypes' => $clientTypes,
            'search'      => $search,
            'filters'     => [
                'is_active' => $isActive,
            ],
            'sort_by'     => $sortBy,
            'sort_order'  => $sortOrder,
            'stats'       => $stats,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'        => ['required', 'max:255', 'unique:client_types,name'],
            'description' => ['nullable', 'string'],
            'is_active'   => ['required', 'boolean'],
        ]);

        $clientType = ClientType::create($validated);

        $this->adminActivityLogs('ClientType', 'Add', 'Added Client Type ' . $clientType->name);

        try {
            $this->createSystemNotification(
                'general',
                'New Client Type Added',
                "A new client type '{$clientType->name}' has been added to the system.",
                null,
                route('client-type-management.index')
            );
        } catch (\Exception $e) {
            \Log::error('Failed to create system notification: ' . $e->getMessage());
        }

        return redirect()->back()->with('success', 'Client type added successfully.');
    }

    public function update(Request $request, ClientType $clientType)
    {
        $validated = $request->validate([
            'name'        => ['required', 'max:255', Rule::unique('client_types', 'name')->ignore($clientType->id)],
            'description' => ['nullable', 'string'],
            'is_active'   => ['required', 'boolean'],
        ]);

        $validated['is_active'] = filter_var($validated['is_active'], FILTER_VALIDATE_BOOLEAN);

        $oldName = $clientType->name;

        $clientType->update($validated);

        $this->adminActivityLogs('ClientType', 'Update', 'Updated Client Type ' . $oldName);

        try {
            $this->createSystemNotification(
                'general',
                'Client Type Updated',
                "Client type '{$clientType->name}' has been updated.",
                null,
                route('client-type-management.index')
            );
        } catch (\Exception $e) {
            \Log::error('Failed to create system notification: ' . $e->getMessage());
        }

        return redirect()->route('client-type-management.index')->with('success', 'Client type updated successfully.');
    }

    public function destroy(ClientType $clientType)
    {
        $name = $clientType->name;

        if ($clientType->clients()->exists()) {
            return back()->withErrors([
                'message' => 'This client type has existing clients and cannot be deleted.',
            ]);
        }

        $clientType->delete();

        $this->adminActivityLogs('ClientType', 'Delete', 'Deleted Client Type ' . $name);

        try {
            $this->createSystemNotification(
                'general',
                'Client Type Deleted',
                "Client type '{$name}' has been deleted.",
                null,
                route('client-type-management.index')
            );
        } catch (\Exception $e) {
            \Log::error('Failed to create system notification: ' . $e->getMessage());
        }

        return redirect()->route('client-type-management.index')->with('success', 'Client type deleted successfully.');
    }

    public function handleStatus(Request $request, ClientType $clientType)
    {
        $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        if ($clientType->clients()->exists()) {
            return back()->withErrors([
                'message' => 'Cannot change status of this client type because it is currently being used by clients.',
            ]);
        }

        $clientType->update([
            'is_active' => $request->input('is_active'),
        ]);

        $this->adminActivityLogs(
            'ClientType',
            'Update Status',
            'Updated Client Type ' . $clientType->name . ' status to ' . ($request->boolean('is_active') ? 'Active' : 'Inactive')
        );

        $status = $request->boolean('is_active') ? 'Active' : 'Inactive';
        try {
            $this->createSystemNotification(
                'status_change',
                'Client Type Status Updated',
                "Client type '{$clientType->name}' status has been changed to {$status}.",
                null,
                route('client-type-management.index')
            );
        } catch (\Exception $e) {
            \Log::error('Failed to create system notification: ' . $e->getMessage());
        }

        return redirect()->route('client-type-management.index')->with('success', 'Client type status updated successfully.');
    }
}