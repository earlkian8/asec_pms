<?php

namespace App\Traits;

use App\Models\ClientNotification;
use App\Models\Project;

trait ClientNotificationTrait
{
    /**
     * Create a notification for a project's client
     */
    protected function createClientNotification(Project $project, string $type, string $title, string $message)
    {
        if (! $project->client_id) {
            return null;
        }

        return ClientNotification::create([
            'client_id' => $project->client_id,
            'project_id' => $project->id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'read' => false,
        ]);
    }

    /**
     * Create notification for progress update
     */
    protected function notifyProgressUpdate(Project $project, string $taskTitle, string $milestoneName)
    {
        return $this->createClientNotification(
            $project,
            'update',
            'New Progress Update',
            "A new progress update has been added for task '{$taskTitle}' in milestone '{$milestoneName}' for project '{$project->project_name}'."
        );
    }

    /**
     * Create notification for milestone completion
     */
    protected function notifyMilestoneCompleted(Project $project, string $milestoneName)
    {
        return $this->createClientNotification(
            $project,
            'milestone',
            'Milestone Completed',
            "The milestone '{$milestoneName}' has been completed for project '{$project->project_name}'."
        );
    }

    /**
     * Create notification for milestone status change
     */
    protected function notifyMilestoneStatusChange(Project $project, string $milestoneName, string $status)
    {
        $statusText = match ($status) {
            'pending' => 'is pending',
            'in_progress' => 'is now in progress',
            'completed' => 'has been completed',
            default => "status changed to {$status}",
        };

        return $this->createClientNotification(
            $project,
            'milestone',
            'Milestone Status Updated',
            "The milestone '{$milestoneName}' {$statusText} for project '{$project->project_name}'."
        );
    }

    /**
     * Create notification for project status change
     */
    protected function notifyProjectStatusChange(Project $project, string $oldStatus, string $newStatus)
    {
        return $this->createClientNotification(
            $project,
            'status_change',
            'Project Status Updated',
            "Project '{$project->project_name}' status has been changed from ".ucfirst(str_replace('_', ' ', $oldStatus)).' to '.ucfirst(str_replace('_', ' ', $newStatus)).'.'
        );
    }

    /**
     * Create notification for project issue
     */
    protected function notifyProjectIssue(Project $project, string $issueTitle)
    {
        return $this->createClientNotification(
            $project,
            'issue',
            'New Project Issue',
            "A new issue '{$issueTitle}' has been reported for project '{$project->project_name}'."
        );
    }
}
