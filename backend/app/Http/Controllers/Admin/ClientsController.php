<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\ClientType;
use App\Models\User;
use App\Traits\ActivityLogsTrait;
use App\Traits\NotificationTrait;
use App\Mail\ClientCredentialsMail;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ClientsController extends Controller
{
    use ActivityLogsTrait, NotificationTrait;

    public function index(Request $request)
    {
        $search = $request->input('search');
        $clientTypeId = $request->input('client_type_id');
        $isActive = $request->input('is_active');
        $city = $request->input('city');
        $province = $request->input('province');
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');

        // Validate sort column
        $allowedSortColumns = ['created_at', 'client_name', 'client_code', 'is_active', 'city', 'province', 'email'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'created_at';
        }

        // Validate sort order
        $sortOrder = in_array(strtolower($sortOrder), ['asc', 'desc']) ? strtolower($sortOrder) : 'desc';

        $clients = Client::with('clientType')
            ->withCount([
                // Total projects (all statuses, non-deleted)
                'projects as projects_count',
                // Active/on-hold projects — blocks status toggle and deletion
                'projects as active_projects_count' => fn ($q) => $q->whereIn('status', ['active', 'on_hold']),
            ])
            ->when($search, function ($query, $search) {
                return $query->where(function ($q) use ($search) {
                    $q->where('client_code', 'like', "%{$search}%")
                      ->orWhere('client_name', 'like', "%{$search}%")
                      ->orWhere('contact_person', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%")
                      ->orWhere('phone_number', 'like', "%{$search}%")
                      ->orWhere('city', 'like', "%{$search}%")
                      ->orWhere('province', 'like', "%{$search}%");
                });
            })
            ->when($clientTypeId, function ($query, $clientTypeId) {
                $query->where('client_type_id', $clientTypeId);
            })
            ->when($isActive !== null && $isActive !== '', function ($query) use ($isActive) {
                $query->where('is_active', $isActive === 'true' || $isActive === true || $isActive === '1' || $isActive === 1);
            })
            ->when($city, function ($query, $city) {
                $query->where('city', 'like', "%{$city}%");
            })
            ->when($province, function ($query, $province) {
                $query->where('province', 'like', "%{$province}%");
            })
            ->orderBy($sortBy, $sortOrder)
            ->when($sortBy !== 'created_at', function ($query) {
                $query->orderBy('created_at', 'desc');
            })
            ->paginate(10);

        // ── Global stats (always across ALL clients, not just the current page) ──
        $stats = [
            'total_clients'      => Client::count(),
            'active_clients'     => Client::where('is_active', true)->count(),
            'inactive_clients'   => Client::where('is_active', false)->count(),
            'total_corporations' => Client::whereHas('clientType', fn ($q) => $q->where('name', 'like', '%corporation%'))->count(),
        ];

        // Get unique values for filter options
        $clientTypes = ClientType::where('is_active', true)->orderBy('name')->get(['id', 'name']);
        $cities = Client::distinct()->whereNotNull('city')->pluck('city')->sort()->values();
        $provinces = Client::distinct()->whereNotNull('province')->pluck('province')->sort()->values();

        return Inertia::render('ClientManagement/index', [
            'clients' => $clients,
            'search' => $search,
            'filters' => [
                'client_type_id' => $clientTypeId,
                'is_active' => $isActive,
                'city' => $city,
                'province' => $province,
            ],
            'filterOptions' => [
                'clientTypes' => $clientTypes,
                'cities' => $cities,
                'provinces' => $provinces,
            ],
            'sort_by' => $sortBy,
            'sort_order' => $sortOrder,
            'stats' => $stats,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_name'     => ['required', 'max:255'],
            'client_type_id'  => ['required', 'exists:client_types,id'],
            'contact_person'  => ['required', 'max:255'],
            'email'           => ['required', 'email', 'max:100'],
            'phone_number'    => ['nullable', 'max:20'],
            'address'         => ['nullable', 'max:255'],
            'city'            => ['nullable', 'max:100'],
            'province'        => ['nullable', 'max:100'],
            'postal_code'     => ['nullable', 'max:20'],
            'country'         => ['nullable', 'max:100'],
            'tax_id'          => ['nullable', 'max:50'],
            'business_permit' => ['nullable', 'max:50'],
            'credit_limit'    => ['nullable', 'numeric'],
            'payment_terms'   => ['nullable', 'max:100'],
            'is_active'       => ['required', 'boolean'],
            'notes'           => ['nullable', 'string'],
        ]);

        if (is_null($validated['credit_limit'] ?? null)) {
            unset($validated['credit_limit']);
        }
        if (is_null($validated['payment_terms'] ?? null)) {
            unset($validated['payment_terms']);
        }

        // Auto-generate a secure random password
        $plainPassword = bin2hex(random_bytes(6)); // 12-character random password

        $validated['password'] = Hash::make($plainPassword);

        // Generate unique client code
        do {
            $random = str_pad(rand(1, 999999), 3, '0', STR_PAD_LEFT);
            $clientCode = 'CLT-' . $random;
        } while (Client::where('client_code', $clientCode)->exists());

        $validated['client_code'] = $clientCode;
        $validated['password_changed_at'] = null;

        $client = Client::create($validated);

        // Send credentials email to client
        if ($client->email && $plainPassword) {
            try {
                $loginUrl = config('app.client_portal_url', url('/client/login'));
                Mail::to($client->email)
                    ->send(new ClientCredentialsMail($client, $plainPassword, $loginUrl));
            } catch (\Exception $e) {
                throw new \Exception('Client created but failed to send credentials email: ' . $e->getMessage());
            }
        }

        $this->adminActivityLogs('Client', 'Add', 'Added Client ' . $client->client_name);

        $this->createSystemNotification(
            'general',
            'New Client Added',
            "A new client '{$client->client_name}' ({$client->client_code}) has been added to the system.",
            null,
            route('client-management.index')
        );

        return redirect()->back()->with('success', 'Client added successfully.');
    }

    public function update(Request $request, Client $client)
    {
        $validated = $request->validate([
            'client_code'     => ['required', 'max:20', Rule::unique('clients', 'client_code')->ignore($client->id)],
            'client_name'     => ['required', 'max:255'],
            'client_type_id'  => ['required', 'exists:client_types,id'],
            'contact_person'  => ['required', 'max:255'],
            'email'           => ['required', 'email', 'max:100'],
            'phone_number'    => ['nullable', 'max:20'],
            'address'         => ['nullable', 'max:255'],
            'city'            => ['nullable', 'max:100'],
            'province'        => ['nullable', 'max:100'],
            'postal_code'     => ['nullable', 'max:20'],
            'country'         => ['nullable', 'max:100'],
            'tax_id'          => ['nullable', 'max:50'],
            'business_permit' => ['nullable', 'max:50'],
            'credit_limit'    => ['nullable', 'numeric'],
            'payment_terms'   => ['nullable', 'max:100'],
            'is_active'       => ['required', 'boolean'],
            'notes'           => ['nullable', 'string'],
        ]);

        if (is_null($validated['credit_limit'] ?? null)) {
            unset($validated['credit_limit']);
        }
        if (is_null($validated['payment_terms'] ?? null)) {
            unset($validated['payment_terms']);
        }

        $oldName = $client->client_name;
        $client->update($validated);

        $this->adminActivityLogs('Client', 'Update', 'Updated Client ' . $oldName);

        $this->createSystemNotification(
            'general',
            'Client Updated',
            "Client '{$client->client_name}' has been updated.",
            null,
            route('client-management.index')
        );

        return redirect()->route('client-management.index')->with('success', 'Client updated successfully.');
    }

    public function destroy(Client $client)
    {
        $name = $client->client_name;

        $activeProjects = $client->projects()
            ->whereIn('status', ['active', 'on_hold'])
            ->count();

        if ($activeProjects > 0) {
            return redirect()->route('client-management.index')
                ->withErrors([
                    'message' => "Cannot delete client '{$name}'. This client has {$activeProjects} active project(s). Please complete or cancel all active projects before deleting the client.",
                ]);
        }

        $client->delete();
        $this->adminActivityLogs('Client', 'Delete', 'Deleted Client ' . $name);

        $this->createSystemNotification(
            'general',
            'Client Deleted',
            "Client '{$name}' has been deleted.",
            null,
            route('client-management.index')
        );

        return redirect()->route('client-management.index')->with('success', 'Client deleted successfully.');
    }

    public function handleStatus(Request $request, Client $client)
    {
        $request->validate([
            'is_active' => ['required', 'boolean'],
        ]);

        // Guard: cannot deactivate a client that has active or on-hold projects
        if (!$request->boolean('is_active')) {
            $activeCount = $client->projects()
                ->whereIn('status', ['active', 'on_hold'])
                ->count();

            if ($activeCount > 0) {
                return back()->withErrors([
                    'is_active' => "Cannot deactivate '{$client->client_name}'. They have {$activeCount} active or on-hold project(s). Complete, cancel, or archive all projects first.",
                ])->with('error', "Cannot deactivate '{$client->client_name}'. They have {$activeCount} active or on-hold project(s).");
            }
        }

        $client->update([
            'is_active' => $request->input('is_active'),
        ]);

        $this->adminActivityLogs(
            'Client',
            'Update Status',
            'Updated Client ' . $client->client_name . ' status to ' . ($request->boolean('is_active') ? 'Active' : 'Inactive')
        );

        $status = $request->boolean('is_active') ? 'Active' : 'Inactive';
        $this->createSystemNotification(
            'status_change',
            'Client Status Updated',
            "Client '{$client->client_name}' status has been changed to {$status}.",
            null,
            route('client-management.index')
        );

        return redirect()->route('client-management.index')->with('success', 'Client status updated successfully.');
    }

    public function resetPassword(Client $client)
    {
        $defaultPassword = 'clientpassword';
        
        $client->update([
            'password' => Hash::make($defaultPassword),
            'password_changed_at' => null,
        ]);

        $this->adminActivityLogs(
            'Client',
            'Reset Password',
            'Reset password for Client ' . $client->client_name . ' (' . $client->client_code . ')'
        );

        return redirect()->back()->with('success', 'Client password reset successfully. Client will be required to change password on next login.');
    }
}