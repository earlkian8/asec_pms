<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectMilestone;
use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;
use App\Traits\ActivityLogsTrait;
use App\Traits\ClientNotificationTrait;
use App\Traits\NotificationTrait;
use Dompdf\Dompdf;
use Dompdf\Options;

class ProjectMilestonesController extends Controller
{
    use ActivityLogsTrait, ClientNotificationTrait, NotificationTrait;

    // Store new milestone
    public function store(Project $project, Request $request)
    {
        $data = $request->validate([
            'name'               => 'required|string|max:255',
            'description'        => 'nullable|string',
            'start_date'         => 'nullable|date',
            'due_date'           => 'nullable|date|after_or_equal:start_date',
            'billing_percentage' => 'nullable|numeric|min:0|max:100',
            'status'             => ['nullable', Rule::in(['pending','in_progress','completed'])],
        ]);

        $data['status'] = $data['status'] ?? 'pending';

        // Guard: only enforce billing % cap for milestone billing type
        if ($project->billing_type === 'milestone' && !empty($data['billing_percentage'])) {
            $existingTotal = $project->milestones()->sum('billing_percentage');
            $newTotal = $existingTotal + floatval($data['billing_percentage']);

            if ($newTotal > 100) {
                $remaining = max(0, 100 - $existingTotal);
                return back()->withErrors([
                    'billing_percentage' => "Total billing percentage would exceed 100%. "
                        . "Current total: {$existingTotal}%. "
                        . "You can only assign up to " . number_format($remaining, 2) . "% more.",
                ])->withInput();
            }
        }

        $milestone = $project->milestones()->create($data);

        $this->adminActivityLogs(
            'Milestone', 'Created',
            'Created milestone "' . $milestone->name . '" for project "' . $project->project_name . '"'
        );

        $this->notifyMilestoneStatusChange($project, $milestone->name, $milestone->status);

        $this->createSystemNotification(
            'milestone', 'New Milestone Created',
            "A new milestone '{$milestone->name}' has been created for project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );

        return redirect()->back()->with('success', 'Milestone created successfully.');
    }

    // Update milestone
    public function update(Project $project, Request $request, ProjectMilestone $milestone)
    {
        $data = $request->validate([
            'name'               => 'required|string|max:255',
            'description'        => 'nullable|string',
            'start_date'         => 'nullable|date',
            'due_date'           => 'nullable|date|after_or_equal:start_date',
            'billing_percentage' => 'nullable|numeric|min:0|max:100',
            'status'             => ['required', Rule::in(['pending','in_progress','completed'])],
        ]);

        // Guard: only enforce billing % cap for milestone billing type
        if ($project->billing_type === 'milestone' && !empty($data['billing_percentage'])) {
            // Exclude the current milestone from the sum so editing doesn't self-block
            $existingTotal = $project->milestones()
                ->where('id', '!=', $milestone->id)
                ->sum('billing_percentage');

            $newTotal = $existingTotal + floatval($data['billing_percentage']);

            if ($newTotal > 100) {
                $remaining = max(0, 100 - $existingTotal);
                return back()->withErrors([
                    'billing_percentage' => "Total billing percentage would exceed 100%. "
                        . "Other milestones total: {$existingTotal}%. "
                        . "You can only assign up to " . number_format($remaining, 2) . "% to this milestone.",
                ])->withInput();
            }
        }

        // Cannot mark as completed unless all tasks are completed
        if ($data['status'] === 'completed') {
            $tasks = $milestone->tasks;
            $incompleteTasks = $tasks->where('status', '!=', 'completed')->count();

            if ($incompleteTasks > 0) {
                return back()->withErrors([
                    'status' => "Cannot mark milestone as completed. {$incompleteTasks} task(s) still need to be completed.",
                ]);
            }
        }

        $milestone->update($data);

        $this->adminActivityLogs(
            'Milestone', 'Updated',
            'Updated milestone "' . $milestone->name . '" for project "' . $project->project_name . '"'
        );

        $this->notifyMilestoneStatusChange($project, $milestone->name, $milestone->status);

        $this->createSystemNotification(
            'milestone', 'Milestone Updated',
            "Milestone '{$milestone->name}' has been updated for project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );

        return redirect()->back()->with('success', 'Milestone updated successfully.');
    }

    // Delete milestone
    public function destroy(Project $project, ProjectMilestone $milestone)
    {
        $milestoneName = $milestone->name;
        $milestone->delete();

        $this->adminActivityLogs(
            'Milestone',
            'Deleted',
            'Deleted milestone "' . $milestoneName . '" from project "' . $project->project_name . '"'
        );

        // System-wide notification for milestone deletion
        $this->createSystemNotification(
            'milestone',
            'Milestone Deleted',
            "Milestone '{$milestoneName}' has been deleted from project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );
    }

    // Export milestones as PDF
    public function exportPdf(Project $project)
    {
        // Load project with all necessary relationships
        $project->load([
            'client',
            'projectType',
            'milestones' => function ($query) {
                $query->orderBy('due_date', 'asc')
                      ->orderBy('start_date', 'asc');
            },
            'milestones.tasks' => function ($query) {
                $query->orderBy('due_date', 'asc');
            },
            'milestones.tasks.assignedUser'
        ]);

        // Calculate milestone progress and aggregate data
        $milestones = $project->milestones->map(function ($milestone) {
            $tasks = $milestone->tasks;
            $totalTasks = $tasks->count();
            $completedTasks = $tasks->where('status', 'completed')->count();
            
            // Calculate progress percentage based on tasks
            $progressPercentage = $totalTasks > 0 
                ? round(($completedTasks / $totalTasks) * 100, 1) 
                : ($milestone->status === 'completed' ? 100 : 0);
            
            // If milestone is marked as completed but has no tasks, set to 100%
            if ($milestone->status === 'completed' && $totalTasks === 0) {
                $progressPercentage = 100;
            }
            
            return [
                'id' => $milestone->id,
                'name' => $milestone->name,
                'description' => $milestone->description,
                'start_date' => $milestone->start_date,
                'due_date' => $milestone->due_date,
                'status' => $milestone->status,
                'billing_percentage' => $milestone->billing_percentage,
                'total_tasks' => $totalTasks,
                'completed_tasks' => $completedTasks,
                'progress_percentage' => $progressPercentage,
                'tasks' => $tasks->map(function ($task) {
                    return [
                        'id' => $task->id,
                        'title' => $task->title,
                        'description' => $task->description,
                        'status' => $task->status,
                        'due_date' => $task->due_date,
                        'assigned_to' => $task->assignedUser ? $task->assignedUser->name : null,
                    ];
                })->toArray(),
            ];
        });

        // Calculate summary statistics
        $totalMilestones = $milestones->count();
        $completedMilestones = $milestones->where('status', 'completed')->count();
        $inProgressMilestones = $milestones->where('status', 'in_progress')->count();
        $pendingMilestones = $milestones->where('status', 'pending')->count();
        
        // Calculate overall project progress
        $overallProgress = $totalMilestones > 0 
            ? round(($completedMilestones / $totalMilestones) * 100, 1) 
            : 0;
        
        // Calculate total billing percentage
        $totalBillingPercentage = $milestones->sum('billing_percentage');

        // Format dates and currency
        $formattedProject = [
            'code' => $project->project_code,
            'name' => $project->project_name,
            'description' => $project->description,
            'status' => $project->status,
            'priority' => $project->priority,
            'contract_amount' => $project->contract_amount,
            'start_date' => $project->start_date,
            'planned_end_date' => $project->planned_end_date,
            'actual_end_date' => $project->actual_end_date,
            'location' => $project->location,
            'billing_type' => $project->billing_type,
            'client' => $project->client ? [
                'code' => $project->client->client_code,
                'name' => $project->client->client_name,
                'type' => $project->client->client_type ?? null,
            ] : null,
            'project_type' => $project->projectType ? $project->projectType->name : null,
        ];

        // Render the Blade view to HTML
        $html = view('exports.project-milestones', [
            'project' => $formattedProject,
            'milestones' => $milestones->toArray(),
            'summary' => [
                'total_milestones' => $totalMilestones,
                'completed_milestones' => $completedMilestones,
                'in_progress_milestones' => $inProgressMilestones,
                'pending_milestones' => $pendingMilestones,
                'overall_progress' => $overallProgress,
                'total_billing_percentage' => $totalBillingPercentage,
            ],
            'generated_at' => now(),
        ])->render();

        // Configure Dompdf options
        $options = new Options();
        $options->set('defaultFont', 'Arial');
        $options->set('isRemoteEnabled', true);
        $options->set('isHtml5ParserEnabled', true);
        $options->set('chroot', base_path());

        // Create Dompdf instance
        $dompdf = new Dompdf($options);
        $dompdf->loadHtml($html);
        $dompdf->setPaper('letter', 'portrait');
        $dompdf->render();

        // Generate filename
        $date = now()->format('Ymd_His');
        $filename = "Milestones_{$project->project_code}_{$date}.pdf";

        // Stream the PDF
        return $dompdf->stream($filename, ['Attachment' => true]);
    }
}
