<?php

namespace App\Http\Controllers\Api\TaskManagement;

use App\Http\Controllers\Controller;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Spatie\Permission\Models\Permission;

class PermissionDelegationController extends Controller
{
    // Permissions for the Task + History module (tm.access excluded — handled separately)
    private const TASK_PERMISSIONS = [
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
    ];

    // Read-only project permissions — safe to delegate
    private const PROJECT_PERMISSIONS = [
        'tm.projects.view-assigned',
        'tm.team.view',
        'tm.milestones.manage',
        'tm.tasks.manage',
        'tm.team.assign',
        'tm.team.release',
        'tm.team.reactivate',
        'tm.team.force-remove',
        'material-allocations.receiving-report',
    ];

    /**
     * Users that the authenticated user personally granted access to,
     * with their current module flags.
     */
    public function grantedUsers(Request $request)
    {
        $user = $request->user();

        $granted = DB::table('permission_delegations')
            ->where('granted_by', $user->id)
            ->join('users', 'users.id', '=', 'permission_delegations.granted_to')
            ->whereNull('users.deleted_at')
            ->select(
                'users.id',
                'users.first_name',
                'users.middle_name',
                'users.last_name',
                'users.email',
                'permission_delegations.task_access',
                'permission_delegations.project_access'
            )
            ->get()
            ->map(fn ($u) => [
                'id'            => $u->id,
                'name'          => collect([$u->first_name, $u->middle_name ? mb_substr($u->middle_name, 0, 1).'.' : null, $u->last_name])->filter()->implode(' '),
                'email'         => $u->email,
                'taskAccess'    => (bool) $u->task_access,
                'projectAccess' => (bool) $u->project_access,
            ]);

        return response()->json(['success' => true, 'data' => $granted]);
    }

    /**
     * All users eligible to receive a grant — excludes self and already-granted users.
     */
    public function eligibleUsers(Request $request)
    {
        $user = $request->user();

        $alreadyGranted = DB::table('permission_delegations')
            ->where('granted_by', $user->id)
            ->pluck('granted_to')
            ->toArray();

        $eligible = User::whereNull('deleted_at')
            ->where('id', '!=', $user->id)
            ->whereNotIn('id', $alreadyGranted)
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
     * Grant access to a new user with initial module selections.
     */
    public function grant(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'user_id'        => ['required', 'integer', 'exists:users,id'],
            'task_access'    => ['required', 'boolean'],
            'project_access' => ['required', 'boolean'],
        ]);

        // Fix #4: guard against soft-deleted target
        $target = User::whereNull('deleted_at')->findOrFail($data['user_id']);

        if ($target->id === $user->id) {
            return response()->json(['success' => false, 'message' => 'You cannot grant permissions to yourself.'], 422);
        }

        if (!$data['task_access'] && !$data['project_access']) {
            return response()->json(['success' => false, 'message' => 'At least one module must be enabled.'], 422);
        }

        $alreadyDelegated = DB::table('permission_delegations')
            ->where('granted_by', $user->id)
            ->where('granted_to', $target->id)
            ->exists();

        if ($alreadyDelegated) {
            return response()->json(['success' => false, 'message' => "{$target->name} already has access. Use update to change their modules."], 422);
        }

        // Fix #1: mark whether this granter is themselves a delegated user
        $granterIsDelegated = DB::table('permission_delegations')
            ->where('granted_to', $user->id)
            ->exists();

        // Fix #3: wrap insert + sync in a transaction
        DB::transaction(function () use ($user, $target, $data, $granterIsDelegated) {
            DB::table('permission_delegations')->insert([
                'granted_by'     => $user->id,
                'granted_to'     => $target->id,
                'task_access'    => $data['task_access'],
                'project_access' => $data['project_access'],
                'is_delegated'   => $granterIsDelegated,
                'created_at'     => now(),
                'updated_at'     => now(),
            ]);

            $this->syncPermissions($target);
        });

