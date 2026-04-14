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
        'boq_item_id',
        'user_id',
        'employee_id',
        'assignable_type',
        'period_start',
        'period_end',
        'status',
        'pay_type',
        'daily_rate',
        'monthly_salary',
        'attendance',
        'payroll_breakdown',
        'days_present',
        'gross_pay',
        'description',
        'notes',
        'created_by',
    ];

    protected $casts = [
        'period_start'   => 'date',
        'period_end'     => 'date',
        'daily_rate'     => 'decimal:2',
        'monthly_salary' => 'decimal:2',
        'days_present'   => 'decimal:2',
        'gross_pay'      => 'decimal:2',
        'attendance'     => 'array',
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

    public function boqItem()
    {
        return $this->belongsTo(ProjectBoqItem::class, 'boq_item_id');
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
     *
     * pay_type:
     *   'hourly'  — daily_rate / 8 * worked_hours  (existing behaviour)
     *   'salary'  — monthly_salary / working_days_in_month * attendance_factor
     *               attendance just marks presence; day_pay = daily_rate (monthly/working_days)
     *   'fixed'   — gross_pay is a flat amount; no per-day breakdown needed
     */
    public static function computeBreakdown(
        array $attendance,
        float $dailyRate,
        string $payType = 'hourly',
        float $monthlySalary = 0
    ): array {
        $standardHours = 8.0;
        $breakdown     = [];

        foreach ($attendance as $date => $day) {
            if (is_string($day)) {
                $status      = $day;
                $workedHours = $status === 'P' ? $standardHours : ($status === 'HD' ? 4.0 : 0.0);
            } else {
                $status    = $day['status'] ?? 'A';
                $timeIn    = $day['time_in']       ?? null;
                $timeOut   = $day['time_out']      ?? null;
                $breakMins = (int) ($day['break_minutes'] ?? 0);

                if (in_array($status, ['A', 'NW'])) {
                    $workedHours = 0.0;
                } elseif (!empty($timeIn) && !empty($timeOut)) {
                    [$inH,  $inM]  = array_map('intval', explode(':', $timeIn));
                    [$outH, $outM] = array_map('intval', explode(':', $timeOut));
                    $workedMins  = ($outH * 60 + $outM) - ($inH * 60 + $inM) - $breakMins;
                    $workedHours = min(max($workedMins, 0) / 60.0, $standardHours);
                } else {
                    $workedHours = $status === 'HD' ? 4.0 : $standardHours;
                }
            }

            $timeIn    = is_array($day) ? ($day['time_in']  ?? null) : null;
            $timeOut   = is_array($day) ? ($day['time_out'] ?? null) : null;
            $breakMins = is_array($day) ? (int) ($day['break_minutes'] ?? 0) : 0;

            if ($payType === 'salary') {
                // For salary: day_pay = daily_rate (pre-computed as monthly/working_days)
                // Absent days still get 0 pay; no partial deduction for late
                $isPresent       = !in_array($status, ['A', 'NW']);
                $dayPay          = $isPresent ? round($dailyRate, 2) : 0.0;
                $deductionHours  = $isPresent ? 0.0 : $standardHours;
                $deductionAmount = $isPresent ? 0.0 : round($dailyRate, 2);

                $breakdown[$date] = [
                    'status'           => $status,
                    'time_in'          => $timeIn,
                    'time_out'         => $timeOut,
                    'break_minutes'    => $breakMins,
                    'standard_hours'   => $standardHours,
                    'worked_hours'     => $isPresent ? $standardHours : 0.0,
                    'deduction_hours'  => $deductionHours,
                    'deduction_amount' => $deductionAmount,
                    'day_pay'          => $dayPay,
                ];
            } else {
                // hourly (default)
                $hourlyRate      = $dailyRate / $standardHours;
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
     *
     * pay_type:
     *   'hourly'  — pay per worked hour (daily_rate / 8 * hours)
     *   'salary'  — pay per day present (daily_rate per present day, no partial deduction)
     *   'fixed'   — gross_pay is stored directly; attendance only tracks presence
     */
    public static function computePayFromAttendance(
        array $attendance,
        float $dailyRate,
        string $payType = 'hourly',
        float $monthlySalary = 0
    ): array {
        $standardHours = 8.0;
        $totalHours    = 0.0;
        $daysPresent   = 0.0;

        foreach ($attendance as $day) {
            $status = is_string($day) ? $day : ($day['status'] ?? 'A');
            if ($status === 'A' || $status === 'NW') continue;

            if ($payType === 'salary') {
                // Salary: count present days only, no partial deduction
                $daysPresent += ($status === 'HD') ? 0.5 : 1.0;
                continue;
            }

            // hourly
            if (is_string($day)) {
                if ($status === 'P')  $totalHours += $standardHours;
                if ($status === 'HD') $totalHours += $standardHours / 2;
                continue;
            }

            $timeIn    = $day['time_in']       ?? null;
            $timeOut   = $day['time_out']      ?? null;
            $breakMins = (int) ($day['break_minutes'] ?? 0);

            if ($timeIn && $timeOut) {
                [$inH,  $inM]  = array_map('intval', explode(':', $timeIn));
                [$outH, $outM] = array_map('intval', explode(':', $timeOut));
                $workedMins  = max(0, ($outH * 60 + $outM) - ($inH * 60 + $inM) - $breakMins);
                $totalHours += min($workedMins / 60.0, $standardHours);
            } else {
                if ($status === 'P')  $totalHours += $standardHours;
                if ($status === 'HD') $totalHours += $standardHours / 2;
            }
        }

        if ($payType === 'salary') {
            $grossPay = round($daysPresent * $dailyRate, 2);
            return [$daysPresent, $grossPay];
        }

        // hourly
        $hourlyRate  = $dailyRate > 0 ? $dailyRate / $standardHours : 0;
        $daysPresent = round($totalHours / $standardHours, 4);
        $grossPay    = round($totalHours * $hourlyRate, 2);

        return [$daysPresent, $grossPay];
    }

    // ── Boot ──────────────────────────────────────────────────────────────────

    protected static function boot()
    {
        parent::boot();

        static::saving(function ($model) {
            $payType = $model->pay_type ?? 'hourly';

            // 'fixed' pay type: gross_pay is set directly, skip recompute
            if ($payType === 'fixed') {
                $model->days_present = collect($model->attendance ?? [])
                    ->filter(fn ($d) => !in_array(is_string($d) ? $d : ($d['status'] ?? 'A'), ['A', 'NW']))
                    ->count();
                return;
            }

            [$days, $pay] = self::computePayFromAttendance(
                $model->attendance ?? [],
                (float) $model->daily_rate,
                $payType,
                (float) ($model->monthly_salary ?? 0)
            );
            $model->days_present = $days;
            $model->gross_pay    = $pay;
        });
    }
}