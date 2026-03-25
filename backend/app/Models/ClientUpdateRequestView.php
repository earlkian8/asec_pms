<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ClientUpdateRequestView extends Model
{
    protected $fillable = [
        'client_update_request_id',
        'user_id',
        'viewed_at',
    ];

    protected $casts = [
        'viewed_at' => 'datetime',
    ];

    public function request()
    {
        return $this->belongsTo(ClientUpdateRequest::class, 'client_update_request_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class);
    }
}