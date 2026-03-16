<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ActivityLogsTrait;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Storage;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class UsersController extends Controller
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

    private function deleteImages(User $user): void
    {
        foreach ($this->imageFields as $field) {
            if ($user->{$field}) Storage::disk('public')->delete($user->{$field});
        }
    }

    // ── Shared rules ──────────────────────────────────────────────────────────

    private function baseRules(bool $isCreate = true, ?User $user = null): array
    {
        return array_merge([
            'name'  => 'required|string|max:255',
            'email' => [
                'required', 'string', 'email', 'max:254',
                $isCreate
                    ? Rule::unique('users', 'email')
                    : Rule::unique('users', 'email')->ignore($user->id),
            ],
            'password' => [
                $isCreate ? 'required' : 'nullable',
                'string',
                'confirmed',
                Password::min(8)->max(254)->mixedCase()->numbers()->symbols(),
            ],
            'role' => 'required|string|exists:roles,name',

            'employee_id' => [
                'nullable', 'string', 'max:50',
                $isCreate
                    ? Rule::unique('users', 'employee_id')
                    : Rule::unique('users', 'employee_id')->ignore($user->id),
            ],

            'phone'           => 'nullable|string|max:30',
            'secondary_phone' => 'nullable|string|max:30',
            'gender'          => 'nullable|in:male,female,other,prefer_not_to_say',
            'date_of_birth'   => 'nullable|date|before:today',
            'civil_status'    => 'nullable|in:single,married,widowed,separated,divorced',
            'nationality'     => 'nullable|string|max:100',

            'region'            => 'nullable|string|max:150',
            'province'          => 'nullable|string|max:150',
            'city_municipality' => 'nullable|string|max:150',
            'barangay'          => 'nullable|string|max:150',
            'address'           => 'nullable|string',
            'zip_code'          => 'nullable|string|max:20',

            'emergency_contact_name'         => 'nullable|string|max:150',
            'emergency_contact_relationship' => 'nullable|string|max:80',
            'emergency_contact_phone'        => 'nullable|string|max:30',

            'sss_number'        => 'nullable|string|max:30',
            'philhealth_number' => 'nullable|string|max:30',
            'pagibig_number'    => 'nullable|string|max:30',
            'tin_number'        => 'nullable|string|max:30',

            'notes' => 'nullable|string',
        ], $this->imageRules());
    }

    private array $passwordMessages = [
        'password.min'       => 'Password must be at least 8 characters.',
        'password.max'       => 'Password is too long (max 254 characters).',
        'password.mixed'     => 'Must include an uppercase and lowercase letter.',
        'password.numbers'   => 'Must include a number.',
        'password.symbols'   => 'Must include a special character.',
        'password.confirmed' => 'Passwords do not match.',
    ];

    // ── index ─────────────────────────────────────────────────────────────────

    public function index(Request $request)
    {
        $search     = $request->get('search', '');
        $sortBy     = $request->get('sort_by', 'created_at');
        $sortOrder  = $request->get('sort_order', 'desc');
        $roleFilter = $request->get('role', '');

        $query = User::query();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%")
                  ->orWhere('employee_id', 'like', "%{$search}%")
                  ->orWhere('phone', 'like', "%{$search}%");
            });
        }

        if ($roleFilter) {
            $query->whereHas('roles', fn ($q) => $q->where('name', $roleFilter));
        }

        $allowed   = ['name', 'email', 'employee_id', 'created_at'];
        $sortBy    = in_array($sortBy, $allowed) ? $sortBy : 'created_at';
        $sortOrder = strtolower($sortOrder) === 'asc' ? 'asc' : 'desc';

        $users = $query
            ->with('roles')
            ->orderBy($sortBy, $sortOrder)
            ->when($sortBy !== 'created_at', fn ($q) => $q->orderBy('created_at', 'desc'))
            ->paginate(10);

        $roles     = Role::all(['id', 'name']);
        $roleNames = Role::distinct()->pluck('name')->sort()->values();
        $now       = now();

        return Inertia::render('UserManagement/Users/index', [
            'users'         => $users,
            'roles'         => $roles,
            'search'        => $search,
            'sort_by'       => $sortBy,
            'sort_order'    => $sortOrder,
            'filters'       => ['role' => $roleFilter],
            'filterOptions' => ['roles' => $roleNames],
            'stats'         => [
                'total_users'    => User::count(),
                'active_roles'   => Role::whereHas('users')->count(),
                'new_this_month' => User::whereMonth('created_at', $now->month)
                                        ->whereYear('created_at', $now->year)
                                        ->count(),
            ],
        ]);
    }

    // ── store ─────────────────────────────────────────────────────────────────

    public function store(Request $request)
    {
        $v = $request->validate($this->baseRules(true), $this->passwordMessages);

        $user = User::create([
            'name'              => $v['name'],
            'email'             => $v['email'],
            'password'          => Hash::make($v['password']),
            'email_verified_at' => now(),

            'employee_id'   => $v['employee_id'] ?? null,
            'profile_image' => $this->storeImage($request, 'profile_image', 'profile-images'),

            'phone'           => $v['phone'] ?? null,
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
            'sss_id_image'        => $this->storeImage($request, 'sss_id_image', 'gov-ids/sss'),
            'philhealth_number'   => $v['philhealth_number'] ?? null,
            'philhealth_id_image' => $this->storeImage($request, 'philhealth_id_image', 'gov-ids/philhealth'),
            'pagibig_number'      => $v['pagibig_number'] ?? null,
            'pagibig_id_image'    => $this->storeImage($request, 'pagibig_id_image', 'gov-ids/pagibig'),
            'tin_number'          => $v['tin_number'] ?? null,
            'tin_id_image'        => $this->storeImage($request, 'tin_id_image', 'gov-ids/tin'),

            'notes' => $v['notes'] ?? null,
        ]);

        $user->assignRole($v['role']);

        $this->adminActivityLogs('User', 'Add', "Created User {$user->name} ({$user->email}) with role: {$v['role']}");
        $this->createSystemNotification(
            'general', 'New User Created',
            "A new user '{$user->name}' ({$user->email}) has been created with role '{$v['role']}'.",
            null, route('user-management.users.index')
        );
    }

    // ── update ────────────────────────────────────────────────────────────────

    public function update(Request $request, User $user)
    {
        $v = $request->validate($this->baseRules(false, $user), $this->passwordMessages);

        $data = [
            'name'  => $v['name'],
            'email' => $v['email'],

            'employee_id'   => $v['employee_id'] ?? null,
            'profile_image' => $this->replaceImage($request, 'profile_image', 'profile-images', $user->profile_image),

            'phone'           => $v['phone'] ?? null,
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
            'sss_id_image'        => $this->replaceImage($request, 'sss_id_image', 'gov-ids/sss', $user->sss_id_image),
            'philhealth_number'   => $v['philhealth_number'] ?? null,
            'philhealth_id_image' => $this->replaceImage($request, 'philhealth_id_image', 'gov-ids/philhealth', $user->philhealth_id_image),
            'pagibig_number'      => $v['pagibig_number'] ?? null,
            'pagibig_id_image'    => $this->replaceImage($request, 'pagibig_id_image', 'gov-ids/pagibig', $user->pagibig_id_image),
            'tin_number'          => $v['tin_number'] ?? null,
            'tin_id_image'        => $this->replaceImage($request, 'tin_id_image', 'gov-ids/tin', $user->tin_id_image),

            'notes' => $v['notes'] ?? null,
        ];

        if (!empty($v['password'])) {
            $data['password'] = Hash::make($v['password']);
        }

        $user->update($data);
        $user->syncRoles([$v['role']]);

        $this->adminActivityLogs('User', 'Update', "Updated User {$user->name} ({$user->email}) with role: {$v['role']}");
        $this->createSystemNotification(
            'general', 'User Updated',
            "User '{$user->name}' ({$user->email}) has been updated.",
            null, route('user-management.users.index')
        );
    }

    // ── resetPassword ─────────────────────────────────────────────────────────

    public function resetPassword(User $user)
    {
        if ($user->id === Auth::id()) {
            return back()->withErrors(['error' => 'You cannot reset your own password.']);
        }

        $user->update(['password' => Hash::make('asecpassword')]);

        $this->adminActivityLogs('User', 'Reset Password', "Reset password for User {$user->name} ({$user->email})");
        $this->createSystemNotification(
            'general', 'User Password Reset',
            "Password for user '{$user->name}' ({$user->email}) has been reset.",
            null, route('user-management.users.index')
        );
    }

    // ── destroy ───────────────────────────────────────────────────────────────

    public function destroy(User $user)
    {
        if ($user->id === Auth::id()) {
            return redirect()->back()->with('error', 'You cannot delete your own account.');
        }

        if (User::count() <= 1) {
            return redirect()->back()->with('error', 'Cannot delete the last user in the system.');
        }

        $name  = $user->name;
        $email = $user->email;

        $this->adminActivityLogs('User', 'Delete', "Deleted User {$name} ({$email})");
        $user->delete();

        $this->createSystemNotification(
            'general', 'User Deleted',
            "User '{$name}' ({$email}) has been deleted.",
            null, route('user-management.users.index')
        );

        return back()->with('success', 'User deleted successfully.');
    }
}