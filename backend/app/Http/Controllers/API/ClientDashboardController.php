<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Http\Requests\API\RequestUpdateRequest;
use App\Models\ClientUpdateRequest;
use App\Models\ProgressUpdate;
use App\Models\Project;
use App\Models\ProjectLaborCost;
use App\Models\ProjectMilestone;
use App\Models\ProjectMiscellaneousExpense;
use App\Models\ProjectTask;
use App\Services\ClientProjectResourceService;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Storage;

class ClientDashboardController extends Controller
{
    use NotificationTrait;

    public function __construct(protected ClientProjectResourceService $clientProjectResource) {}

    /**
     * Get dashboard statistics for authenticated client
     */
    public function statistics(Request $request)
    {
        $client = $request->user();

        // Get all projects for this client
        $projects = Project::where('client_id', $client->id)->get();
        $projectIds = $projects->pluck('id');

        // Calculate statistics
        $activeProjects = $projects->where('status', 'active')->count();
        $completedProjects = $projects->where('status', 'completed')->count();
        $totalBudget = $projects->sum('contract_amount');

        // Calculate total spent (material costs + labor costs + miscellaneous expenses) - optimized
        // Material costs: join with inventory items - only count received materials
        $materialCosts = DB::table('project_material_allocations')
            ->join('inventory_items', 'project_material_allocations.inventory_item_id', '=', 'inventory_items.id')
            ->whereIn('project_material_allocations.project_id', $projectIds)
            ->where('project_material_allocations.quantity_received', '>', 0)
            ->sum(DB::raw('project_material_allocations.quantity_received * inventory_items.unit_price'));

        // Labor costs
        $laborCosts = ProjectLaborCost::whereIn('project_id', $projectIds)
            ->sum(DB::raw('hours_worked * hourly_rate'));

        // Miscellaneous expenses
        $miscellaneousExpenses = ProjectMiscellaneousExpense::whereIn('project_id', $projectIds)
            ->sum('amount');

        $totalSpent = (float) $materialCosts + (float) $laborCosts + (float) $miscellaneousExpenses;

        // Calculate on-time projects (completed on or before planned end date)
        $onTimeProjects = $projects->filter(function ($project) {
            if ($project->status === 'completed' && $project->actual_end_date && $project->planned_end_date) {
                return $project->actual_end_date <= $project->planned_end_date;
            }
            // For active projects, consider them on-time if they haven't passed planned end date
            if ($project->status === 'active' && $project->planned_end_date) {
                return now()->toDateString() <= $project->planned_end_date;
            }

            return false;
        })->count();

        $overdueProjects = $projects->filter(function ($project) {
            if ($project->status === 'completed' && $project->actual_end_date && $project->planned_end_date) {
                return $project->actual_end_date > $project->planned_end_date;
            }
            if ($project->status === 'active' && $project->planned_end_date) {
                return now()->toDateString() > $project->planned_end_date;
            }

            return false;
        })->count();

        return api_success([
            'totalProjects' => $projects->count(),
            'activeProjects' => $activeProjects,
            'completedProjects' => $completedProjects,
            'totalBudget' => (float) $totalBudget,
            'totalSpent' => $totalSpent,
            'onTimeProjects' => $onTimeProjects,
            'overdueProjects' => $overdueProjects,
        ]);
    }

