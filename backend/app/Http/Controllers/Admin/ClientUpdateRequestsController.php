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

        $requests = ClientUpdateRequest::with(['client', 'project'])
            ->when($search, function ($query, $search) {
                return $query->where(function ($q) use ($search) {
                    $q->where('subject', 'like', "%{$search}%")
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
            ->orderBy('created_at', 'desc')
            ->paginate(15);

        return Inertia::render('ClientManagement/RequestUpdates/index', [
            'requests' => $requests,
            'search' => $search,
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

