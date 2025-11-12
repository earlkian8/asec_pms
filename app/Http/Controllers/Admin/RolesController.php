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
        $page = $request->get('page', 1);

        $query = Role::query();

        if ($search) {
            $query->where('name', 'like', "%{$search}%");
        }

        $roles = $query->withCount('users') // counts assigned users
                    ->orderBy('created_at', 'desc')
                    ->paginate(10)
                    ->withQueryString();

        return Inertia::render('UserManagement/Roles/index', [
            'roles' => $roles,
            'search' => $search,
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
