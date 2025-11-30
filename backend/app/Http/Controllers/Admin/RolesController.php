<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Traits\ActivityLogsTrait;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Spatie\Permission\Models\Role;

class RolesController extends Controller
{
    use ActivityLogsTrait;

    /**
     * Display a listing of roles.
     */
    public function index(Request $request){
        $search = $request->get('search', '');
        $sortBy = $request->get('sort_by', 'created_at');
        $sortOrder = $request->get('sort_order', 'desc');

        $query = Role::query();

        if ($search) {
            $query->where('name', 'like', "%{$search}%");
        }

        // Validate sort_by to prevent SQL injection
        $allowedSortColumns = ['name', 'created_at', 'users_count'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'created_at';
        }

        // Validate sort_order
        $sortOrder = strtolower($sortOrder) === 'asc' ? 'asc' : 'desc';

        $roles = $query->withCount('users') // counts assigned users
                    ->orderBy($sortBy, $sortOrder)
                    ->paginate(10)
                    ->withQueryString();

        return Inertia::render('UserManagement/Roles/index', [
            'roles' => $roles,
            'search' => $search,
            'sort_by' => $sortBy,
            'sort_order' => $sortOrder,
        ]);
    }


    /**
     * Store a newly created role in storage.
     */
    public function store(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255|unique:roles,name',
            'guard_name' => 'nullable|string',
        ]);

        $role = Role::create([
            'name' => $validated['name'],
            'guard_name' => $validated['guard_name'] ?? 'web',
        ]);

        $this->adminActivityLogs(
            'Role',
            'Add',
            'Created Role ' . $role->name
        );

    }

    /**
     * Show the form for editing the specified role's permissions.
     */
    public function edit(Role $role)
    {
        // Get all permissions grouped by module
        $allPermissions = \Spatie\Permission\Models\Permission::orderBy('name')->get();
        
        // Get role's current permissions
        $rolePermissions = $role->permissions->pluck('name')->toArray();

        // Group permissions by module
        $groupedPermissions = [];
        foreach ($allPermissions as $permission) {
            $parts = explode('.', $permission->name);
            $module = $parts[0];
            
            if (!isset($groupedPermissions[$module])) {
                $groupedPermissions[$module] = [];
            }
            
            $groupedPermissions[$module][] = [
                'id' => $permission->id,
                'name' => $permission->name,
                'checked' => in_array($permission->name, $rolePermissions),
            ];
        }

        return Inertia::render('UserManagement/Roles/edit', [
            'role' => $role,
            'groupedPermissions' => $groupedPermissions,
            'rolePermissions' => $rolePermissions,
        ]);
    }

    /**
     * Update the specified role's permissions.
     */
    public function update(Request $request, Role $role)
    {
        $validated = $request->validate([
            'permissions' => 'nullable|array',
            'permissions.*' => 'string|exists:permissions,name',
        ]);

        $permissions = $validated['permissions'] ?? [];
        
        // Sync permissions to role
        $role->syncPermissions($permissions);

        $this->adminActivityLogs(
            'Role',
            'Update Permissions',
            'Updated permissions for Role ' . $role->name
        );

        return redirect()
            ->route('user-management.roles-and-permissions.index')
            ->with('success', 'Role permissions updated successfully.');
    }

    /**
     * Remove the specified role from storage.
     */
    public function destroy(Role $role)
    {
        $this->adminActivityLogs(
            'Role',
            'Delete',
            'Deleted Role ' . $role->name
        );

        $role->delete();

    }
}
