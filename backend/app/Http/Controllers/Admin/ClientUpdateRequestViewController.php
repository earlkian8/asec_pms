<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\ClientUpdateRequest;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\DB;

class ClientUpdateRequestViewController extends Controller
{
    /**
     * Mark one or more client update requests as viewed by the current user.
     *
     * Accepts either a single `id` (route param) or an array of `ids` in the body
     * so the TaskDetailModal can bulk-mark all requests on a task in one call.
     *
     * POST /client-update-requests/{request}/mark-viewed   → single
     * POST /client-update-requests/mark-viewed-bulk        → body: { ids: [1,2,3] }
     */
    public function markViewed(ClientUpdateRequest $request)
    {
        $request->markViewedBy(Auth::id());

        return response()->json(['success' => true]);
    }

    public function markViewedBulk(Request $request)
    {
        $ids = $request->validate([
            'ids'   => 'required|array',
            'ids.*' => 'integer|exists:client_update_requests,id',
        ])['ids'];

        $userId = Auth::id();

        $now = now();

        DB::table('client_update_request_views')->upsert(
            collect($ids)->map(fn ($id) => [
                'client_update_request_id' => $id,
                'user_id' => $userId,
                'viewed_at' => $now,
                'created_at' => $now,
                'updated_at' => $now,
            ])->all(),
            ['client_update_request_id', 'user_id'],
            ['viewed_at', 'updated_at']
        );

        return response()->json(['success' => true, 'marked' => count($ids)]);
    }
}