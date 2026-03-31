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
        if (!$project->client_id) {
            return null;
        }

        $notification = ClientNotification::create([
            'client_id' => $project->client_id,
            'project_id' => $project->id,
            'type' => $type,
            'title' => $title,
            'message' => $message,
            'read' => false,
        ]);

        // Send Expo push notification if client has a token
        $client = $project->client ?? $project->load('client')->client;
        $pushToken = $client->push_token ?? null;
        if ($pushToken && str_starts_with($pushToken, 'ExponentPushToken')) {
            $this->sendExpoPush($pushToken, $title, $message, [
                'type' => $type,
                'projectId' => (string) $project->id,
            ]);
        }

        return $notification;
    }

    /**
     * Send an Expo push notification
     */
    private function sendExpoPush(string $token, string $title, string $body, array $data = []): void
    {
        try {
            \Illuminate\Support\Facades\Http::post('https://exp.host/--/api/v2/push/send', [
                'to'    => $token,
                'title' => $title,
                'body'  => $body,
                'data'  => $data,
                'sound' => 'default',
            ]);
        } catch (\Throwable $e) {
            \Illuminate\Support\Facades\Log::warning('Expo push failed: ' . $e->getMessage());
        }
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
        $statusText = match($status) {
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
            "Project '{$project->project_name}' status has been changed from " . ucfirst(str_replace('_', ' ', $oldStatus)) . " to " . ucfirst(str_replace('_', ' ', $newStatus)) . "."
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

    /**
     * Create notification for new task added to a milestone
     */
    protected function notifyTaskCreated(Project $project, string $taskTitle, string $milestoneName)
    {
        return $this->createClientNotification(
            $project,
            'update',
            'New Task Added',
            "A new task '{$taskTitle}' has been added to milestone '{$milestoneName}' for project '{$project->project_name}'."
        );
    }

    /**
     * Create notification for material allocation status change
     */
    protected function notifyMaterialStatusChange(Project $project, string $itemName, string $status)
    {
        $statusText = match($status) {
            'received' => 'has been fully received',
            'partial'  => 'has been partially received',
            default    => "status changed to {$status}",
        };

        return $this->createClientNotification(
            $project,
            'update',
            'Material Delivery Update',
            "Material '{$itemName}' {$statusText} for project '{$project->project_name}'."
        );
    }

    /**
     * Create notification for new billing statement
     */
    protected function notifyBillingCreated(Project $project, string $billingCode, string $amount)
    {
        return $this->createClientNotification(
            $project,
            'billing',
            'New Billing Statement',
            "A new billing statement ({$billingCode}) of {$amount} has been issued for project '{$project->project_name}'."
        );
    }

    /**
     * Create notification for payment received
     */
    protected function notifyPaymentReceived(Project $project, string $billingCode, string $amount)
    {
        return $this->createClientNotification(
            $project,
            'billing',
            'Payment Confirmed',
            "A payment of {$amount} has been recorded for billing {$billingCode} on project '{$project->project_name}'."
        );
    }
}

