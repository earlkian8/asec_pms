<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Database\Eloquent\SoftDeletes;
use Illuminate\Support\Facades\Storage;
use Laravel\Sanctum\HasApiTokens;
use Spatie\Permission\Traits\HasRoles;
use App\Models\CompensationProfile;

class User extends Authenticatable
{
    use HasFactory, Notifiable, HasRoles, HasApiTokens, SoftDeletes;

    protected $fillable = [
        // Auth
        'first_name',
        'middle_name',
        'last_name',
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
        'name',
        'profile_image_url',
        'sss_id_image_url',
        'philhealth_id_image_url',
        'pagibig_id_image_url',
        'tin_id_image_url',
        'resolved_compensation',
    ];

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password'          => 'hashed',
            'date_of_birth'     => 'date',
        ];
    }

    // ── Virtual full name accessor ────────────────────────────────────────────
    // Format: "First M. Last" (middle initial only if middle_name is set)

    public function getNameAttribute(): string
    {
        $parts = array_filter([
            trim($this->first_name ?? ''),
            $this->middle_name ? strtoupper(mb_substr(trim($this->middle_name), 0, 1)) . '.' : null,
            trim($this->last_name ?? ''),
        ]);

        return implode(' ', $parts);
    }

    // ── Image URL Accessors ───────────────────────────────────────────────────

    public function getProfileImageUrlAttribute(): ?string
    {
        return $this->profile_image ? Storage::url($this->profile_image) : null;
    }

    public function getSssIdImageUrlAttribute(): ?string
    {
        return $this->sss_id_image ? Storage::url($this->sss_id_image) : null;
    }

    public function getPhilhealthIdImageUrlAttribute(): ?string
    {
        return $this->philhealth_id_image ? Storage::url($this->philhealth_id_image) : null;
    }

    public function getPagibigIdImageUrlAttribute(): ?string
    {
        return $this->pagibig_id_image ? Storage::url($this->pagibig_id_image) : null;
    }

    public function getTinIdImageUrlAttribute(): ?string
    {
        return $this->tin_id_image ? Storage::url($this->tin_id_image) : null;
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

    public function compensationProfiles()
    {
        return $this->morphMany(CompensationProfile::class, 'profileable');
    }

    public function currentCompensationProfile()
    {
        return $this->morphOne(CompensationProfile::class, 'profileable')
            ->where('is_active', true)
            ->latestOfMany('effective_date');
    }

    public function getResolvedCompensationAttribute(): array
    {
        $profile = $this->relationLoaded('currentCompensationProfile')
            ? $this->currentCompensationProfile
            : $this->currentCompensationProfile()->first();

        return [
            'pay_type' => $profile?->pay_type ?? 'salary',
            'hourly_rate' => $profile?->hourly_rate !== null ? (float) $profile->hourly_rate : null,
            'monthly_salary' => $profile?->monthly_salary !== null ? (float) $profile->monthly_salary : null,
            'effective_date' => $profile?->effective_date?->toDateString(),
            'is_profile_based' => $profile !== null,
        ];
    }
}