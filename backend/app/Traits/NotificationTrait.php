<?php

namespace App\Traits;

use App\Models\Notification;
use App\Models\Project;
use App\Models\User;

trait NotificationTrait
{
    /**
     * Create a notification for a user
     */
    protected function createNotification(User $user, string $type, string $title, string $message, ?Project $project = null, ?string $link = null)
    {
        return Notification::create([
            'user_id' => $user->id,
            'project_id' => $project?->id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'read' => false,
            'link' => $link,
        ]);
    }

    /**
     * Create notification for multiple users
     */
    protected function createNotificationForUsers(array $users, string $type, string $title, string $message, ?Project $project = null, ?string $link = null)
    {
        $notifications = [];
        foreach ($users as $user) {
            $notifications[] = $this->createNotification($user, $type, $title, $message, $project, $link);
        }
        return $notifications;
    }

    /**
     * Create system-wide notification for ALL users (system-based notification)
     */
    protected function createSystemNotification(string $type, string $title, string $message, ?Project $project = null, ?string $link = null)
    {
        $users = User::all();
        $notifications = [];
        $authId = auth()->id();
        
        // If no users exist, return empty array
        if ($users->isEmpty()) {
            return $notifications;
        }
        
        foreach ($users as $user) {

                $notifications[] = $this->createNotification($user, $type, $title, $message, $project, $link);
            
        }
        
        return $notifications;
    }

    /**
     * Create notification for progress update (for users)
     */
    protected function notifyUserProgressUpdate(User $user, Project $project, string $taskTitle, string $milestoneName)
    {
        return $this->createNotification(
            $user,
            'update',
            'New Progress Update',
            "A new progress update has been added for task '{$taskTitle}' in milestone '{$milestoneName}' for project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );
    }

    /**
     * Create notification for milestone completion (for users)
     */
    protected function notifyUserMilestoneCompleted(User $user, Project $project, string $milestoneName)
    {
        return $this->createNotification(
            $user,
            'milestone',
            'Milestone Completed',
            "The milestone '{$milestoneName}' has been completed for project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );
    }

    /**
     * Create notification for milestone status change (for users)
     */
    protected function notifyUserMilestoneStatusChange(User $user, Project $project, string $milestoneName, string $status)
    {
        $statusText = match($status) {
            'in_progress' => 'is now in progress',
            'completed' => 'has been completed',
            default => "status changed to {$status}",
        };

        return $this->createNotification(
            $user,
            'milestone',
            'Milestone Status Updated',
            "The milestone '{$milestoneName}' {$statusText} for project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );
    }

    /**
     * Create notification for project status change (for users)
     */
    protected function notifyUserProjectStatusChange(User $user, Project $project, string $oldStatus, string $newStatus)
    {
        return $this->createNotification(
            $user,
            'status_change',
            'Project Status Updated',
            "Project '{$project->project_name}' status has been changed from " . ucfirst(str_replace('_', ' ', $oldStatus)) . " to " . ucfirst(str_replace('_', ' ', $newStatus)) . ".",
            $project,
            route('project-management.view', $project->id)
        );
    }

    /**
     * Create notification for project issue (for users)
     */
    protected function notifyUserProjectIssue(User $user, Project $project, string $issueTitle)
    {
        return $this->createNotification(
            $user,
            'issue',
            'New Project Issue',
            "A new issue '{$issueTitle}' has been reported for project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );
    }

    /**
     * Create notification for task assignment
     */
    protected function notifyTaskAssignment(User $user, Project $project, string $taskTitle, string $milestoneName)
    {
        return $this->createNotification(
            $user,
            'task',
            'Task Assigned',
            "You have been assigned to task '{$taskTitle}' in milestone '{$milestoneName}' for project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );
    }
}

