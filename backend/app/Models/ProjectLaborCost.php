<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\SoftDeletes;
use Carbon\Carbon;
use Carbon\CarbonPeriod;

class ProjectLaborCost extends Model
{
    use SoftDeletes;

    public const OVERTIME_MULTIPLIER = 1.25;

    public const STATUS_DRAFT     = 'draft';
    public const STATUS_SUBMITTED = 'submitted';
    public const STATUS_APPROVED  = 'approved';
    public const STATUS_PAID      = 'paid';

    protected $fillable = [
        'project_id',
        'boq_item_id',
        'user_id',
        'employee_id',
        'assignable_type',
        'period_start',
        'period_end',
        'status',
        'submitted_at',
        'submitted_by',
        'approved_at',
        'approved_by',
        'paid_at',
        'paid_by',
        'pay_type',
        'daily_rate',
        'monthly_salary',
        'attendance',
        'payroll_events',
        'deduction_items',
        'payroll_breakdown',
        'days_present',
        'base_pay',
        'overpay_amount',
        'overpay_reason',
        'double_pay_preset',
        'double_pay_amount',
        'double_pay_reason',
        'damages_deduction',
        'damages_reason',
        'other_deduction',
        'other_deduction_reason',
        'cash_advance',
        'cash_advance_reason',
        'gross_pay',
        'description',
        'notes',
        'rejection_reason',
        'rejected_at',
        'rejected_by',
        'created_by',
    ];

