<?php

namespace App\Http\Controllers\Api\TaskManagement;

use App\Http\Controllers\Controller;
use App\Models\Notification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class NotificationController extends Controller
{
    public function index(Request $request)
    {
        $notifications = Notification::where('user_id', $request->user()->id)
            ->with('project:id,project_name')
            ->orderBy('created_at', 'desc')
            ->limit(50)
            ->get()
            ->map(fn ($n) => [
                'id'        => $n->id,
                'type'      => $n->type,
                'title'     => $n->title,
                'message'   => $n->message,
                'read'      => $n->read,
                'projectId' => $n->project_id,
                'createdAt' => $n->created_at->toISOString(),
            ]);

        return response()->json(['success' => true, 'data' => $notifications]);
    }

    public function unreadCount(Request $request)
    {
        $count = Notification::where('user_id', $request->user()->id)
            ->where('read', false)
            ->count();

        return response()->json(['success' => true, 'count' => $count]);
    }

    public function markAsRead(Request $request, $id)
    {
        $userId = $request->user()->id;

        Notification::where('user_id', $request->user()->id)
            ->where('id', $id)
            ->update(['read' => true]);

        Cache::forget("user_unread_notifications_{$userId}");

        return response()->json(['success' => true]);
    }

    public function markAllAsRead(Request $request)
    {
        $userId = $request->user()->id;

        Notification::where('user_id', $request->user()->id)
            ->where('read', false)
            ->update(['read' => true]);

        Cache::forget("user_unread_notifications_{$userId}");

        return response()->json(['success' => true]);
    }
}
