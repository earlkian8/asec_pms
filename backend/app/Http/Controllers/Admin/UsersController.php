<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\User;
use App\Traits\ActivityLogsTrait;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class UsersController extends Controller
{
    use ActivityLogsTrait, NotificationTrait;

    public function index(Request $request)
    {
        $search = $request->get('search', '');
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');
        $roleFilter = $request->get('role', '');

        $query = User::query();

        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('name', 'like', "%{$search}%")
                  ->orWhere('email', 'like', "%{$search}%");
            });
        }

        if ($roleFilter) {
            $query->whereHas('roles', function ($q) use ($roleFilter) {
                $q->where('name', $roleFilter);
            });
        }

        $allowedSortColumns = ['name', 'email', 'created_at'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'created_at';
        }

        $sortOrder = strtolower($sortOrder) === 'asc' ? 'asc' : 'desc';

        $users = $query
            ->with('roles')
            ->orderBy($sortBy, $sortOrder)
            ->when($sortBy !== 'created_at', function ($query) {
                $query->orderBy('created_at', 'desc');
            })
            ->paginate(10);

        $roles = Role::all(['id', 'name']);
        $roleNames = Role::distinct()->pluck('name')->sort()->values();

        // Real stats — always based on ALL users, not the current page
        $now = now();
        $stats = [
            'total_users'     => User::count(),
            'active_roles'    => Role::whereHas('users')->count(),
            'new_this_month'  => User::whereMonth('created_at', $now->month)
                                     ->whereYear('created_at', $now->year)
                                     ->count(),
        ];

        return Inertia::render('UserManagement/Users/index', [
            'users' => $users,
            'roles' => $roles,
            'search' => $search,
            'sort_by' => $sortBy,
            'sort_order' => $sortOrder,
            'filters' => [
                'role' => $roleFilter,
            ],
            'filterOptions' => [
                'roles' => $roleNames,
            ],
            'stats' => $stats,
        ]);
    }

    // ... rest of your methods unchanged
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => 'required|string|email|max:254|unique:users',
            'password' => [
                'required',
                'string',
                'confirmed',
                Password::min(8)->max(254)->mixedCase()->numbers()->symbols(),
            ],
            'role'     => 'required|string|exists:roles,name',
        ], [
            'password.min'      => 'Password must be at least 8 characters.',
            'password.max'      => 'Password is too long (max 254 characters).',
            'password.mixed'    => 'Must include an uppercase and lowercase letter.',
            'password.numbers'  => 'Must include a number.',
            'password.symbols'  => 'Must include a special character.',
            'password.confirmed'=> 'Passwords do not match.',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'email_verified_at' => now(),
        ]);

        $user->assignRole($validated['role']);

        $this->adminActivityLogs('User', 'Add', 'Created User ' . $user->name . ' (' . $user->email . ') with role: ' . $validated['role']);

        $this->createSystemNotification(
            'general', 'New User Created',
            "A new user '{$user->name}' ({$user->email}) has been created with role '{$validated['role']}'.",
            null, route('user-management.users.index')
        );
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name'     => 'required|string|max:255',
            'email'    => ['required', 'string', 'email', 'max:254', Rule::unique('users')->ignore($user->id)],
            'password' => [
                'nullable',
                'string',
                'confirmed',
                Password::min(8)->max(254)->mixedCase()->numbers()->symbols(),
            ],
            'role'     => 'required|string|exists:roles,name',
        ], [
            'password.min'      => 'Password must be at least 8 characters.',
            'password.max'      => 'Password is too long (max 254 characters).',
            'password.mixed'    => 'Must include an uppercase and lowercase letter.',
            'password.numbers'  => 'Must include a number.',
            'password.symbols'  => 'Must include a special character.',
            'password.confirmed'=> 'Passwords do not match.',
        ]);

        $updateData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
        ];

        if (!empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $user->update($updateData);
        $user->syncRoles([$validated['role']]);

        $this->adminActivityLogs('User', 'Update', 'Updated User ' . $user->name . ' (' . $user->email . ') with role: ' . $validated['role']);

        $this->createSystemNotification(
            'general', 'User Updated',
            "User '{$user->name}' ({$user->email}) has been updated.",
            null, route('user-management.users.index')
        );
    }

    public function resetPassword(User $user)
    {
        if ($user->id === Auth::id()) {
            return back()->withErrors(['error' => 'You cannot reset your own password.']);
        }

        $user->update(['password' => Hash::make('asecpassword')]);

        $this->adminActivityLogs('User', 'Reset Password', 'Reset password for User ' . $user->name . ' (' . $user->email . ')');

        $this->createSystemNotification(
            'general', 'User Password Reset',
            "Password for user '{$user->name}' ({$user->email}) has been reset.",
            null, route('user-management.users.index')
        );
    }

    public function destroy(User $user)
    {
        if ($user->id === Auth::id()) {
            return redirect()->back()->with('error', 'You cannot delete your own account.');
        }

        if (User::count() <= 1) {
            return redirect()->back()->with('error', 'Cannot delete user. There must be at least one user in the system.');
        }

        $userName  = $user->name;
        $userEmail = $user->email;

        $this->adminActivityLogs('User', 'Delete', 'Deleted User ' . $userName . ' (' . $userEmail . ')');

        $user->delete();

        $this->createSystemNotification(
            'general', 'User Deleted',
            "User '{$userName}' ({$userEmail}) has been deleted.",
            null, route('user-management.users.index')
        );

        return back()->with('success', 'User deleted successfully.');
    }
}