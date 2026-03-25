<?php

namespace App\Models;

use App\Enums\AssignmentStatus;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;

class ProjectTeam extends Model
{
    use HasFactory, SoftDeletes;

    protected $fillable = [
        'project_id',
        'user_id',
        'employee_id',
        'assignable_type',
        'role',
        'hourly_rate',
        'start_date',
        'end_date',
        'is_active',
        'assignment_status',
        'released_at',
        'reactivated_at',
    ];

    protected $casts = [
        'hourly_rate'       => 'decimal:2',
        'start_date'        => 'date',
        'end_date'          => 'date',
        'is_active'         => 'boolean',
        'assignment_status' => AssignmentStatus::class,
        'released_at'       => 'datetime',
        'reactivated_at'    => 'datetime',
    ];

    protected $appends = [
        'assignable_name',
    ];

    // ─── Relationships ────────────────────────────────────────────────────────

    public function project()
    {
        return $this->belongsTo(Project::class, 'project_id');
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function assignable()
    {
        if ($this->assignable_type === 'employee' && $this->employee_id) {
            return $this->employee();
        }
        return $this->user();
    }

    // ─── Computed Attributes ──────────────────────────────────────────────────

    public function getAssignableNameAttribute(): string
    {
        if ($this->assignable_type === 'employee' && $this->employee) {
            return $this->employee->full_name;
        }
        if ($this->assignable_type === 'user' && $this->user) {
            return $this->user->name;
        }

        // Fallback for legacy records without assignable_type
        if ($this->employee_id && $this->employee) {
            return $this->employee->full_name;
        }
        if ($this->user_id && $this->user) {
            return $this->user->name;
        }

        return 'N/A';
    }

    // ─── Query Scopes ─────────────────────────────────────────────────────────

    /**
     * Scope: records where the person is actively occupying a project slot.
     * This is the single source of truth for "is this person busy?"
     */
    public function scopeOccupied($query)
    {
        return $query->where('assignment_status', AssignmentStatus::Active->value);
    }

    /**
     * Scope: records where the person is available (completed or released).
     */
    public function scopeAvailable($query)
    {
        return $query->where('assignment_status', '!=', AssignmentStatus::Active->value);
    }

    /**
     * Scope: only active team members (legacy is_active flag — kept for backward compat).
     */
    public function scopeActive($query)
    {
        return $query->where('is_active', true);
    }

    /**
     * Scope: filter by role.
     */
    public function scopeByRole($query, string $role)
    {
        return $query->where('role', $role);
    }

    /**
     * Scope: current members (no end date or end date not yet past).
     */
    public function scopeCurrent($query)
    {
        return $query->where(function ($q) {
            $q->whereNull('end_date')
              ->orWhere('end_date', '>=', now()->toDateString());
        });
    }

    // ─── Helpers ──────────────────────────────────────────────────────────────

    /**
     * Returns true if this assignment is blocking the person from being
     * assigned to another project.
     */
    public function isOccupied(): bool
    {
        return $this->assignment_status === AssignmentStatus::Active;
    }

    /**
     * Returns true if this person can be re-assigned (status is completed or released).
     */
    public function isAvailableForReassignment(): bool
    {
        return $this->assignment_status->isAvailable();
    }

    /**
     * @deprecated Use isOccupied() / assignment_status for availability checks.
     *             Kept for any other code that still references isCurrentlyActive().
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

    /**
     * Simple rule: any employee with an active assignment is fully occupied.
     * One employee = one project at a time.
     */
    public static function fullyOccupiedEmployeeIds(): array
    {
        return static::where('assignment_status', AssignmentStatus::Active->value)
            ->whereNotNull('employee_id')
            ->pluck('employee_id')
            ->unique()
            ->filter()
            ->values()
            ->toArray();
    }
}
