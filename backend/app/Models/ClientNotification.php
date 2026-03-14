<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ClientNotification extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'client_id',
        'project_id',
        'type',
        'title',
        'message',
        'read',
    ];

    protected $casts = [
        'read' => 'boolean',
        'created_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Get the client that owns the notification
     */
    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    /**
     * Get the project associated with the notification
     */
    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    /**
     * Scope to get unread notifications
     */
    public function scopeUnread($query)
    {
        return $query->where('read', false);
    }

    /**
     * Scope to get read notifications
     */
    public function scopeRead($query)
    {
        return $query->where('read', true);
    }

    /**
     * Scope to filter by type
     */
    public function scopeOfType($query, $type)
    {
        return $query->where('type', $type);
    }
}