    /**
     * Get projects for authenticated client
     */
    public function projects(Request $request)
    {
        $client = $request->user();
        $status = $request->query('status'); // Optional filter by status
        $search = $request->query('search'); // Optional search query
        $sortBy = $request->query('sort_by', 'name'); // Sort field
        $sortOrder = $request->query('sort_order', 'asc'); // Sort direction

        $query = Project::where('client_id', $client->id)
            ->with(['team.user', 'team.employee', 'milestones.tasks']);

        // Search filter
        if ($search) {
            $query->where(function ($q) use ($search) {
                query_where_search_in($q, ['project_name', 'location', 'description'], $search);
            });
        }

        // Status filter
        if ($status && $status !== 'all') {
            // Map frontend status to backend status
            $statusMap = [
                'active' => 'active',
                'on-hold' => 'on_hold',
                'completed' => 'completed',
            ];
            $backendStatus = $statusMap[$status] ?? $status;
            $query->where('status', $backendStatus);
        }

        // Apply sorting
        $sortFieldMap = [
            'name' => 'project_name',
            'progress' => 'id', // Will sort after calculation
            'budget' => 'contract_amount',
            'date' => 'planned_end_date',
            'status' => 'status',
        ];

        $dbSortField = $sortFieldMap[$sortBy] ?? 'project_name';
        $query->orderBy($dbSortField, $sortOrder === 'desc' ? 'desc' : 'asc');

        $projects = $query->get();
        $projectIds = $projects->pluck('id');

        // Pre-calculate all material costs - only count received materials
        $materialCostsByProject = DB::table('project_material_allocations')
            ->join('inventory_items', 'project_material_allocations.inventory_item_id', '=', 'inventory_items.id')
            ->whereIn('project_material_allocations.project_id', $projectIds)
            ->where('project_material_allocations.quantity_received', '>', 0)
            ->select('project_material_allocations.project_id', DB::raw('SUM(project_material_allocations.quantity_received * inventory_items.unit_price) as total'))
            ->groupBy('project_material_allocations.project_id')
            ->pluck('total', 'project_id');

        // Pre-calculate all labor costs
        $laborCostsByProject = ProjectLaborCost::whereIn('project_id', $projectIds)
            ->select('project_id', DB::raw('SUM(hours_worked * hourly_rate) as total'))
            ->groupBy('project_id')
            ->pluck('total', 'project_id');

        // Pre-calculate all miscellaneous expenses
        $miscellaneousExpensesByProject = ProjectMiscellaneousExpense::whereIn('project_id', $projectIds)
            ->select('project_id', DB::raw('SUM(amount) as total'))
            ->groupBy('project_id')
            ->pluck('total', 'project_id');

        $mappedProjects = $projects->map(function ($project) use ($materialCostsByProject, $laborCostsByProject, $miscellaneousExpensesByProject) {
            $materialCost = (float) ($materialCostsByProject[$project->id] ?? 0);
            $laborCost = (float) ($laborCostsByProject[$project->id] ?? 0);
            $miscellaneousExpense = (float) ($miscellaneousExpensesByProject[$project->id] ?? 0);

            return $this->clientProjectResource->toListItem($project, $materialCost, $laborCost, $miscellaneousExpense);
        });

        // Apply client-side sorting for progress (since it's calculated)
        if ($sortBy === 'progress') {
            $mappedProjects = $mappedProjects->sortBy('progress', SORT_REGULAR, $sortOrder === 'desc');
            $mappedProjects = $mappedProjects->values();
        }

        return api_success($mappedProjects);
    }

    /**
     * Export projects for authenticated client
     */
    public function exportProjects(Request $request)
    {
        $client = $request->user();
        $format = $request->query('format', 'csv'); // csv, json

        // Get all projects (same logic as projects method but without pagination)
        $query = Project::where('client_id', $client->id)
            ->with(['team.user', 'team.employee', 'milestones.tasks']);

        $projects = $query->get();
        $projectIds = $projects->pluck('id');

        // Pre-calculate costs - only count received materials
        $materialCostsByProject = DB::table('project_material_allocations')
            ->join('inventory_items', 'project_material_allocations.inventory_item_id', '=', 'inventory_items.id')
            ->whereIn('project_material_allocations.project_id', $projectIds)
            ->where('project_material_allocations.quantity_received', '>', 0)
            ->select('project_material_allocations.project_id', DB::raw('SUM(project_material_allocations.quantity_received * inventory_items.unit_price) as total'))
            ->groupBy('project_material_allocations.project_id')
            ->pluck('total', 'project_id');

        $laborCostsByProject = ProjectLaborCost::whereIn('project_id', $projectIds)
            ->select('project_id', DB::raw('SUM(hours_worked * hourly_rate) as total'))
            ->groupBy('project_id')
            ->pluck('total', 'project_id');

        // Pre-calculate all miscellaneous expenses
        $miscellaneousExpensesByProject = ProjectMiscellaneousExpense::whereIn('project_id', $projectIds)
            ->select('project_id', DB::raw('SUM(amount) as total'))
            ->groupBy('project_id')
            ->pluck('total', 'project_id');

        $exportData = $projects->map(function ($project) use ($materialCostsByProject, $laborCostsByProject, $miscellaneousExpensesByProject) {
            $materialCost = (float) ($materialCostsByProject[$project->id] ?? 0);
            $laborCost = (float) ($laborCostsByProject[$project->id] ?? 0);
            $miscellaneousExpense = (float) ($miscellaneousExpensesByProject[$project->id] ?? 0);

            return $this->clientProjectResource->toExportRow($project, $materialCost, $laborCost, $miscellaneousExpense);
        });

        if ($format === 'csv') {
            $csv = "Project Name,Status,Progress (%),Location,Project Manager,Budget (PHP),Spent (PHP),Remaining (PHP),Start Date,Expected Completion,Description\n";

            foreach ($exportData as $row) {
                $csv .= '"'.str_replace('"', '""', $row['Project Name']).'",';
                $csv .= '"'.str_replace('"', '""', $row['Status']).'",';
                $csv .= $row['Progress (%)'].',';
                $csv .= '"'.str_replace('"', '""', $row['Location']).'",';
                $csv .= '"'.str_replace('"', '""', $row['Project Manager']).'",';
                $csv .= $row['Budget (PHP)'].',';
                $csv .= $row['Spent (PHP)'].',';
                $csv .= $row['Remaining (PHP)'].',';
                $csv .= $row['Start Date'].',';
                $csv .= $row['Expected Completion'].',';
                $csv .= '"'.str_replace('"', '""', $row['Description']).'"';
                $csv .= "\n";
            }

            return response($csv, 200)
                ->header('Content-Type', 'text/csv')
                ->header('Content-Disposition', 'attachment; filename="projects_'.date('Y-m-d').'.csv"');
        }

        // Return JSON format
        return api_success($exportData);
    }

