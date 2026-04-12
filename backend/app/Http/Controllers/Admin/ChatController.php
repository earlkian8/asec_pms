<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\Message;
use App\Models\Client;
use App\Events\MessageSent;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Inertia\Inertia;

class ChatController extends Controller
{
    /**
     * List all chats
     */
    public function index(Request $request)
    {
        $search = $request->input('search');
        $sortBy = $request->input('sort_by', 'last_message_at');
        $sortOrder = $request->input('sort_order', 'desc');

        // Validate sort column
        $allowedSortColumns = ['last_message_at', 'client_name', 'created_at'];
        if (!in_array($sortBy, $allowedSortColumns)) {
            $sortBy = 'last_message_at';
        }

        // Validate sort order
        $sortOrder = in_array(strtolower($sortOrder), ['asc', 'desc']) ? strtolower($sortOrder) : 'desc';

        $chats = Chat::with(['client', 'user', 'latestMessage'])
            ->withCount([
                'messages as unread_count' => fn($query) => $query
                    ->where('sender_type', 'client')
                    ->where('read', false),
            ])
            ->when($search, function ($query, $search) {
                return $query->whereHas('client', function ($q) use ($search) {
                    $q->where('client_name', 'like', "%{$search}%")
                      ->orWhere('client_code', 'like', "%{$search}%")
                      ->orWhere('email', 'like', "%{$search}%");
                });
            })
            ->when($sortBy === 'client_name', function ($query) use ($sortOrder) {
                return $query->join('clients', 'chats.client_id', '=', 'clients.id')
                    ->orderBy('clients.client_name', $sortOrder)
                    ->select('chats.*');
            })
            ->when($sortBy !== 'client_name', function ($query) use ($sortBy, $sortOrder) {
                return $query->orderBy($sortBy, $sortOrder);
            })
            ->paginate(20);

        return Inertia::render('Chat/index', [
            'chats' => $chats,
            'search' => $search,
            'sort_by' => $sortBy,
            'sort_order' => $sortOrder,
        ]);
    }

    /**
     * View a specific chat
     */
    public function show(Request $request, $chatId)
    {
        $chat = Chat::with(['client', 'user'])
            ->findOrFail($chatId);

        $messages = $chat->messages()
            ->with(['sender'])
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        // Mark admin messages as read when admin views them
        $chat->messages()
            ->where('sender_type', 'client')
            ->where('read', false)
            ->update([
                'read' => true,
                'read_at' => now(),
            ]);

        // Get all chats for sidebar
        $allChats = Chat::with(['client', 'user', 'latestMessage'])
            ->withCount([
                'messages as unread_count' => fn($query) => $query
                    ->where('sender_type', 'client')
                    ->where('read', false),
            ])
            ->orderBy('last_message_at', 'desc')
            ->get();

        return Inertia::render('Chat/show', [
            'chat' => $chat,
            'messages' => $messages,
            'allChats' => $allChats,
        ]);
    }

    /**
     * Send a message as admin
     */
    public function sendMessage(Request $request, $chatId)
    {
        $request->validate([
            'message' => 'required|string|max:5000',
        ]);

        $user = Auth::user();
        $chat = Chat::findOrFail($chatId);

        // Assign chat to current user if not assigned
        if (!$chat->user_id) {
            $chat->update(['user_id' => $user->id]);
        }

        $message = Message::create([
            'chat_id' => $chat->id,
            'sender_type' => 'admin',
            'sender_id' => $user->id,
            'message' => $request->message,
            'read' => false,
        ]);

        // Update chat's last message timestamp
        $chat->update([
            'last_message_at' => now(),
        ]);

        // Load sender relationship
        $message->load('sender');

        // Broadcast message via Pusher
        broadcast(new MessageSent($message))->toOthers();

        return response()->json([
            'success' => true,
            'message' => 'Message sent successfully',
            'data' => [
                'message' => [
                    'id' => $message->id,
                    'chat_id' => $message->chat_id,
                    'sender_type' => $message->sender_type,
                    'sender_id' => $message->sender_id,
                    'sender_name' => $user->name,
                    'message' => $message->message,
                    'read' => $message->read,
                    'created_at' => $message->created_at,
                ],
            ],
        ]);
    }

    /**
     * Get messages for a chat (API endpoint)
     */
    public function getMessages(Request $request, $chatId)
    {
        $chat = Chat::findOrFail($chatId);

        $messages = $chat->messages()
            ->with(['sender'])
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        // Mark client messages as read when admin views them
        $chat->messages()
            ->where('sender_type', 'client')
            ->where('read', false)
            ->update([
                'read' => true,
                'read_at' => now(),
            ]);

        return response()->json([
            'success' => true,
            'data' => [
                'messages' => $messages->items(),
                'pagination' => [
                    'current_page' => $messages->currentPage(),
                    'last_page' => $messages->lastPage(),
                    'per_page' => $messages->perPage(),
                    'total' => $messages->total(),
                ],
            ],
        ]);
    }
}

