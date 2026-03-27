<?php

namespace App\Http\Controllers\Api\TaskManagement;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;

class PermissionDelegationController extends Controller
{
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
     * Users that the authenticated user personally granted access to.
     */
    public function grantedUsers(Request $request)
    {
        $user = $request->user();

        if (!$user->can('tm.projects.view-assigned')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $granted = DB::table('permission_delegations')
            ->where('granted_by', $user->id)
            ->join('users', 'users.id', '=', 'permission_delegations.granted_to')
            ->whereNull('users.deleted_at')
            ->select('users.id', 'users.first_name', 'users.middle_name', 'users.last_name', 'users.email')
            ->get()
            ->map(fn ($u) => [
                'id'    => $u->id,
                'name'  => collect([$u->first_name, $u->middle_name ? mb_substr($u->middle_name, 0, 1).'.' : null, $u->last_name])->filter()->implode(' '),
                'email' => $u->email,
            ]);

        return response()->json(['success' => true, 'data' => $granted]);
    }

    /**
     * Users eligible to receive access — don't already have tm.access by any means.
     */
    public function eligibleUsers(Request $request)
    {
        $user = $request->user();

        if (!$user->can('tm.projects.view-assigned')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

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
     * Grant TM access to a user and record the delegation row.
     */
    public function grant(Request $request)
    {
        $user = $request->user();

        if (!$user->can('tm.projects.view-assigned')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $request->validate(['user_id' => ['required', 'integer', 'exists:users,id']]);

        $target = User::findOrFail($request->user_id);

        if ($target->id === $user->id) {
            return response()->json(['success' => false, 'message' => 'You cannot grant permissions to yourself.'], 422);
        }

        if ($target->can('tm.access')) {
            return response()->json(['success' => false, 'message' => "{$target->name} already has Task Management access."], 422);
        }

        DB::table('permission_delegations')->insertOrIgnore([
            'granted_by' => $user->id,
            'granted_to' => $target->id,
            'created_at' => now(),
            'updated_at' => now(),
        ]);

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
     * Revoke TM access — only if YOU were the one who granted it.
     * Permissions are only removed when no other delegator still trusts this user.
     */
    public function revoke(Request $request)
    {
        $user = $request->user();

        if (!$user->can('tm.projects.view-assigned')) {
            return response()->json(['success' => false, 'message' => 'Unauthorized'], 403);
        }

        $request->validate(['user_id' => ['required', 'integer', 'exists:users,id']]);

        $target = User::findOrFail($request->user_id);

        $deleted = DB::table('permission_delegations')
            ->where('granted_by', $user->id)
            ->where('granted_to', $target->id)
            ->delete();

        if (!$deleted) {
            return response()->json(['success' => false, 'message' => 'You did not grant access to this user.'], 403);
        }

        // Only revoke permissions if no other delegator still trusts this user
        $otherDelegations = DB::table('permission_delegations')
            ->where('granted_to', $target->id)
            ->exists();

        if (!$otherDelegations) {
            $permissions = Permission::whereIn('name', self::DELEGATABLE)->get();
            $target->revokePermissionTo($permissions);
            app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
        }

        return response()->json([
            'success' => true,
            'message' => "Task Management access revoked from {$target->name}.",
        ]);
    }
}