    protected $casts = [
        'period_start'   => 'date',
        'period_end'     => 'date',
        'submitted_at'   => 'datetime',
        'approved_at'    => 'datetime',
        'paid_at'        => 'datetime',
        'rejected_at'    => 'datetime',
        'daily_rate'     => 'decimal:2',
        'monthly_salary' => 'decimal:2',
        'days_present'   => 'decimal:2',
        'base_pay'       => 'decimal:2',
        'overpay_amount' => 'decimal:2',
        'double_pay_preset' => 'boolean',
        'double_pay_amount' => 'decimal:2',
        'damages_deduction' => 'decimal:2',
        'other_deduction'   => 'decimal:2',
        'cash_advance'      => 'decimal:2',
        'gross_pay'      => 'decimal:2',
        'attendance'     => 'array',
        'payroll_events' => 'array',
        'deduction_items' => 'array',
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

    public function submittedBy()
    {
        return $this->belongsTo(User::class, 'submitted_by');
    }

    public function approvedBy()
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    public function paidBy()
    {
        return $this->belongsTo(User::class, 'paid_by');
    }

    public function rejectedBy()
    {
        return $this->belongsTo(User::class, 'rejected_by');
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
        [$daysPresent, $basePay] = $this->computePayFromAttendance(
            $this->attendance ?? [],
            (float) $this->daily_rate,
            (string) ($this->pay_type ?? 'hourly'),
            (float) ($this->monthly_salary ?? 0)
        );

        [, $overtimePay] = self::computeOvertimeFromAttendance(
            $this->attendance ?? [],
            (float) $this->daily_rate,
            (string) ($this->pay_type ?? 'hourly')
        );

        $doublePay = self::computeDoublePayFromAttendance(
            $this->attendance ?? [],
            (float) $this->daily_rate,
            (string) ($this->pay_type ?? 'hourly')
        );

        [$damages, $other] = self::computeDeductionsFromItems((array) ($this->deduction_items ?? []));

        $adjustments = [
            'overpay_amount'    => $overtimePay,
            'double_pay_amount' => $doublePay,
            'damages_deduction' => $damages,
            'other_deduction'   => $other,
            'cash_advance'      => (float) ($this->cash_advance ?? 0),
        ];

        [$grossPay] = self::applyAdjustments($basePay, $adjustments);

        $this->days_present = $daysPresent;
        $this->base_pay     = round($basePay, 2);
        $this->overpay_amount = $adjustments['overpay_amount'] ?? 0;
        $this->overpay_reason = ($this->overpay_amount ?? 0) > 0 ? 'System-calculated from attendance overtime.' : null;
        $this->double_pay_amount = $adjustments['double_pay_amount'] ?? 0;
        $this->double_pay_reason = ($this->double_pay_amount ?? 0) > 0 ? 'Holiday double-pay preset applied.' : null;
        $this->damages_deduction = $adjustments['damages_deduction'] ?? 0;
        $this->other_deduction = $adjustments['other_deduction'] ?? 0;
        $this->cash_advance = $adjustments['cash_advance'] ?? 0;
        $this->gross_pay    = $grossPay;
        $this->saveQuietly();
    }

    /**
     * Compute overtime amount directly from attendance records.
     * Returns [overtimeHours, overtimePay].
     */
    public static function computeOvertimeFromAttendance(array $attendance, float $dailyRate, string $payType = 'hourly'): array
    {
        if ($payType === 'fixed') {
            return [0.0, 0.0];
        }

        $hourlyRate = $dailyRate > 0 ? $dailyRate / 8.0 : 0.0;
        $totalOvertimeHours = 0.0;

        foreach ($attendance as $day) {
            if (!is_array($day)) {
                continue;
            }

            $status = $day['status'] ?? 'A';
            if (in_array($status, ['A', 'NW'], true)) {
                continue;
            }

            $timeIn = $day['time_in'] ?? null;
            $timeOut = $day['time_out'] ?? null;
            if (!$timeIn || !$timeOut) {
                continue;
            }

            [$inH, $inM] = array_map('intval', explode(':', $timeIn));
            [$outH, $outM] = array_map('intval', explode(':', $timeOut));
            $breakMins = (int) ($day['break_minutes'] ?? 0);
            $workedMins = max(0, ($outH * 60 + $outM) - ($inH * 60 + $inM) - $breakMins);
            $workedHours = $workedMins / 60.0;
            $overtimeHours = max(0, $workedHours - 8.0);
            $totalOvertimeHours += $overtimeHours;
        }

        $overtimePay = round($totalOvertimeHours * $hourlyRate * self::OVERTIME_MULTIPLIER, 2);
        return [round($totalOvertimeHours, 4), $overtimePay];
    }

    /**
     * Compute damages and other deductions from simple deduction item rows.
     * Each row shape: { type: damage|other, label: string, amount: number }
     */
    public static function computeDeductionsFromItems(array $items): array
    {
        $damages = 0.0;
        $other = 0.0;

        foreach ($items as $item) {
            if (!is_array($item)) {
                continue;
            }

            $amount = max(0, (float) ($item['amount'] ?? 0));
            if ($amount <= 0) {
                continue;
            }

            $type = (string) ($item['type'] ?? 'damage');
            if ($type === 'other') {
                $other += $amount;
            } else {
                $damages += $amount;
            }
        }

        return [round($damages, 2), round($other, 2)];
    }

    /**
     * Compute holiday double-pay amount from attendance flags.
     * A holiday day adds one extra day pay (regular pay is already in base pay).
     */
    public static function computeDoublePayFromAttendance(array $attendance, float $dailyRate, string $payType = 'hourly'): float
    {
        if ($payType === 'fixed') {
            return 0.0;
        }

        $standardHours = 8.0;
        $hourlyRate = $dailyRate > 0 ? $dailyRate / $standardHours : 0.0;
        $extra = 0.0;

        foreach ($attendance as $day) {
            if (!is_array($day) || empty($day['is_holiday'])) {
                continue;
            }

            $status = $day['status'] ?? 'A';
            if (in_array($status, ['A', 'NW'], true)) {
                continue;
            }

            if ($payType === 'salary') {
                $extra += $dailyRate;
                continue;
            }

            $timeIn = $day['time_in'] ?? null;
            $timeOut = $day['time_out'] ?? null;
            $breakMins = (int) ($day['break_minutes'] ?? 0);

            if ($timeIn && $timeOut) {
                [$inH, $inM] = array_map('intval', explode(':', $timeIn));
                [$outH, $outM] = array_map('intval', explode(':', $timeOut));
                $workedMins = max(0, ($outH * 60 + $outM) - ($inH * 60 + $inM) - $breakMins);
                $regularHours = min($standardHours, $workedMins / 60.0);
                $extra += $regularHours * $hourlyRate;
            } else {
                $regularHours = $status === 'HD' ? 4.0 : $standardHours;
                $extra += $regularHours * $hourlyRate;
            }
        }

        return round($extra, 2);
    }

    /**
     * Apply additive/deduction payroll adjustments on top of computed base pay.
     * Returns [finalPay, totalAdditions, totalDeductions].
     */
    public static function applyAdjustments(float $basePay, array $adjustments = []): array
    {
        $overpay        = max(0, (float) ($adjustments['overpay_amount'] ?? 0));
        $doublePay      = max(0, (float) ($adjustments['double_pay_amount'] ?? 0));
        $damages        = max(0, (float) ($adjustments['damages_deduction'] ?? 0));
        $otherDeduction = max(0, (float) ($adjustments['other_deduction'] ?? 0));
        $cashAdvance    = max(0, (float) ($adjustments['cash_advance'] ?? 0));

        $additions      = round($overpay + $doublePay, 2);
        $deductions     = round($damages + $otherDeduction + $cashAdvance, 2);
        $finalPay       = max(0, round($basePay + $additions - $deductions, 2));

        return [$finalPay, $additions, $deductions];
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
            if ((int) $model->project_id <= 0) {
                throw new \InvalidArgumentException('Payroll entry must be attached to a project.');
            }

            if (!empty($model->boq_item_id)) {
                $boqItem = ProjectBoqItem::query()->find($model->boq_item_id);
                if (!$boqItem || (int) $boqItem->project_id !== (int) $model->project_id) {
                    throw new \InvalidArgumentException('Linked BOQ item must belong to the same project as payroll entry.');
                }
            }

            $payType = $model->pay_type ?? 'hourly';

            [, $overtimePay] = self::computeOvertimeFromAttendance(
                $model->attendance ?? [],
                (float) $model->daily_rate,
                $payType
            );

            $doublePay = self::computeDoublePayFromAttendance(
                $model->attendance ?? [],
                (float) $model->daily_rate,
                $payType
            );

            [$damages, $other] = self::computeDeductionsFromItems((array) ($model->deduction_items ?? []));

            $adjustments = [
                'overpay_amount'    => $overtimePay,
                'double_pay_amount' => $doublePay,
                'damages_deduction' => $damages,
                'other_deduction'   => $other,
                'cash_advance'      => (float) ($model->cash_advance ?? 0),
            ];

            // fixed pay uses provided base amount, then applies payroll adjustments
            if ($payType === 'fixed') {
                $model->days_present = collect($model->attendance ?? [])
                    ->filter(fn ($d) => !in_array(is_string($d) ? $d : ($d['status'] ?? 'A'), ['A', 'NW']))
                    ->count();

                $basePay = (float) ($model->base_pay ?? $model->gross_pay ?? 0);
                [$finalPay] = self::applyAdjustments($basePay, $adjustments);

                $model->overpay_amount = $adjustments['overpay_amount'] ?? 0;
                $model->overpay_reason = ($model->overpay_amount ?? 0) > 0 ? 'System-calculated from attendance overtime.' : null;
                $model->double_pay_amount = $adjustments['double_pay_amount'] ?? 0;
                $model->double_pay_reason = ($model->double_pay_amount ?? 0) > 0 ? 'Holiday double-pay preset applied.' : null;
                $model->damages_deduction = $adjustments['damages_deduction'] ?? 0;
                $model->other_deduction = $adjustments['other_deduction'] ?? 0;
                $model->cash_advance = $adjustments['cash_advance'] ?? 0;
                $model->base_pay  = round($basePay, 2);
                $model->gross_pay = $finalPay;
                return;
            }

            [$days, $basePay] = self::computePayFromAttendance(
                $model->attendance ?? [],
                (float) $model->daily_rate,
                $payType,
                (float) ($model->monthly_salary ?? 0)
            );

            [$finalPay] = self::applyAdjustments($basePay, $adjustments);

            $model->overpay_amount = $adjustments['overpay_amount'] ?? 0;
            $model->overpay_reason = ($model->overpay_amount ?? 0) > 0 ? 'System-calculated from attendance overtime.' : null;
            $model->double_pay_amount = $adjustments['double_pay_amount'] ?? 0;
            $model->double_pay_reason = ($model->double_pay_amount ?? 0) > 0 ? 'Holiday double-pay preset applied.' : null;
            $model->damages_deduction = $adjustments['damages_deduction'] ?? 0;
            $model->other_deduction = $adjustments['other_deduction'] ?? 0;
            $model->cash_advance = $adjustments['cash_advance'] ?? 0;
            $model->days_present = $days;
            $model->base_pay     = round($basePay, 2);
            $model->gross_pay    = $finalPay;
        });
    }
}