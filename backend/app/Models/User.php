<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasRoles, HasApiTokens, SoftDeletes;

    protected $fillable = [
        // Auth
        'name',
        'email',
        'password',

        // Identity
        'employee_id',
        'profile_image',

        // Personal
        'phone',
        'secondary_phone',
        'gender',
        'date_of_birth',
        'civil_status',
        'nationality',

        // Address
        'region',
        'province',
        'city_municipality',
        'barangay',
        'address',
        'zip_code',

        // Emergency Contact
        'emergency_contact_name',
        'emergency_contact_relationship',
        'emergency_contact_phone',

        // Government IDs
        'sss_number',
        'sss_id_image',
        'philhealth_number',
        'philhealth_id_image',
        'pagibig_number',
        'pagibig_id_image',
        'tin_number',
        'tin_id_image',

        // Notes
        'notes',
    ];

    protected $hidden = [
        'password',
        'remember_token',
    ];

    protected $appends = [
        'profile_image_url',
        'sss_id_image_url',
        'philhealth_id_image_url',
        'pagibig_id_image_url',
        'tin_id_image_url',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
            'date_of_birth'     => 'date',
        ];
    }

    // ── Image URL Accessors ───────────────────────────────────────────────────

    public function getProfileImageUrlAttribute(): ?string
    {
        return $this->profile_image ? asset('storage/' . $this->profile_image) : null;
    }

    public function getSssIdImageUrlAttribute(): ?string
    {
        return $this->sss_id_image ? asset('storage/' . $this->sss_id_image) : null;
    }

    public function getPhilhealthIdImageUrlAttribute(): ?string
    {
        return $this->philhealth_id_image ? asset('storage/' . $this->philhealth_id_image) : null;
    }

    public function getPagibigIdImageUrlAttribute(): ?string
    {
        return $this->pagibig_id_image ? asset('storage/' . $this->pagibig_id_image) : null;
    }

    public function getTinIdImageUrlAttribute(): ?string
    {
        return $this->tin_id_image ? asset('storage/' . $this->tin_id_image) : null;
    }

    // ── Relationships ─────────────────────────────────────────────────────────

    public function notifications()
    {
        return $this->hasMany(Notification::class);
    }

    public function unreadNotifications()
    {
        return $this->hasMany(Notification::class)->where('read', false);
    }

    public function chats()
    {
        return $this->hasMany(Chat::class);
    }
}