<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Auth;

class ClientUpdateRequest extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'client_id',
        'project_id',
        'task_id',
        'subject',
        'message',
    ];

    public function client()
    {
        return $this->belongsTo(Client::class);
    }

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function task()
    {
        return $this->belongsTo(ProjectTask::class, 'task_id');
    }

    public function views()
    {
        return $this->hasMany(ClientUpdateRequestView::class);
    }

    /**
     * Mark this request as viewed by the currently authenticated user.
     */
    public function markViewedBy(int $userId): void
    {
        $this->views()->firstOrCreate(
            ['user_id' => $userId],
            ['viewed_at' => now()]
        );
    }

    /**
     * Check if a given user has viewed this request.
     */
    public function isViewedBy(int $userId): bool
    {
        return $this->views()->where('user_id', $userId)->exists();
    }
}