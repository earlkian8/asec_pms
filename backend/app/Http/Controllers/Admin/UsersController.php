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

        // Filter by role
        if ($roleFilter) {
            $query->whereHas('roles', function ($q) use ($roleFilter) {
                $q->where('name', $roleFilter);
            });
        }

        // Validate sort_by to prevent SQL injection
        $allowedSortColumns = ['name', 'email', 'created_at'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'created_at';
        }

        // Validate sort_order
        $sortOrder = strtolower($sortOrder) === 'asc' ? 'asc' : 'desc';

        $users = $query
                      ->with('roles')
                      ->orderBy($sortBy, $sortOrder)
                      ->when($sortBy !== 'created_at', function ($query) {
                          // Add created_at as secondary sort to maintain stable position when sorting by other fields
                          $query->orderBy('created_at', 'desc');
                      })
                      ->paginate(10);

        // Get all roles for the dropdowns
        $roles = Role::all(['id', 'name']);

        // Get unique roles for filter options
        $roleNames = Role::distinct()->pluck('name')->sort()->values();

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
        ]);
    }

    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8|confirmed',
            'role' => 'required|string|exists:roles,name',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'email_verified_at' => now(),
        ]);

        // Assign role to user
        $user->assignRole($validated['role']);

        $this->adminActivityLogs(
            'User',
            'Add',
            'Created User ' . $user->name . ' (' . $user->email . ') with role: ' . $validated['role']
        );

        // System-wide notification for new user
        $this->createSystemNotification(
            'general',
            'New User Created',
            "A new user '{$user->name}' ({$user->email}) has been created with role '{$validated['role']}'.",
            null,
            route('user-management.users.index')
        );
    }

    public function update(Request $request, User $user)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => [
                'required',
                'string',
                'email',
                'max:255',
                Rule::unique('users')->ignore($user->id),
            ],
            'password' => 'nullable|string|min:8|confirmed',
            'role' => 'required|string|exists:roles,name',
        ]);

        $updateData = [
            'name' => $validated['name'],
            'email' => $validated['email'],
        ];

        // Only update password if provided
        if (!empty($validated['password'])) {
            $updateData['password'] = Hash::make($validated['password']);
        }

        $user->update($updateData);

        // Update user role - remove all roles and assign new one
        $user->syncRoles([$validated['role']]);

        $oldRole = $user->roles->first()?->name;

        $this->adminActivityLogs(
            'User',
            'Update',
            'Updated User ' . $user->name . ' (' . $user->email . ') with role: ' . $validated['role']
        );

        // System-wide notification for user update
        $this->createSystemNotification(
            'general',
            'User Updated',
            "User '{$user->name}' ({$user->email}) has been updated.",
            null,
            route('user-management.users.index')
        );
    }

    public function resetPassword(User $user)
    {
        // Prevent resetting password of the current user
        if ($user->id === Auth::id()) {
            return back()->withErrors(['error' => 'You cannot reset your own password.']);
        }

        $defaultPassword = 'asecpassword';
        
        $user->update([
            'password' => Hash::make($defaultPassword),
        ]);

        $this->adminActivityLogs(
            'User',
            'Reset Password',
            'Reset password for User ' . $user->name . ' (' . $user->email . ')'
        );

        // System-wide notification for password reset
        $this->createSystemNotification(
            'general',
            'User Password Reset',
            "Password for user '{$user->name}' ({$user->email}) has been reset.",
            null,
            route('user-management.users.index')
        );
    }

    public function destroy(User $user)
    {
        // Prevent deletion of the current user
        if ($user->id === Auth::id()) {
            return redirect()->back()->with('error', 'You cannot delete your own account.');
        }

        // Prevent deletion if there's only 1 user in the system
        $totalUsers = User::count();
        if ($totalUsers <= 1) {
            return redirect()->back()->with('error', 'Cannot delete user. There must be at least one user in the system.');
        }

        $userName = $user->name;
        $userEmail = $user->email;

        $this->adminActivityLogs(
            'User',
            'Delete',
            'Deleted User ' . $userName . ' (' . $userEmail . ')'
        );

        $user->delete();

        // System-wide notification for user deletion
        $this->createSystemNotification(
            'general',
            'User Deleted',
            "User '{$userName}' ({$userEmail}) has been deleted.",
            null,
            route('user-management.users.index')
        );

        return back()->with('success', 'User deleted successfully.');
    }
}
