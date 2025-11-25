<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectMaterialAllocation;
use App\Models\ProjectLaborCost;
use App\Models\ProjectMilestone;
use App\Models\InventoryItem;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class ClientDashboardController extends Controller
{
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
        
        // Calculate total spent (material costs + labor costs) - optimized
        // Material costs: join with inventory items
        $materialCosts = DB::table('project_material_allocations')
            ->join('inventory_items', 'project_material_allocations.inventory_item_id', '=', 'inventory_items.id')
            ->whereIn('project_material_allocations.project_id', $projectIds)
            ->sum(DB::raw('project_material_allocations.quantity_allocated * inventory_items.unit_price'));
        
        // Labor costs
        $laborCosts = ProjectLaborCost::whereIn('project_id', $projectIds)
            ->sum(DB::raw('hours_worked * hourly_rate'));
        
        $totalSpent = (float) $materialCosts + (float) $laborCosts;
        
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
        
        return response()->json([
            'success' => true,
            'data' => [
                'totalProjects' => $projects->count(),
                'activeProjects' => $activeProjects,
                'completedProjects' => $completedProjects,
                'totalBudget' => (float) $totalBudget,
                'totalSpent' => $totalSpent,
                'onTimeProjects' => $onTimeProjects,
                'overdueProjects' => $overdueProjects,
            ],
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
            ->with(['team.user', 'milestones.tasks']);
        
        // Search filter
        if ($search) {
            $query->where(function ($q) use ($search) {
                $q->where('project_name', 'ilike', "%{$search}%")
                  ->orWhere('location', 'ilike', "%{$search}%")
                  ->orWhere('description', 'ilike', "%{$search}%");
            });
        }
        
        // Status filter
        if ($status && $status !== 'all') {
            // Map frontend status to backend status
            $statusMap = [
                'active' => 'active',
                'on-hold' => 'on_hold',
                'completed' => 'completed',
                'pending' => 'planning',
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
        
        // Pre-calculate all material costs
        $materialCostsByProject = DB::table('project_material_allocations')
            ->join('inventory_items', 'project_material_allocations.inventory_item_id', '=', 'inventory_items.id')
            ->whereIn('project_material_allocations.project_id', $projectIds)
            ->select('project_material_allocations.project_id', DB::raw('SUM(project_material_allocations.quantity_allocated * inventory_items.unit_price) as total'))
            ->groupBy('project_material_allocations.project_id')
            ->pluck('total', 'project_id');
        
        // Pre-calculate all labor costs
        $laborCostsByProject = ProjectLaborCost::whereIn('project_id', $projectIds)
            ->select('project_id', DB::raw('SUM(hours_worked * hourly_rate) as total'))
            ->groupBy('project_id')
            ->pluck('total', 'project_id');
        
        $mappedProjects = $projects->map(function ($project) use ($materialCostsByProject, $laborCostsByProject) {
            // Calculate progress from milestones
            $milestones = $project->milestones;
            $progress = 0;
            if ($milestones->count() > 0) {
                $totalProgress = $milestones->sum(function ($milestone) {
                    // Calculate milestone progress based on tasks if available
                    $tasks = $milestone->tasks ?? collect();
                    if ($tasks->count() > 0) {
                        $completedTasks = $tasks->where('status', 'completed')->count();
                        return ($completedTasks / $tasks->count()) * 100;
                    }
                    // Fallback: use milestone status
                    return $milestone->status === 'completed' ? 100 : ($milestone->status === 'in_progress' ? 50 : 0);
                });
                $progress = round($totalProgress / $milestones->count());
            }
            
            // Get spent from pre-calculated values
            $materialCost = (float) ($materialCostsByProject[$project->id] ?? 0);
            $laborCost = (float) ($laborCostsByProject[$project->id] ?? 0);
            $spent = $materialCost + $laborCost;
            
            // Get project manager
            $projectManager = $project->team
                ->where('role', 'Project Manager')
                ->where('is_active', true)
                ->first();
            $projectManagerName = $projectManager ? $projectManager->user->name : 'N/A';
            
            // Map backend status to frontend status
            $statusMap = [
                'active' => 'active',
                'on_hold' => 'on-hold',
                'completed' => 'completed',
                'planning' => 'pending',
                'cancelled' => 'on-hold',
            ];
            
            return [
                'id' => (string) $project->id,
                'name' => $project->project_name,
                'description' => $project->description ?? '',
                'status' => $statusMap[$project->status] ?? 'pending',
                'progress' => $progress,
                'startDate' => $project->start_date,
                'expectedCompletion' => $project->planned_end_date,
                'budget' => (float) $project->contract_amount,
                'spent' => $spent,
                'location' => $project->location ?? '',
                'projectManager' => $projectManagerName,
            ];
        });
        
        // Apply client-side sorting for progress (since it's calculated)
        if ($sortBy === 'progress') {
            $mappedProjects = $mappedProjects->sortBy('progress', SORT_REGULAR, $sortOrder === 'desc');
            $mappedProjects = $mappedProjects->values();
        }
        
        return response()->json([
            'success' => true,
            'data' => $mappedProjects,
        ]);
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
            ->with(['team.user', 'milestones.tasks']);
        
        $projects = $query->get();
        $projectIds = $projects->pluck('id');
        
        // Pre-calculate costs
        $materialCostsByProject = DB::table('project_material_allocations')
            ->join('inventory_items', 'project_material_allocations.inventory_item_id', '=', 'inventory_items.id')
            ->whereIn('project_material_allocations.project_id', $projectIds)
            ->select('project_material_allocations.project_id', DB::raw('SUM(project_material_allocations.quantity_allocated * inventory_items.unit_price) as total'))
            ->groupBy('project_material_allocations.project_id')
            ->pluck('total', 'project_id');
        
        $laborCostsByProject = ProjectLaborCost::whereIn('project_id', $projectIds)
            ->select('project_id', DB::raw('SUM(hours_worked * hourly_rate) as total'))
            ->groupBy('project_id')
            ->pluck('total', 'project_id');
        
        $exportData = $projects->map(function ($project) use ($materialCostsByProject, $laborCostsByProject) {
            $milestones = $project->milestones;
            $progress = 0;
            if ($milestones->count() > 0) {
                $totalProgress = $milestones->sum(function ($milestone) {
                    $tasks = $milestone->tasks ?? collect();
                    if ($tasks->count() > 0) {
                        $completedTasks = $tasks->where('status', 'completed')->count();
                        return ($completedTasks / $tasks->count()) * 100;
                    }
                    return $milestone->status === 'completed' ? 100 : ($milestone->status === 'in_progress' ? 50 : 0);
                });
                $progress = round($totalProgress / $milestones->count());
            }
            
            $materialCost = (float) ($materialCostsByProject[$project->id] ?? 0);
            $laborCost = (float) ($laborCostsByProject[$project->id] ?? 0);
            $spent = $materialCost + $laborCost;
            
            $projectManager = $project->team
                ->where('role', 'Project Manager')
                ->where('is_active', true)
                ->first();
            $projectManagerName = $projectManager ? $projectManager->user->name : 'N/A';
            
            $statusMap = [
                'active' => 'Active',
                'on_hold' => 'On Hold',
                'completed' => 'Completed',
                'planning' => 'Pending',
                'cancelled' => 'On Hold',
            ];
            
            return [
                'Project Name' => $project->project_name,
                'Status' => $statusMap[$project->status] ?? 'Pending',
                'Progress (%)' => $progress,
                'Location' => $project->location ?? '',
                'Project Manager' => $projectManagerName,
                'Budget (PHP)' => (float) $project->contract_amount,
                'Spent (PHP)' => $spent,
                'Remaining (PHP)' => (float) ($project->contract_amount - $spent),
                'Start Date' => $project->start_date ? date('Y-m-d', strtotime($project->start_date)) : '',
                'Expected Completion' => $project->planned_end_date ? date('Y-m-d', strtotime($project->planned_end_date)) : '',
                'Description' => $project->description ?? '',
            ];
        });
        
        if ($format === 'csv') {
            $csv = "Project Name,Status,Progress (%),Location,Project Manager,Budget (PHP),Spent (PHP),Remaining (PHP),Start Date,Expected Completion,Description\n";
            
            foreach ($exportData as $row) {
                $csv .= '"' . str_replace('"', '""', $row['Project Name']) . '",';
                $csv .= '"' . str_replace('"', '""', $row['Status']) . '",';
                $csv .= $row['Progress (%)'] . ',';
                $csv .= '"' . str_replace('"', '""', $row['Location']) . '",';
                $csv .= '"' . str_replace('"', '""', $row['Project Manager']) . '",';
                $csv .= $row['Budget (PHP)'] . ',';
                $csv .= $row['Spent (PHP)'] . ',';
                $csv .= $row['Remaining (PHP)'] . ',';
                $csv .= $row['Start Date'] . ',';
                $csv .= $row['Expected Completion'] . ',';
                $csv .= '"' . str_replace('"', '""', $row['Description']) . '"';
                $csv .= "\n";
            }
            
            return response($csv, 200)
                ->header('Content-Type', 'text/csv')
                ->header('Content-Disposition', 'attachment; filename="projects_' . date('Y-m-d') . '.csv"');
        }
        
        // Return JSON format
        return response()->json([
            'success' => true,
            'data' => $exportData,
        ]);
    }
}

