<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Http\Requests\StoreClientRequest;
use App\Http\Requests\UpdateClientRequest;
use App\Mail\ClientCredentialsMail;
use App\Models\Client;
use App\Models\ClientType;
use App\Models\User;
use App\Services\CodeGeneratorService;
use App\Support\IndexQueryHelper;
use App\Traits\ActivityLogsTrait;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Mail;
use Inertia\Inertia;

class ClientsController extends Controller
{
    use ActivityLogsTrait, NotificationTrait;

    public function __construct(protected CodeGeneratorService $codeGeneratorService) {}

    public function index(Request $request)
    {
        $search = $request->input('search');
        $clientTypeId = $request->input('client_type_id');
        $isActive = IndexQueryHelper::parseBoolean($request->input('is_active'));
        $city = $request->input('city');
        $province = $request->input('province');
        $allowedSortColumns = ['created_at', 'client_name', 'client_code', 'is_active', 'city', 'province', 'email'];
        $sortParams = IndexQueryHelper::sortParams($request, $allowedSortColumns);
        $sortBy = $sortParams['sort_by'];
        $sortOrder = $sortParams['sort_order'];

        $clients = Client::with('clientType')
            ->when($search, function ($query, $search) {
                return query_where_search_in($query, ['client_code', 'client_name', 'contact_person', 'email', 'phone_number', 'city', 'province'], $search);
            })
            ->when($clientTypeId, function ($query, $clientTypeId) {
                $query->where('client_type_id', $clientTypeId);
            })
            ->when($isActive !== null, function ($query) use ($isActive) {
                $query->where('is_active', $isActive);
            })
            ->when($city, function ($query, $city) {
                query_where_search($query, 'city', $city);
            })
            ->when($province, function ($query, $province) {
                query_where_search($query, 'province', $province);
            })
            ->orderBy($sortBy, $sortOrder)
            ->when($sortBy !== 'created_at', function ($query) {
                // Add created_at as secondary sort to maintain stable position when sorting by other fields
                $query->orderBy('created_at', 'desc');
            })
            ->paginate(10);

        // Get unique values for filter options
        $clientTypes = ClientType::where('is_active', true)->orderBy('name')->get(['id', 'name']);
        $cities = Client::distinct()->whereNotNull('city')->pluck('city')->sort()->values();
        $provinces = Client::distinct()->whereNotNull('province')->pluck('province')->sort()->values();

        return Inertia::render('ClientManagement/index', [
            'clients' => $clients,
            'search' => $search,
            'filters' => [
                'client_type_id' => $clientTypeId,
                'is_active' => $request->input('is_active'),
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
        ]);
    }

    public function store(StoreClientRequest $request)
    {
        $validated = $request->validated();

        // If null, remove keys so DB default applies
        if (is_null($validated['credit_limit'] ?? null)) {
            unset($validated['credit_limit']);
        }
        if (is_null($validated['payment_terms'] ?? null)) {
            unset($validated['payment_terms']);
        }

        // Auto-generate a secure random password
        $plainPassword = bin2hex(random_bytes(6)); // Generates a 12-character random password

        // Hash the auto-generated password
        $validated['password'] = Hash::make($plainPassword);

        $validated['client_code'] = $this->codeGeneratorService->generateUniqueCode('CLT', 'clients', 'client_code', 3);
        // Set password_changed_at to null so client must change password on first login
        $validated['password_changed_at'] = null;

        $client = Client::create($validated);

        // Send credentials email to client
        if ($client->email && $plainPassword) {
            try {
                $loginUrl = config('app.client_portal_url', url('/client/login'));

                // Send email using Brevo SMTP
                Mail::to($client->email)
                    ->send(new ClientCredentialsMail($client, $plainPassword, $loginUrl));
            } catch (\Exception $e) {
                // Re-throw the exception so user knows email failed
                throw new \Exception('Client created but failed to send credentials email: '.$e->getMessage());
            }
        }

        $this->adminActivityLogs('Client', 'Add', 'Added Client '.$client->client_name);

        // System-wide notification for new client
        $this->createSystemNotification(
            'general',
            'New Client Added',
            "A new client '{$client->client_name}' ({$client->client_code}) has been added to the system.",
            null,
            route('client-management.index')
        );

        return redirect()->back()->with('success', 'Client added successfully.');
    }

    public function update(UpdateClientRequest $request, Client $client)
    {
        $validated = $request->validated();
        // If null, remove keys so DB default applies
        if (is_null($validated['credit_limit'] ?? null)) {
            unset($validated['credit_limit']);
        }
        if (is_null($validated['payment_terms'] ?? null)) {
            unset($validated['payment_terms']);
        }

        $oldName = $client->client_name;

        $client->update($validated);

        $this->adminActivityLogs('Client', 'Update', 'Updated Client '.$oldName);

        // System-wide notification for client update
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

        // Prevent deletion if client has active projects
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
        $this->adminActivityLogs('Client', 'Delete', 'Deleted Client '.$name);

        // System-wide notification for client deletion
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

        $client->update([
            'is_active' => $request->input('is_active'),
        ]);

        $this->adminActivityLogs(
            'Client',
            'Update Status',
            'Updated Client '.$client->client_name.' status to '.($request->boolean('is_active') ? 'Active' : 'Inactive')
        );

        // System-wide notification for client status change
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
            'password_changed_at' => null, // Force password change on next login
        ]);

        $this->adminActivityLogs(
            'Client',
            'Reset Password',
            'Reset password for Client '.$client->client_name.' ('.$client->client_code.')'
        );

        return redirect()->back()->with('success', 'Client password reset successfully. Client will be required to change password on next login.');
    }
}
