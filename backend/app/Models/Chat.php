<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Chat extends Model
{
    use HasFactory;

    protected $fillable = [
        'client_id',
        'user_id',
        'last_message_at',
    ];

    protected $casts = [
        'last_message_at' => 'datetime',
    ];

    /**
     * Get the client that owns the chat
     */
    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * Get the admin user assigned to the chat
     */
    public function user()
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Get all messages for the chat
     */
    public function messages()
    {
        return $this->hasMany(Message::class)->orderBy('created_at', 'asc');
    }

    /**
     * Get unread messages count
     */
    public function unreadMessagesCount()
    {
        return $this->messages()->where('read', false)->count();
    }

    /**
     * Get the latest message
     */
    public function latestMessage()
    {
        return $this->hasOne(Message::class)->latestOfMany();
    }
}
