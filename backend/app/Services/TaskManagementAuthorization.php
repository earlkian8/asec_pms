<?php

namespace App\Services;

use App\Models\Project;
use App\Models\ProjectTask;
use App\Models\ProjectTeam;
use App\Models\User;

class TaskManagementAuthorization
{
    // Core task-management permissions
    public const PERM_ACCESS = 'tm.access';
    public const PERM_PROJECTS_VIEW_ASSIGNED = 'tm.projects.view-assigned';

    /**
     * Access rules:
     * Visibility is permission-driven:
     * - if user has tm.projects.view-assigned: tasks on projects where they are on the project team (occupied/current)
     * - otherwise: tasks explicitly assigned to them
     */
    public function canAccessTask(User $user, ProjectTask $task): bool
    {
        if ($user->can(self::PERM_PROJECTS_VIEW_ASSIGNED)) {
            $projectId = optional(optional($task->milestone)->project)->id;
            if (!$projectId) {
                return false;
            }

            return ProjectTeam::query()
                ->where('user_id', $user->id)
                ->where('project_id', $projectId)
                ->occupied()
                ->current()
                ->exists();
        }

        return (int) $task->assigned_to === (int) $user->id;
    }

    /**
     * Query scope helper for "tasks visible to this user".
     */
    public function visibleTasksQuery(User $user)
    {
        if ($user->can(self::PERM_PROJECTS_VIEW_ASSIGNED)) {
            $projectIds = ProjectTeam::query()
                ->where('user_id', $user->id)
                ->occupied()
                ->current()
                ->pluck('project_id')
                ->unique()
                ->values();

            return ProjectTask::query()
                ->whereHas('milestone.project', function ($q) use ($projectIds) {
                    $q->whereIn('id', $projectIds);
                });
        }

        return ProjectTask::query()->where('assigned_to', $user->id);
    }

    /**
     * Project-scoped membership check (occupied/current).
     */
    public function isAssignedToProject(User $user, Project $project): bool
    {
        return ProjectTeam::query()
            ->where('user_id', $user->id)
            ->where('project_id', $project->id)
            ->occupied()
            ->current()
            ->exists();
    }
}
