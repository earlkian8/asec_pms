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
        'payroll_breakdown',
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
        'payroll_breakdown' => 'array',
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
     * Compute the immutable per-day payroll breakdown snapshot.
     * Called at submit time. Returns array keyed by date.
     */
    public static function computeBreakdown(array $attendance, float $dailyRate): array
    {
        $standardHours = 8.0;
        $hourlyRate    = $dailyRate / $standardHours;
        $breakdown     = [];

        foreach ($attendance as $date => $day) {
            if (is_string($day)) {
                // Legacy string format
                $status      = $day;
                $workedHours = $status === 'P' ? $standardHours : ($status === 'HD' ? 4.0 : 0.0);
                $breakdown[$date] = [
                    'status'           => $status,
                    'time_in'          => null,
                    'time_out'         => null,
                    'break_minutes'    => 0,
                    'standard_hours'   => $standardHours,
                    'worked_hours'     => round($workedHours, 4),
                    'deduction_hours'  => round(max(0, $standardHours - $workedHours), 4),
                    'deduction_amount' => round(max(0, $standardHours - $workedHours) * $hourlyRate, 2),
                    'day_pay'          => round($workedHours * $hourlyRate, 2),
                ];
                continue;
            }

            $status     = $day['status'] ?? 'A';
            $timeIn     = $day['time_in']       ?? null;
            $timeOut    = $day['time_out']      ?? null;
            $breakMins  = (int) ($day['break_minutes'] ?? 0);

            if (in_array($status, ['A', 'NW'])) {
                $workedHours = 0.0;
            } elseif ($timeIn && $timeOut) {
                [$inH,  $inM]  = array_map('intval', explode(':', $timeIn));
                [$outH, $outM] = array_map('intval', explode(':', $timeOut));
                $workedMins  = ($outH * 60 + $outM) - ($inH * 60 + $inM) - $breakMins;
                $workedHours = min(max($workedMins, 0) / 60.0, $standardHours);
            } else {
                $workedHours = $status === 'HD' ? 4.0 : $standardHours;
            }

            $deductionHours  = max(0, $standardHours - $workedHours);
            $deductionAmount = round($deductionHours * $hourlyRate, 2);
            $dayPay          = round($workedHours * $hourlyRate, 2);

            $breakdown[$date] = [
                'status'           => $status,
                'time_in'          => $timeIn,
                'time_out'         => $timeOut,
                'break_minutes'    => $breakMins,
                'standard_hours'   => $standardHours,
                'worked_hours'     => round($workedHours, 4),
                'deduction_hours'  => round($deductionHours, 4),
                'deduction_amount' => $deductionAmount,
                'day_pay'          => $dayPay,
            ];
        }

        ksort($breakdown);
        return $breakdown;
    }

    /**
     * Recompute days_present and gross_pay from the attendance JSON
     * and save them to the database.
     *
     * Attendance format per day:
     *   { status: 'P'|'A'|'HD', time_in: 'HH:MM', time_out: 'HH:MM', break_minutes: int }
     *
     * Pay engine:
     *   - standard_hours = 8
     *   - hourly_rate    = daily_rate / standard_hours
     *   - actual_hours   = (time_out - time_in) in minutes / 60 - break_minutes / 60
     *   - day_pay        = min(actual_hours, standard_hours) * hourly_rate
     *   - Absent (A)     = 0
     */
    public function recomputePay(): void
    {
        [$daysPresent, $grossPay] = $this->computePayFromAttendance(
            $this->attendance ?? [],
            (float) $this->daily_rate
        );

        $this->days_present = $daysPresent;
        $this->gross_pay    = round($grossPay, 2);
        $this->saveQuietly();
    }

    /**
     * Core pay computation — shared by recomputePay() and boot().
     * Returns [days_present, gross_pay].
     */
    public static function computePayFromAttendance(array $attendance, float $dailyRate): array
    {
        $standardHours = 8.0;
        $hourlyRate    = $dailyRate / $standardHours;
        $totalHours    = 0.0;

        foreach ($attendance as $day) {
            // Support both old format (string) and new format (array)
            if (is_string($day)) {
                if ($day === 'P')  $totalHours += $standardHours;
                if ($day === 'HD') $totalHours += $standardHours / 2;
                continue;
            }

            $status = $day['status'] ?? 'A';
            if ($status === 'A' || $status === 'NW') continue;

            $timeIn      = $day['time_in']       ?? null;
            $timeOut     = $day['time_out']      ?? null;
            $breakMins   = (int) ($day['break_minutes'] ?? 0);

            if ($timeIn && $timeOut) {
                [$inH,  $inM]  = array_map('intval', explode(':', $timeIn));
                [$outH, $outM] = array_map('intval', explode(':', $timeOut));

                $workedMins = ($outH * 60 + $outM) - ($inH * 60 + $inM) - $breakMins;
                $workedMins = max(0, $workedMins);
                $workedHours = $workedMins / 60.0;

                // Cap at standard hours — no overtime bonus
                $totalHours += min($workedHours, $standardHours);
            } else {
                // No times provided — fall back to status
                if ($status === 'P')  $totalHours += $standardHours;
                if ($status === 'HD') $totalHours += $standardHours / 2;
            }
        }

        $daysPresent = round($totalHours / $standardHours, 4);
        $grossPay    = round($totalHours * $hourlyRate, 2);

        return [$daysPresent, $grossPay];
    }

    // ── Boot ──────────────────────────────────────────────────────────────────

    protected static function boot()
    {
        parent::boot();

        static::saving(function ($model) {
            // Always keep days_present and gross_pay in sync
            [$days, $pay] = self::computePayFromAttendance(
                $model->attendance ?? [],
                (float) $model->daily_rate
            );
            $model->days_present = $days;
            $model->gross_pay    = $pay;
        });
    }
}