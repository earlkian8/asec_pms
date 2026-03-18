<?php

namespace App\Services;

use App\Models\ProjectTask;
use App\Models\ProjectTeam;
use App\Models\User;

class TaskManagementAuthorization
{
    public const ROLE_FOREMAN = 'foreman';
    public const ROLE_ENGINEER = 'engineer';

    /**
     * Returns the effective task-management role for a user.
     * If a user has both roles, engineer wins.
     */
    public function getRole(User $user): ?string
    {
        if ($user->hasRole(self::ROLE_ENGINEER)) {
            return self::ROLE_ENGINEER;
        }
        if ($user->hasRole(self::ROLE_FOREMAN)) {
            return self::ROLE_FOREMAN;
        }
        return null;
    }

    public function isEngineer(User $user): bool
    {
        return $this->getRole($user) === self::ROLE_ENGINEER;
    }

    public function isForeman(User $user): bool
    {
        return $this->getRole($user) === self::ROLE_FOREMAN;
    }

    /**
     * Access rules:
     * - foreman: tasks explicitly assigned to them
     * - engineer: tasks on projects where they are on the project team (occupied/current)
     */
    public function canAccessTask(User $user, ProjectTask $task): bool
    {
        $role = $this->getRole($user);

        if ($role === self::ROLE_FOREMAN) {
            return (int) $task->assigned_to === (int) $user->id;
        }

        if ($role === self::ROLE_ENGINEER) {
            $projectId = optional(optional($task->milestone)->project)->id;
            if (!$projectId) {
                return false;
            }

            return ProjectTeam::query()
                ->where('user_id', $user->id)
                ->where('project_id', $projectId)
                ->occupied()
                ->exists();
        }

        return false;
    }

    /**
     * Query scope helper for "tasks visible to this user".
     */
    public function visibleTasksQuery(User $user)
    {
        $role = $this->getRole($user);

        if ($role === self::ROLE_FOREMAN) {
            return ProjectTask::query()->where('assigned_to', $user->id);
        }

        if ($role === self::ROLE_ENGINEER) {
            $projectIds = ProjectTeam::query()
                ->where('user_id', $user->id)
                ->occupied()
                ->pluck('project_id')
                ->unique()
                ->values();

            return ProjectTask::query()
                ->whereHas('milestone.project', function ($q) use ($projectIds) {
                    $q->whereIn('id', $projectIds);
                });
        }

        return ProjectTask::query()->whereRaw('1=0');
    }
}

<?php

namespace App\Services;

use App\Models\ProjectTask;
use App\Models\ProjectTeam;
use App\Models\User;

class TaskManagementAuthorization
{
    public static function getRole(User $user): ?string
    {
        if ($user->hasRole('engineer')) {
            return 'engineer';
        }

        if ($user->hasRole('foreman')) {
            return 'foreman';
        }

        return null;
    }

    public static function canAccessTask(User $user, ProjectTask $task): bool
    {
        $role = self::getRole($user);
        if (!$role) {
            return false;
        }

        // Foreman: only tasks explicitly assigned
        if ($role === 'foreman') {
            return (int) $task->assigned_to === (int) $user->id;
        }

        // Engineer: project-scope access via active project team membership
        if ($role === 'engineer') {
            $projectId = optional(optional($task->milestone)->project)->id;
            if (!$projectId) {
                return false;
            }

            return ProjectTeam::query()
                ->where('project_id', $projectId)
                ->where(function ($q) use ($user) {
                    $q->where('user_id', $user->id)
                      ->orWhere(function ($q2) use ($user) {
                          // If engineers are also represented as employees, extend here
                          $q2->whereNull('user_id')
                             ->whereNotNull('employee_id');
                      });
                })
                ->active()
                ->current()
                ->exists();
        }

        return false;
    }
}

