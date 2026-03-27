<?php

namespace App\Http\Controllers\Api\TaskManagement;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Spatie\Permission\Models\Permission;

class PermissionDelegationController extends Controller
{
    // Permissions that an Engineer (TM) can delegate to another user
    private const DELEGATABLE = [
        'tm.access',
        'tm.projects.view-assigned',
        'tm.milestones.manage',
        'tm.tasks.manage',
        'tm.tasks.view',
        'tm.tasks.update-status',
        'tm.progress-updates.view',
        'tm.progress-updates.create',
        'tm.progress-updates.update-own',
        'tm.progress-updates.delete-own',
        'tm.issues.view',
        'tm.issues.create',
        'tm.issues.update-own',
        'tm.issues.delete-own',
        'tm.files.download',
        'tm.team.view',
        'tm.team.assign',
        'tm.team.release',
        'tm.team.reactivate',
        'tm.team.force-remove',
    ];

    /**
     * List all users the authenticated user has granted TM access to.
     */
    public function grantedUsers(Request $request)
    {
        $user = $request->user();

        if (!$user->can('tm.projects.view-assigned')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        // Users who have tm.access as a direct permission (granted by delegation)
        // We identify them by having tm.access directly on the user model (not just via role)
        $granted = User::whereHas('permissions', fn ($q) => $q->where('name', 'tm.access'))
            ->whereNull('deleted_at')
            ->with('permissions')
            ->get()
            ->map(fn (User $u) => [
                'id'    => $u->id,
                'name'  => $u->name,
                'email' => $u->email,
                'permissions' => $u->permissions->pluck('name')->filter(fn ($p) => str_starts_with($p, 'tm.'))->values(),
            ]);

        return response()->json(['success' => true, 'data' => $granted]);
    }

    /**
     * List users eligible to receive TM access (don't already have tm.access via any means).
     */
    public function eligibleUsers(Request $request)
    {
        $user = $request->user();

        if (!$user->can('tm.projects.view-assigned')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        // Exclude self and users who already have tm.access (via role or direct permission)
        $alreadyHaveAccess = User::permission('tm.access')->pluck('id');

        $eligible = User::whereNull('deleted_at')
            ->where('id', '!=', $user->id)
            ->whereNotIn('id', $alreadyHaveAccess)
            ->orderBy('first_name')
            ->orderBy('last_name')
            ->get(['id', 'first_name', 'middle_name', 'last_name', 'email'])
            ->map(fn (User $u) => [
                'id'    => $u->id,
                'name'  => $u->name,
                'email' => $u->email,
            ]);

        return response()->json(['success' => true, 'data' => $eligible]);
    }

    /**
     * Grant TM permissions to a user.
     */
    public function grant(Request $request)
    {
        $user = $request->user();

        if (!$user->can('tm.projects.view-assigned')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $target = User::findOrFail($request->user_id);

        if ($target->id === $user->id) {
            return response()->json(['success' => false, 'message' => 'You cannot grant permissions to yourself.'], 422);
        }

        if ($target->can('tm.access')) {
            return response()->json(['success' => false, 'message' => "{$target->name} already has Task Management access."], 422);
        }

        $permissions = Permission::whereIn('name', self::DELEGATABLE)->get();
        $target->givePermissionTo($permissions);

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json([
            'success' => true,
            'message' => "Task Management access granted to {$target->name}.",
            'data'    => ['id' => $target->id, 'name' => $target->name, 'email' => $target->email],
        ]);
    }

    /**
     * Revoke TM permissions from a user.
     */
    public function revoke(Request $request)
    {
        $user = $request->user();

        if (!$user->can('tm.projects.view-assigned')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        $target = User::findOrFail($request->user_id);

        $permissions = Permission::whereIn('name', self::DELEGATABLE)->get();
        $target->revokePermissionTo($permissions);

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        return response()->json([
            'success' => true,
            'message' => "Task Management access revoked from {$target->name}.",
        ]);
    }
}
