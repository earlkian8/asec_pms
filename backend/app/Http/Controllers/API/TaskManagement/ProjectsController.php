<?php

namespace App\Http\Controllers\Api\TaskManagement;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectTeam;
use App\Services\TaskManagementAuthorization;
use Illuminate\Http\Request;

class ProjectsController extends Controller
{
    /**
     * List projects assigned to authenticated user (occupied/current membership).
     */
    public function index(Request $request)
    {
        $user = $request->user();

        $projectIds = ProjectTeam::query()
            ->where('user_id', $user->id)
            ->occupied()
            ->current()
            ->pluck('project_id')
            ->unique()
            ->values();

        $projects = Project::query()
            ->whereIn('id', $projectIds)
            ->whereNull('archived_at')
            ->withCount(['milestones', 'team'])
            ->orderBy('project_name', 'asc')
            ->get()
            ->map(fn (Project $p) => [
                'id' => $p->id,
                'projectCode' => $p->project_code,
                'projectName' => $p->project_name,
                'status' => $p->status,
                'priority' => $p->priority,
                'location' => $p->location,
                'startDate' => $p->start_date,
                'plannedEndDate' => $p->planned_end_date,
                'milestonesCount' => (int) $p->milestones_count,
                'teamCount' => (int) $p->team_count,
            ])
            ->values();

        return response()->json([
            'success' => true,
            'data' => $projects,
        ]);
    }

    /**
     * Show a single project overview (scoped).
     */
    public function show(Request $request, Project $project)
    {
        $user = $request->user();
        $authz = app(TaskManagementAuthorization::class);

        if (!$authz->isAssignedToProject($user, $project)) {
            return response()->json([
                'success' => false,
                'message' => 'Project not found or you do not have access to it',
            ], 404);
        }

        $project->loadCount(['milestones', 'team']);

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $project->id,
                'projectCode' => $project->project_code,
                'projectName' => $project->project_name,
                'description' => $project->description,
                'status' => $project->status,
                'priority' => $project->priority,
                'location' => $project->location,
                'startDate' => $project->start_date,
                'plannedEndDate' => $project->planned_end_date,
                'actualEndDate' => $project->actual_end_date,
                'milestonesCount' => (int) $project->milestones_count,
                'teamCount' => (int) $project->team_count,
            ],
        ]);
    }
}

