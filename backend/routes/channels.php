<?php

use Illuminate\Support\Facades\Broadcast;
use App\Models\Chat;
use App\Models\Client;

// Authorize private chat channels
Broadcast::channel('chat.{chatId}', function ($user, $chatId) {
    // For admin users - allow access to any chat
    if ($user instanceof \App\Models\User) {
        $chat = Chat::find($chatId);
        return $chat ? ['id' => $user->id, 'name' => $user->name, 'type' => 'admin'] : false;
    }
    
    // For client users - only allow access to their own chat
    if ($user instanceof \App\Models\Client) {
        $chat = Chat::where('id', $chatId)
            ->where('client_id', $user->id)
            ->first();
        return $chat ? ['id' => $user->id, 'name' => $user->client_name, 'type' => 'client'] : false;
    }
    
    return false;
});

