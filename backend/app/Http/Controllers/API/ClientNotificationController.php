<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\ClientNotification;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Cache;

class ClientNotificationController extends Controller
{
    /**
     * Get all notifications for authenticated client
     */
    public function index(Request $request)
    {
        $client = $request->user();
        
        $query = ClientNotification::where('client_id', $client->id)
            ->with('project:id,project_name,project_code')
            ->orderBy('created_at', 'desc');
        
        // Filter by read status
        if ($request->has('read')) {
            $query->where('read', filter_var($request->read, FILTER_VALIDATE_BOOLEAN));
        }
        
        // Filter by type
        if ($request->has('type')) {
            $query->where('type', $request->type);
        }
        
        $notifications = $query->get();
        
        // Format notifications to match client app expectations
        $formattedNotifications = $notifications->map(function ($notification) {
            return [
                'id' => (string) $notification->id,
                'type' => $notification->type,
                'title' => $notification->title,
                'message' => $notification->message,
                'date' => $notification->created_at->toISOString(),
                'projectId' => $notification->project_id ? (string) $notification->project_id : null,
                'read' => $notification->read,
            ];
        });
        
        return response()->json([
            'success' => true,
            'data' => $formattedNotifications,
        ]);
    }

    /**
     * Get unread notification count
     */
    public function unreadCount(Request $request)
    {
        $client = $request->user();
        
        $count = ClientNotification::where('client_id', $client->id)
            ->where('read', false)
            ->count();
        
        return response()->json([
            'success' => true,
            'data' => [
                'count' => $count,
            ],
        ]);
    }

    /**
     * Mark notification as read
     */
    public function markAsRead(Request $request, $id)
    {
        $client = $request->user();
        
        $notification = ClientNotification::where('client_id', $client->id)
            ->findOrFail($id);
        
        $notification->update(['read' => true]);
        Cache::forget("user_unread_notifications_{$client->id}");
        
        return response()->json([
            'success' => true,
            'message' => 'Notification marked as read',
        ]);
    }

    /**
     * Mark all notifications as read
     */
    public function markAllAsRead(Request $request)
    {
        $client = $request->user();
        
        ClientNotification::where('client_id', $client->id)
            ->where('read', false)
            ->update(['read' => true]);

        Cache::forget("user_unread_notifications_{$client->id}");
        
        return response()->json([
            'success' => true,
            'message' => 'All notifications marked as read',
        ]);
    }

    /**
     * Delete a notification
     */
    public function destroy(Request $request, $id)
    {
        $client = $request->user();
        
        $notification = ClientNotification::where('client_id', $client->id)
            ->findOrFail($id);
        
        $notification->delete();
        
        return response()->json([
            'success' => true,
            'message' => 'Notification deleted',
        ]);
    }

    /**
     * Clear all notifications
     */
    public function clearAll(Request $request)
    {
        $client = $request->user();
        
        ClientNotification::where('client_id', $client->id)->delete();
        
        return response()->json([
            'success' => true,
            'message' => 'All notifications cleared',
        ]);
    }
}

