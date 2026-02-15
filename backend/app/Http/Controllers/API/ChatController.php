<?php

namespace App\Http\Controllers\API;

use App\Events\MessageSent;
use App\Http\Controllers\Controller;
use App\Models\Chat;
use App\Models\Message;
use Illuminate\Http\Request;

class ChatController extends Controller
{
    /**
     * Get or create chat for the authenticated client
     */
    public function getChat(Request $request)
    {
        $client = $request->user();

        // Get or create chat for this client
        $chat = Chat::firstOrCreate(
            ['client_id' => $client->id],
            ['user_id' => null] // No specific admin assigned initially
        );

        // Load relationships
        $chat->load(['client', 'user', 'latestMessage']);

        return response()->json([
            'success' => true,
            'data' => [
                'chat' => [
                    'id' => $chat->id,
                    'client_id' => $chat->client_id,
                    'client_name' => $chat->client->client_name,
                    'user_id' => $chat->user_id,
                    'user_name' => $chat->user ? $chat->user->name : null,
                    'last_message_at' => $chat->last_message_at,
                    'unread_count' => $chat->unreadMessagesCount(),
                ],
            ],
        ]);
    }

    /**
     * Get messages for the chat
     */
    public function getMessages(Request $request, $chatId)
    {
        $client = $request->user();

        $chat = Chat::where('client_id', $client->id)
            ->where('id', $chatId)
            ->firstOrFail();

        $messages = $chat->messages()
            ->with(['sender'])
            ->orderBy('created_at', 'desc')
            ->paginate(50);

        // Mark messages as read when client views them
        $chat->messages()
            ->where('sender_type', 'admin')
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

    /**
     * Send a message
     */
    public function sendMessage(Request $request, $chatId)
    {
        $request->validate([
            'message' => 'required|string|max:5000',
        ]);

        $client = $request->user();

        $chat = Chat::where('client_id', $client->id)
            ->where('id', $chatId)
            ->firstOrFail();

        $message = Message::create([
            'chat_id' => $chat->id,
            'sender_type' => 'client',
            'sender_id' => $client->id,
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
                    'sender_name' => $client->client_name,
                    'message' => $message->message,
                    'read' => $message->read,
                    'created_at' => $message->created_at,
                ],
            ],
        ]);
    }
}
