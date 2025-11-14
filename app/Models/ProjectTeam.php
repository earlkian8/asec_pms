<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class ProjectTeam extends Model
{
    use HasFactory;

    protected $fillable = [
        'project_id',
        'employee_id',
        'role',
        'hourly_rate',
        'start_date',
        'end_date',
        'is_active',
        'created_by',
    ];

    protected $casts = [
        'hourly_rate' => 'decimal:2',
        'start_date'  => 'date',
        'end_date'    => 'date',
        'is_active'   => 'boolean',
    ];

    /**
     * Get the project that owns the team member.
     */
    public function project()
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    /**
     * Get the employee assigned to the project team.
     */
    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    /**
     * Scope to get only active team members.
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope to get team members by role.
     */
    public function scopeByRole($query, string $role)
    {
        return $query->where('role', $role);
    }

    /**
     * Scope to get current team members (no end date or end date in future).
     */
    public function scopeCurrent($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('end_date')
              ->orWhere('end_date', '>=', now()->toDateString());
        });
    }

    /**
     * Check if the team member is currently active.
     */
    public function isCurrentlyActive(): bool
    {
        if (!$this->is_active) {
            return false;
        }

        $today = now()->toDateString();
        
        if ($this->start_date && $this->start_date > $today) {
            return false;
        }

        if ($this->end_date && $this->end_date < $today) {
            return false;
        }

        return true;
    }
}
