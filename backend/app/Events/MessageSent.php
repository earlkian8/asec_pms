<?php

namespace App\Events;

use App\Models\Message;
use Illuminate\Broadcasting\Channel;
use Illuminate\Broadcasting\InteractsWithSockets;
use Illuminate\Broadcasting\PrivateChannel;
use Illuminate\Contracts\Broadcasting\ShouldBroadcastNow;
use Illuminate\Foundation\Events\Dispatchable;
use Illuminate\Queue\SerializesModels;

class MessageSent implements ShouldBroadcastNow
{
    use Dispatchable, InteractsWithSockets, SerializesModels;

    public $message;

    /**
     * Create a new event instance.
     */
    public function __construct(Message $message)
    {
        $this->message = $message->load(['sender', 'chat.client', 'chat.user']);
    }

    /**
     * Get the channels the event should broadcast on.
     */
    public function broadcastOn(): array
    {
        // Broadcast to a private channel for the specific chat
        return [
            new PrivateChannel('chat.'.$this->message->chat_id),
        ];
    }

    /**
     * The event's broadcast name.
     */
    public function broadcastAs(): string
    {
        return 'message.sent';
    }

    /**
     * Get the data to broadcast.
     */
    public function broadcastWith(): array
    {
        return [
            'id' => $this->message->id,
            'chat_id' => $this->message->chat_id,
            'sender_type' => $this->message->sender_type,
            'sender_id' => $this->message->sender_id,
            'sender_name' => $this->message->sender_type === 'client'
                ? $this->message->chat->client->client_name
                : ($this->message->chat->user ? $this->message->chat->user->name : 'Admin'),
            'message' => $this->message->message,
            'read' => $this->message->read,
            'created_at' => $this->message->created_at->toISOString(),
        ];
    }
}
