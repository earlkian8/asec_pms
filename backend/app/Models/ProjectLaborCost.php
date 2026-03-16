<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;
use Carbon\CarbonPeriod;

class ProjectLaborCost extends Model
{
    use SoftDeletes;

    protected $fillable = [
        'project_id',
        'user_id',
        'employee_id',
        'assignable_type',
        'period_start',
        'period_end',
        'status',
        'daily_rate',
        'attendance',
        'days_present',
        'gross_pay',
        'description',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'period_start' => 'date',
        'period_end'   => 'date',
        'daily_rate'   => 'decimal:2',
        'days_present' => 'decimal:2',
        'gross_pay'    => 'decimal:2',
        'attendance'   => 'array',
    ];

    protected $appends = [
        'assignable_name',
        'assignable_type_label',
    ];

    // ── Relations ─────────────────────────────────────────────────────────────

    public function project()
    {
        return $this->belongsTo(Project::class);
    }

    public function user()
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function employee()
    {
        return $this->belongsTo(Employee::class, 'employee_id');
    }

    public function createdBy()
    {
        return $this->belongsTo(User::class, 'created_by');
    }

    // ── Accessors ─────────────────────────────────────────────────────────────

    public function getAssignableNameAttribute(): string
    {
        if ($this->assignable_type === 'employee' && $this->employee) {
            return $this->employee->full_name
                ?? trim($this->employee->first_name . ' ' . $this->employee->last_name);
        }

        if ($this->user) {
            return $this->user->name ?? 'N/A';
        }

        return 'N/A';
    }

    public function getAssignableTypeLabelAttribute(): string
    {
        return $this->assignable_type === 'employee' ? 'Employee' : 'User';
    }

    // ── Helpers ───────────────────────────────────────────────────────────────

    /**
     * Get all working dates within the period (Mon–Sat by default).
     * Sundays are excluded; adjust if your project runs 7 days.
     */
    public function getWorkingDates(): array
    {
        $period = CarbonPeriod::create($this->period_start, $this->period_end);
        $dates  = [];

        foreach ($period as $date) {
            if ($date->dayOfWeek !== Carbon::SUNDAY) {
                $dates[] = $date->format('Y-m-d');
            }
        }

        return $dates;
    }

    /**
     * Recompute days_present and gross_pay from the attendance JSON
     * and save them to the database.
     */
    public function recomputePay(): void
    {
        $attendance   = $this->attendance ?? [];
        $daysPresent  = 0;

        foreach ($attendance as $status) {
            if ($status === 'P')  $daysPresent += 1;
            if ($status === 'HD') $daysPresent += 0.5;
            // 'A' = 0
        }

        $this->days_present = $daysPresent;
        $this->gross_pay    = round($daysPresent * (float) $this->daily_rate, 2);
        $this->saveQuietly();
    }

    // ── Boot ──────────────────────────────────────────────────────────────────

    protected static function boot()
    {
        parent::boot();

        static::saving(function ($model) {
            // Always keep days_present and gross_pay in sync
            $attendance  = $model->attendance ?? [];
            $days        = 0;

            foreach ($attendance as $status) {
                if ($status === 'P')  $days += 1;
                if ($status === 'HD') $days += 0.5;
            }

            $model->days_present = $days;
            $model->gross_pay    = round($days * (float) $model->daily_rate, 2);
        });
    }
}