        return response()->json([
            'success' => true,
            'message' => "Access granted to {$target->name}.",
            'data'    => [
                'id'            => $target->id,
                'name'          => $target->name,
                'email'         => $target->email,
                'taskAccess'    => $data['task_access'],
                'projectAccess' => $data['project_access'],
            ],
        ]);
    }

    /**
     * Update module toggles for an already-granted user.
     * If both are turned OFF, fully revokes access.
     */
    public function updateModules(Request $request)
    {
        $user = $request->user();

        $data = $request->validate([
            'user_id'        => ['required', 'integer', 'exists:users,id'],
            'task_access'    => ['required', 'boolean'],
            'project_access' => ['required', 'boolean'],
        ]);

        $target = User::whereNull('deleted_at')->findOrFail($data['user_id']);

        $delegation = DB::table('permission_delegations')
            ->where('granted_by', $user->id)
            ->where('granted_to', $target->id)
            ->first();

        if (!$delegation) {
            return response()->json(['success' => false, 'message' => 'You did not grant access to this user.'], 403);
        }

        if (!$data['task_access'] && !$data['project_access']) {
            return $this->revokeUser($user, $target);
        }

        // Fix #3: wrap update + sync in a transaction
        DB::transaction(function () use ($user, $target, $data) {
            DB::table('permission_delegations')
                ->where('granted_by', $user->id)
                ->where('granted_to', $target->id)
                ->update([
                    'task_access'    => $data['task_access'],
                    'project_access' => $data['project_access'],
                    'updated_at'     => now(),
                ]);

            $this->syncPermissions($target);
        });

        return response()->json([
            'success' => true,
            'message' => "Modules updated for {$target->name}.",
            'data'    => [
                'id'            => $target->id,
                'taskAccess'    => $data['task_access'],
                'projectAccess' => $data['project_access'],
            ],
        ]);
    }

    /**
     * Fully revoke access — only if YOU granted it.
     */
    public function revoke(Request $request)
    {
        $user = $request->user();

        $request->validate(['user_id' => ['required', 'integer', 'exists:users,id']]);

        $target = User::whereNull('deleted_at')->findOrFail($request->user_id);

        return $this->revokeUser($user, $target);
    }

    // ── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Sync Spatie permissions based on the union of ALL delegations for this user.
     *
     * Fix #5: tm.access is no longer in TASK_PERMISSIONS — it is handled exclusively
     *         here as a gate that is open when either module is active.
     * Fix #6: parameters removed — always reads from DB, defaults to false on null.
     */
    private function syncPermissions(User $target): void
    {
        $effective = DB::table('permission_delegations')
            ->where('granted_to', $target->id)
            ->selectRaw('MAX(task_access::int) as task_access, MAX(project_access::int) as project_access')
            ->first();

        $effectiveTask    = (bool) ($effective->task_access ?? false);
        $effectiveProject = (bool) ($effective->project_access ?? false);

        $toGive   = [];
        $toRevoke = [];

        if ($effectiveTask) {
            $toGive = array_merge($toGive, self::TASK_PERMISSIONS);
        } else {
            $toRevoke = array_merge($toRevoke, self::TASK_PERMISSIONS);
        }

        if ($effectiveProject) {
            $toGive = array_merge($toGive, self::PROJECT_PERMISSIONS);
        } else {
            $toRevoke = array_merge($toRevoke, self::PROJECT_PERMISSIONS);
        }

        // Fix #5: tm.access is the login gate — open if either module is active
        if ($effectiveTask || $effectiveProject) {
            $toGive[] = 'tm.access';
        } else {
            $toRevoke[] = 'tm.access';
        }

        if (!empty($toGive)) {
            $target->givePermissionTo(Permission::whereIn('name', array_unique($toGive))->get());
        }

        if (!empty($toRevoke)) {
            $target->revokePermissionTo(Permission::whereIn('name', array_unique($toRevoke))->get());
        }

        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();
    }

    private function revokeUser(User $granter, User $target): \Illuminate\Http\JsonResponse
    {
        // Fix #3: wrap delete + sync in a transaction
        $result = DB::transaction(function () use ($granter, $target) {
            $deleted = DB::table('permission_delegations')
                ->where('granted_by', $granter->id)
                ->where('granted_to', $target->id)
                ->delete();

            if (!$deleted) {
                return false;
            }

            $this->syncPermissions($target);

            return true;
        });

        if (!$result) {
            return response()->json(['success' => false, 'message' => 'You did not grant access to this user.'], 403);
        }

        return response()->json([
            'success' => true,
            'message' => "Access revoked from {$target->name}.",
        ]);
    }
}