    /**
     * Submit a request update for a project
     */
    public function requestUpdate(RequestUpdateRequest $request)
    {
        $client = $request->user();
        $validated = $request->validated();

        $project = Project::where('id', $validated['project_id'])
            ->where('client_id', $client->id)
            ->first();

        if (! $project) {
            return api_error('Project not found or does not belong to you', null, 404);
        }

        $updateRequest = ClientUpdateRequest::create([
            'client_id' => $client->id,
            'project_id' => $validated['project_id'],
            'subject' => $validated['subject'],
            'message' => $validated['message'],
        ]);

        $this->createSystemNotification(
            'general',
            'Client Update Request',
            "Client '{$client->client_name}' has submitted an update request for project '{$project->project_name}': {$validated['subject']}",
            $project,
            null // API doesn't have web routes
        );

        return api_success([
            'id' => $updateRequest->id,
            'subject' => $updateRequest->subject,
            'message' => $updateRequest->message,
            'project_id' => $updateRequest->project_id,
            'created_at' => $updateRequest->created_at,
        ], 'Update request submitted successfully', 201);
    }

    /**
     * Get project details for authenticated client
     */
    public function projectDetail(Request $request, $id)
    {
        $client = $request->user();

        // Get project and verify ownership
        $project = Project::where('id', $id)
            ->where('client_id', $client->id)
            ->with([
                'team.user',
                'team.employee',
                'milestones.tasks.assignedUser',
                'milestones.tasks.progressUpdates.createdBy',
                'materialAllocations.inventoryItem',
                'materialAllocations.allocatedBy',
                'laborCosts.user',
                'laborCosts.employee',
                'miscellaneousExpenses.createdBy',
                'issues.reportedBy',
                'issues.assignedTo',
                'issues.milestone',
                'issues.task',
            ])
            ->first();

        if (! $project) {
            return api_error('Project not found or does not belong to you', null, 404);
        }

        $scheme = $request->getScheme();
        $host = $request->getHost();
        $port = $request->getPort();
        $baseUrl = $scheme.'://'.$host.($port && $port != 80 && $port != 443 ? ':'.$port : '');

        $data = $this->clientProjectResource->toDetail($project, $client->id, $baseUrl);

        return api_success($data);
    }

    /**
     * Download progress update file for authenticated client
     */
    public function downloadProgressUpdateFile(Request $request, $projectId, $updateId)
    {
        $client = $request->user();

        // Verify that the project belongs to the authenticated client
        $project = Project::where('id', $projectId)
            ->where('client_id', $client->id)
            ->first();

        if (! $project) {
            return api_error('Project not found or does not belong to you', null, 404);
        }

        // Find the progress update
        $progressUpdate = ProgressUpdate::find($updateId);

        if (! $progressUpdate) {
            return api_error('Progress update not found', null, 404);
        }

        // Verify the progress update belongs to a task in this project
        $task = ProjectTask::find($progressUpdate->project_task_id);
        if (! $task) {
            return api_error('Task not found', null, 404);
        }

        $milestone = ProjectMilestone::find($task->project_milestone_id);
        if (! $milestone || $milestone->project_id !== $project->id) {
            return api_error('Progress update does not belong to this project', null, 403);
        }

        if (! $progressUpdate->file_path) {
            return api_error('No file attached to this progress update', null, 404);
        }

        $disk = env('FILESYSTEM_DISK', 'public');

        if (! Storage::disk($disk)->exists($progressUpdate->file_path)) {
            return api_error('File not found on server', null, 404);
        }

        // Get the file content
        $fileContent = Storage::disk($disk)->get($progressUpdate->file_path);
        $mimeType = Storage::disk($disk)->mimeType($progressUpdate->file_path) ?? 'application/octet-stream';

        // Determine Content-Disposition: inline for images, attachment for other files
        $isImage = str_starts_with($mimeType, 'image/');
        $contentDisposition = $isImage
            ? 'inline; filename="'.$progressUpdate->original_name.'"'
            : 'attachment; filename="'.$progressUpdate->original_name.'"';

        // Get the origin from the request for CORS
        $origin = $request->header('Origin');

        // Build response with file
        $response = response($fileContent, 200)
            ->header('Content-Type', $mimeType)
            ->header('Content-Disposition', $contentDisposition)
            ->header('Access-Control-Allow-Methods', 'GET, OPTIONS')
            ->header('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With, Accept')
            ->header('Access-Control-Expose-Headers', 'Content-Disposition, Content-Type');

        // Set CORS origin (required when using credentials)
        if ($origin) {
            $response->header('Access-Control-Allow-Origin', $origin)
                ->header('Access-Control-Allow-Credentials', 'true');
        } else {
            // Fallback for same-origin requests or when origin is not provided
            $response->header('Access-Control-Allow-Origin', '*');
        }

        return $response;
    }
}
