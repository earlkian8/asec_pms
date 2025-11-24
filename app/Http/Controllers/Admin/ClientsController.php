<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Traits\ActivityLogsTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Inertia\Inertia;

class ClientsController extends Controller
{
    use ActivityLogsTrait;

    public function index(Request $request)
    {
        $search = $request->input('search');

        $clients = Client::when($search, function ($query, $search) {
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
            ->orderBy('created_at', 'desc')
            ->paginate(10);

        return Inertia::render('ClientManagement/index', [
            'clients' => $clients,
            'search' => $search,
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'client_name'     => ['required', 'max:255'],
            'client_type'     => ['required', Rule::in(['individual', 'corporation', 'government', 'ngo'])],
            'contact_person'  => ['nullable', 'max:255'],
            'email'           => ['nullable', 'email', 'max:100'],
            'password'        => ['nullable', 'string', 'min:8'],
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

        // If null, remove keys so DB default applies
        if (is_null($validated['credit_limit'] ?? null)) {
            unset($validated['credit_limit']);
        }
        if (is_null($validated['payment_terms'] ?? null)) {
            unset($validated['payment_terms']);
        }

        // Hash password if provided
        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        // Generate unique client code
        do {
            $random = str_pad(rand(1, 999999), 3, '0', STR_PAD_LEFT); // 001–999
            $clientCode = 'CLT-' . $random;
        } while (Client::where('client_code', $clientCode)->exists());

        $validated['client_code'] = $clientCode;

        $client = Client::create($validated);

        $this->adminActivityLogs('Client', 'Add', 'Added Client ' . $client->client_name);

        return redirect()->back()->with('success', 'Client added successfully.');
    }

    public function update(Request $request, Client $client)
    {
        $validated = $request->validate([
            'client_code'     => ['required', 'max:20', Rule::unique('clients', 'client_code')->ignore($client->id)],
            'client_name'     => ['required', 'max:255'],
            'client_type'     => ['required', Rule::in(['individual', 'corporation', 'government', 'ngo'])],
            'contact_person'  => ['nullable', 'max:255'],
            'email'           => ['nullable', 'email', 'max:100'],
            'password'        => ['nullable', 'string', 'min:8'],
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
        // If null, remove keys so DB default applies
        if (is_null($validated['credit_limit'] ?? null)) {
            unset($validated['credit_limit']);
        }
        if (is_null($validated['payment_terms'] ?? null)) {
            unset($validated['payment_terms']);
        }

        // Hash password if provided
        if (!empty($validated['password'])) {
            $validated['password'] = Hash::make($validated['password']);
        } else {
            unset($validated['password']);
        }

        $oldName = $client->client_name;

        $client->update($validated);

        $this->adminActivityLogs('Client', 'Update', 'Updated Client ' . $oldName);

        return redirect()->back()->with('success', 'Client updated successfully.');
    }

    public function destroy(Client $client)
    {
        $name = $client->client_name;

        // Example rule: prevent deletion if client has related bookings/invoices
        // if ($client->bookings()->exists()) {
        //     return back()->withErrors([
        //         'message' => 'This client has existing records and cannot be deleted.',
        //     ]);
        // }

        $client->delete();
        $this->adminActivityLogs('Client', 'Delete', 'Deleted Client ' . $name);
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
            'Updated Client ' . $client->client_name . ' status to ' . ($request->boolean('is_active') ? 'Active' : 'Inactive')
        );
    }

    public function resetPassword(Client $client)
    {
        $defaultPassword = 'clientpassword';
        
        $client->update([
            'password' => Hash::make($defaultPassword),
        ]);

        $this->adminActivityLogs(
            'Client',
            'Reset Password',
            'Reset password for Client ' . $client->client_name . ' (' . $client->client_code . ')'
        );

        return redirect()->back()->with('success', 'Client password reset successfully.');
    }
}
