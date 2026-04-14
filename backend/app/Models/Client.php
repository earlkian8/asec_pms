<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Sanctum\HasApiTokens;

class Client extends Authenticatable
{
    use HasFactory, HasApiTokens, Notifiable, SoftDeletes;

    protected $fillable = [
        'client_code',
        'client_name',
        'client_type_id',
        'contact_person',
        'email',
        'password',
        'password_changed_at',
        'phone_number',
        'address',
        'region',
        'city',
        'province',
        'city_municipality',
        'barangay',
        'postal_code',
        'zip_code',
        'country',
        'is_active',
        'notes',
        'push_token',
    ];

    protected $hidden = [
        'password',
    ];

    protected $casts = [
        'password' => 'hashed',
        'password_changed_at' => 'datetime',
        'is_active' => 'boolean',
    ];

    public function clientType()
    {
        return $this->belongsTo(ClientType::class, 'client_type_id');
    }

    public function projects()
    {
        return $this->hasMany(Project::class, 'client_id');
    }

    public function notifications()
    {
        return $this->hasMany(ClientNotification::class);
    }

    /**
     * Get the chat for this client
     */
    public function chat()
    {
        return $this->hasOne(Chat::class);
    }
}
