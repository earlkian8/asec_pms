<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClientUpdateRequest;
use App\Traits\ActivityLogsTrait;
use Illuminate\Http\Request;
use Inertia\Inertia;

class ClientUpdateRequestsController extends Controller
{
    use ActivityLogsTrait;

    /**
     * Display a listing of client update requests.
     */
    public function index(Request $request)
    {
        $search = $request->input('search');
        $clientId = $request->input('client_id');
        $projectId = $request->input('project_id');
        $startDate = $request->input('start_date');
        $endDate = $request->input('end_date');
        $sortBy = $request->input('sort_by', 'created_at');
        $sortOrder = $request->input('sort_order', 'desc');

        // Validate sort column
        $allowedSortColumns = ['created_at', 'subject', 'client_name', 'project_name'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'created_at';
        }

        // Validate sort order
        $sortOrder = in_array(strtolower($sortOrder), ['asc', 'desc']) ? strtolower($sortOrder) : 'desc';

        $query = ClientUpdateRequest::with(['client', 'project'])
            ->when($search, function ($q, $search) {
                return $q->where(function ($subQuery) use ($search) {
                    $subQuery->where('subject', 'like', "%{$search}%")
                      ->orWhere('message', 'like', "%{$search}%")
                      ->orWhereHas('client', function ($clientQuery) use ($search) {
                          $clientQuery->where('client_name', 'like', "%{$search}%")
                                      ->orWhere('client_code', 'like', "%{$search}%");
                      })
                      ->orWhereHas('project', function ($projectQuery) use ($search) {
                          $projectQuery->where('project_name', 'like', "%{$search}%")
                                      ->orWhere('project_code', 'like', "%{$search}%");
                      });
                });
            })
            ->when($clientId, function ($q, $clientId) {
                $q->where('client_id', $clientId);
            })
            ->when($projectId, function ($q, $projectId) {
                $q->where('project_id', $projectId);
            })
            ->when($startDate, function ($q, $startDate) {
                $q->whereDate('created_at', '>=', $startDate);
            })
            ->when($endDate, function ($q, $endDate) {
                $q->whereDate('created_at', '<=', $endDate);
            });

        // Handle sorting by relationship fields using subqueries
        if ($sortBy === 'client_name') {
            $query->orderByRaw("(SELECT client_name FROM clients WHERE clients.id = client_update_requests.client_id) {$sortOrder}");
        } elseif ($sortBy === 'project_name') {
            $query->orderByRaw("(SELECT project_name FROM projects WHERE projects.id = client_update_requests.project_id) {$sortOrder}");
        } else {
            $query->orderBy($sortBy, $sortOrder);
        }

        $requests = $query->paginate(15)->withQueryString();

        // Get unique values for filter options
        $clients = \App\Models\Client::whereHas('projects')
            ->orderBy('client_name')
            ->get(['id', 'client_name', 'client_code']);
        
        $projects = \App\Models\Project::with('client')
            ->orderBy('project_name')
            ->get(['id', 'project_name', 'project_code', 'client_id']);

        return Inertia::render('ClientManagement/RequestUpdates/index', [
            'requests' => $requests,
            'search' => $search,
            'filters' => [
                'client_id' => $clientId,
                'project_id' => $projectId,
                'start_date' => $startDate,
                'end_date' => $endDate,
            ],
            'filterOptions' => [
                'clients' => $clients,
                'projects' => $projects,
            ],
            'sort_by' => $sortBy,
            'sort_order' => $sortOrder,
        ]);
    }

    /**
     * Remove the specified client update request.
     */
    public function destroy(ClientUpdateRequest $clientUpdateRequest)
    {
        $clientUpdateRequest->delete();

        return redirect()->route('client-management.request-updates.index')
            ->with('success', 'Request update deleted successfully.');
    }
}

