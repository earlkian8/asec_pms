<?php

namespace App\Exports;

use App\Models\Project;
use Illuminate\Contracts\View\View;
use Maatwebsite\Excel\Concerns\FromView;
use Maatwebsite\Excel\Concerns\WithTitle;

class ProjectMilestonesExport implements FromView, WithTitle
{
    protected $project;

    public function __construct(Project $project)
    {
        // Load project with all necessary relationships
        $this->project = $project->load([
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
    }

    public function view(): View
    {
        // Calculate milestone progress and aggregate data
        $milestones = $this->project->milestones->map(function ($milestone) {
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
            'code' => $this->project->project_code,
            'name' => $this->project->project_name,
            'description' => $this->project->description,
            'status' => $this->project->status,
            'priority' => $this->project->priority,
            'contract_amount' => $this->project->contract_amount,
            'start_date' => $this->project->start_date,
            'planned_end_date' => $this->project->planned_end_date,
            'actual_end_date' => $this->project->actual_end_date,
            'location' => $this->project->location,
            'billing_type' => $this->project->billing_type,
            'client' => $this->project->client ? [
                'code' => $this->project->client->client_code,
                'name' => $this->project->client->client_name,
                'type' => $this->project->client->client_type ?? null,
            ] : null,
            'project_type' => $this->project->projectType ? $this->project->projectType->name : null,
        ];

        return view('exports.project-milestones', [
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
        ]);
    }

    public function title(): string
    {
        return 'Project Milestones';
    }
}
