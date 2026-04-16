<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectLaborCost;
use App\Models\ProjectTeam;
use App\Services\PayrollFundingService;
use App\Traits\ActivityLogsTrait;
use App\Traits\NotificationTrait;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class ProjectLaborCostsController extends Controller
{
    use ActivityLogsTrait, NotificationTrait;

    public function __construct(private PayrollFundingService $payrollFundingService)
    {
    }

    // ── Shared helpers ────────────────────────────────────────────────────────

    private function getTeamMember(Project $project, string $assignableType, ?int $userId, ?int $employeeId): ?ProjectTeam
    {
        return ProjectTeam::where('project_id', $project->id)
            ->where('assignable_type', $assignableType)
            ->when($assignableType === 'user',     fn ($q) => $q->where('user_id',     $userId))
            ->when($assignableType === 'employee', fn ($q) => $q->where('employee_id', $employeeId))
            ->first();
    }

    private function validateAssignmentBoundary(array $data, ?ProjectTeam $teamMember): ?array
    {
        if (!$teamMember) {
            return ['assignable_id' => 'This worker is not assigned to this project.'];
        }

        if ($teamMember->start_date && $data['period_start'] < $teamMember->start_date->format('Y-m-d')) {
            return ['period_start' => 'Period start cannot be before the worker\'s assignment start date ('
                . $teamMember->start_date->format('M d, Y') . ').'];
        }

        if ($teamMember->end_date && $data['period_end'] > $teamMember->end_date->format('Y-m-d')) {
            return ['period_end' => 'Period end cannot be after the worker\'s assignment end date ('
                . $teamMember->end_date->format('M d, Y') . '). Extend the team member\'s end date first if needed.'];
        }

        return null;
    }

    private function ensureProjectScoped(Project $project, ProjectLaborCost $laborCost): ?array
    {
        if ((int) $laborCost->project_id !== (int) $project->id) {
            return ['payroll' => 'This payroll entry does not belong to the selected project.'];
        }

        if ($laborCost->boq_item_id && $laborCost->boqItem && (int) $laborCost->boqItem->project_id !== (int) $project->id) {
            return ['boq_item_id' => 'Linked BOQ item must belong to the same project.'];
        }

        return null;
    }

    private function validateFunding(Project $project, ProjectLaborCost $laborCost): ?array
    {
        $requested = (float) $laborCost->gross_pay;
        $message = $this->payrollFundingService->validateFunding($project, $requested, (int) $laborCost->id);

        if ($message) {
            return ['gross_pay' => $message];
        }

        return null;
    }

    /**
     * Resolve the effective daily_rate from the validated request data.
     * - hourly:  hourly_rate * 8
     * - salary:  monthly_salary / 26
     * - fixed:   0 (gross_pay is stored directly)
     */
    private function resolveDailyRateFromRequest(string $payType, array $data): float
    {
        if ($payType === 'salary') {
            return $data['monthly_salary'] ? round((float) $data['monthly_salary'] / 26, 4) : 0;
        }
        if ($payType === 'fixed') {
            return 0;
        }
        // hourly
        return $data['daily_rate'] ? (float) $data['daily_rate'] : 0;
    }

    // ── Store ─────────────────────────────────────────────────────────────────

    public function store(Project $project, Request $request)
    {
        $data = $request->validate([
            'assignable_id'              => ['required', 'integer'],
            'assignable_type'            => ['required', 'in:user,employee'],
            'period_start'               => ['required', 'date'],
            'period_end'                 => ['required', 'date', 'after_or_equal:period_start'],
            'pay_type'                   => ['required', 'in:hourly,salary,fixed'],
            'daily_rate'                 => ['nullable', 'numeric', 'min:0'],
            'monthly_salary'             => ['nullable', 'numeric', 'min:0'],
            'gross_pay'                  => ['nullable', 'numeric', 'min:0'],
            'overpay_amount'             => ['prohibited'],
            'overpay_reason'             => ['prohibited'],
            'double_pay_amount'          => ['prohibited'],
            'double_pay_reason'          => ['prohibited'],
            'damages_deduction'          => ['prohibited'],
            'damages_reason'             => ['prohibited'],
            'other_deduction'            => ['prohibited'],
            'other_deduction_reason'     => ['prohibited'],
            'cash_advance'               => ['nullable', 'numeric', 'min:0'],
            'cash_advance_reason'        => ['nullable', 'string', 'max:500'],
            'double_pay_preset'          => ['nullable', 'boolean'],
            'payroll_events'             => ['prohibited'],
            'deduction_items'            => ['nullable', 'array'],
            'deduction_items.*.type'     => ['required_with:deduction_items', 'in:damage,other'],
            'deduction_items.*.label'    => ['required_with:deduction_items', 'string', 'max:255'],
            'deduction_items.*.amount'   => ['required_with:deduction_items', 'numeric', 'min:0.01'],
            'attendance'                 => ['required', 'array'],
            'attendance.*'               => ['required', 'array'],
            'attendance.*.status'        => ['required', 'in:P,A,HD,NW'],
            'attendance.*.time_in'       => ['nullable', 'date_format:H:i'],
            'attendance.*.time_out'      => ['nullable', 'date_format:H:i'],
            'attendance.*.break_minutes' => ['nullable', 'integer', 'min:0', 'max:480'],
            'attendance.*.is_holiday'    => ['nullable', 'boolean'],
            'description'                => ['nullable', 'string', 'max:500'],
            'notes'                      => ['nullable', 'string'],
        ]);

        if ($data['assignable_type'] === 'user') {
            $request->validate(['assignable_id' => ['exists:users,id']]);
            $userId     = $data['assignable_id'];
            $employeeId = null;
        } else {
            $request->validate(['assignable_id' => ['exists:employees,id']]);
            $userId     = null;
            $employeeId = $data['assignable_id'];
        }

        $teamMember    = $this->getTeamMember($project, $data['assignable_type'], $userId, $employeeId);
        $boundaryError = $this->validateAssignmentBoundary($data, $teamMember);
        if ($boundaryError) {
            return back()->withErrors($boundaryError)->withInput();
        }

        $overlap = ProjectLaborCost::where('project_id', $project->id)
            ->where('assignable_type', $data['assignable_type'])
            ->where(function ($q) use ($userId, $employeeId, $data) {
                if ($data['assignable_type'] === 'user') {
                    $q->where('user_id', $userId);
                } else {
                    $q->where('employee_id', $employeeId);
                }
            })
            ->where(function ($q) use ($data) {
                $q->whereBetween('period_start', [$data['period_start'], $data['period_end']])
                  ->orWhereBetween('period_end',  [$data['period_start'], $data['period_end']])
                  ->orWhere(function ($q2) use ($data) {
                      $q2->where('period_start', '<=', $data['period_start'])
                         ->where('period_end',   '>=', $data['period_end']);
                  });
            })
            ->exists();

        if ($overlap) {
            return back()->withErrors([
                'period_start' => 'This worker already has a payroll entry that overlaps with the selected period.',
            ])->withInput();
        }

        $payType       = (string) ($teamMember->pay_type ?? $data['pay_type']);
        $monthlySalary = $payType === 'salary'
            ? (float) (($teamMember->monthly_salary ?? 0) ?: ($data['monthly_salary'] ?? 0))
            : 0;
        $dailyRate     = $payType === 'salary'
            ? ($monthlySalary > 0 ? round($monthlySalary / 26, 4) : 0)
            : (float) (((float) ($teamMember->hourly_rate ?? 0) > 0)
                ? ((float) ($teamMember->hourly_rate ?? 0) * 8)
                : ($data['daily_rate'] ?? 0));
        $basePay       = $payType === 'fixed' ? (float) ($data['gross_pay'] ?? 0) : null;

        $entry = ProjectLaborCost::create([
            'project_id'      => $project->id,
            'user_id'         => $userId,
            'employee_id'     => $employeeId,
            'assignable_type' => $data['assignable_type'],
            'period_start'    => $data['period_start'],
            'period_end'      => $data['period_end'],
            'status'          => 'draft',
            'pay_type'        => $payType,
            'daily_rate'      => $dailyRate,
            'monthly_salary'  => $monthlySalary ?: null,
            'base_pay'        => $basePay,
            'gross_pay'       => $basePay,
            'payroll_events'   => null,
            'deduction_items'  => array_values((array) ($data['deduction_items'] ?? [])),
            'overpay_amount'  => 0,
            'overpay_reason'  => null,
            'damages_deduction' => 0,
            'damages_reason'    => null,
            'other_deduction'   => 0,
            'other_deduction_reason' => null,
            'cash_advance'      => (float) ($data['cash_advance'] ?? 0),
            'cash_advance_reason' => $data['cash_advance_reason'] ?? null,
            'attendance'      => $data['attendance'],
            'description'     => $data['description'] ?? null,
            'notes'           => $data['notes']        ?? null,
            'created_by'      => Auth::id(),
        ]);

        // Auto-link to BOQ item if this worker has a matching labor resource on this project.
        $boqResource = \App\Models\ProjectBoqItemResource::query()
            ->where('resource_category', 'labor')
            ->when($employeeId, fn ($q) => $q->where('employee_id', $employeeId))
            ->when($userId && !$employeeId, fn ($q) => $q->where('user_id', $userId))
            ->whereHas('boqItem', fn ($q) => $q->where('project_id', $project->id))
            ->with('boqItem')
            ->first();

        if ($boqResource?->boqItem) {
            $entry->update(['boq_item_id' => $boqResource->boqItem->id]);
        }

        $entry->load(['user', 'employee']);

        $this->adminActivityLogs(
            'Labor Cost', 'Created',
            'Created payroll entry for ' . $entry->assignable_name
            . ' — period ' . $data['period_start'] . ' to ' . $data['period_end']
            . ' for project "' . $project->project_name . '"'
        );

        $this->createSystemNotification(
            'general', 'Payroll Entry Added',
            "Payroll entry for {$entry->assignable_name} ({$data['period_start']} – {$data['period_end']}) added for project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );

        return back()->with('success', 'Payroll entry created successfully.');
    }

    // ── Update ────────────────────────────────────────────────────────────────

    public function update(Project $project, Request $request, ProjectLaborCost $laborCost)
    {
        $scopeError = $this->ensureProjectScoped($project, $laborCost);
        if ($scopeError) {
            return back()->withErrors($scopeError);
        }

        if ($laborCost->status !== ProjectLaborCost::STATUS_DRAFT) {
            return back()->withErrors(['status' => 'Only draft payroll entries can be edited.']);
        }

        $data = $request->validate([
            'assignable_id'              => ['required', 'integer'],
            'assignable_type'            => ['required', 'in:user,employee'],
            'period_start'               => ['required', 'date'],
            'period_end'                 => ['required', 'date', 'after_or_equal:period_start'],
            'pay_type'                   => ['required', 'in:hourly,salary,fixed'],
            'daily_rate'                 => ['nullable', 'numeric', 'min:0'],
            'monthly_salary'             => ['nullable', 'numeric', 'min:0'],
            'gross_pay'                  => ['nullable', 'numeric', 'min:0'],
            'overpay_amount'             => ['prohibited'],
            'overpay_reason'             => ['prohibited'],
            'double_pay_amount'          => ['prohibited'],
            'double_pay_reason'          => ['prohibited'],
            'damages_deduction'          => ['prohibited'],
            'damages_reason'             => ['prohibited'],
            'other_deduction'            => ['prohibited'],
            'other_deduction_reason'     => ['prohibited'],
            'cash_advance'               => ['nullable', 'numeric', 'min:0'],
            'cash_advance_reason'        => ['nullable', 'string', 'max:500'],
            'double_pay_preset'          => ['nullable', 'boolean'],
            'payroll_events'             => ['prohibited'],
            'deduction_items'            => ['nullable', 'array'],
            'deduction_items.*.type'     => ['required_with:deduction_items', 'in:damage,other'],
            'deduction_items.*.label'    => ['required_with:deduction_items', 'string', 'max:255'],
            'deduction_items.*.amount'   => ['required_with:deduction_items', 'numeric', 'min:0.01'],
            'attendance'                 => ['required', 'array'],
            'attendance.*'               => ['required', 'array'],
            'attendance.*.status'        => ['required', 'in:P,A,HD,NW'],
            'attendance.*.time_in'       => ['nullable', 'date_format:H:i'],
            'attendance.*.time_out'      => ['nullable', 'date_format:H:i'],
            'attendance.*.break_minutes' => ['nullable', 'integer', 'min:0', 'max:480'],
            'attendance.*.is_holiday'    => ['nullable', 'boolean'],
            'description'                => ['nullable', 'string', 'max:500'],
            'notes'                      => ['nullable', 'string'],
        ]);

        if ($data['assignable_type'] === 'user') {
            $request->validate(['assignable_id' => ['exists:users,id']]);
            $userId     = $data['assignable_id'];
            $employeeId = null;
        } else {
            $request->validate(['assignable_id' => ['exists:employees,id']]);
            $userId     = null;
            $employeeId = $data['assignable_id'];
        }

        $teamMember    = $this->getTeamMember($project, $data['assignable_type'], $userId, $employeeId);
        $boundaryError = $this->validateAssignmentBoundary($data, $teamMember);
        if ($boundaryError) {
            return back()->withErrors($boundaryError)->withInput();
        }

        $overlap = ProjectLaborCost::where('project_id', $project->id)
            ->where('id', '!=', $laborCost->id)
            ->where('assignable_type', $data['assignable_type'])
            ->where(function ($q) use ($userId, $employeeId, $data) {
                if ($data['assignable_type'] === 'user') {
                    $q->where('user_id', $userId);
                } else {
                    $q->where('employee_id', $employeeId);
                }
            })
            ->where(function ($q) use ($data) {
                $q->whereBetween('period_start', [$data['period_start'], $data['period_end']])
                  ->orWhereBetween('period_end',  [$data['period_start'], $data['period_end']])
                  ->orWhere(function ($q2) use ($data) {
                      $q2->where('period_start', '<=', $data['period_start'])
                         ->where('period_end',   '>=', $data['period_end']);
                  });
            })
            ->exists();

        if ($overlap) {
            return back()->withErrors([
                'period_start' => 'This worker already has a payroll entry that overlaps with the selected period.',
            ])->withInput();
        }

        $payType       = (string) ($teamMember->pay_type ?? $data['pay_type']);
        $monthlySalary = $payType === 'salary'
            ? (float) (($teamMember->monthly_salary ?? 0) ?: ($data['monthly_salary'] ?? 0))
            : 0;
        $dailyRate     = $payType === 'salary'
            ? ($monthlySalary > 0 ? round($monthlySalary / 26, 4) : 0)
            : (float) (((float) ($teamMember->hourly_rate ?? 0) > 0)
                ? ((float) ($teamMember->hourly_rate ?? 0) * 8)
                : ($data['daily_rate'] ?? 0));
        $basePay       = $payType === 'fixed' ? (float) ($data['gross_pay'] ?? 0) : null;

        $laborCost->update([
            'user_id'         => $userId,
            'employee_id'     => $employeeId,
            'assignable_type' => $data['assignable_type'],
            'period_start'    => $data['period_start'],
            'period_end'      => $data['period_end'],
            'pay_type'        => $payType,
            'daily_rate'      => $dailyRate,
            'monthly_salary'  => $monthlySalary ?: null,
            'base_pay'        => $basePay,
            'gross_pay'       => $basePay,
            'payroll_events'   => null,
            'deduction_items'  => array_values((array) ($data['deduction_items'] ?? [])),
            'overpay_amount'  => 0,
            'overpay_reason'  => null,
            'damages_deduction' => 0,
            'damages_reason'    => null,
            'other_deduction'   => 0,
            'other_deduction_reason' => null,
            'cash_advance'      => (float) ($data['cash_advance'] ?? 0),
            'cash_advance_reason' => $data['cash_advance_reason'] ?? null,
            'attendance'      => $data['attendance'],
            'description'     => $data['description'] ?? null,
            'notes'           => $data['notes']        ?? null,
        ]);

        $laborCost->load(['user', 'employee']);

        $this->adminActivityLogs(
            'Labor Cost', 'Updated',
            'Updated payroll entry for ' . $laborCost->assignable_name
            . ' for project "' . $project->project_name . '"'
        );

        $this->createSystemNotification(
            'general', 'Payroll Entry Updated',
            "Payroll entry for {$laborCost->assignable_name} has been updated for project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );

        return back()->with('success', 'Payroll entry updated successfully.');
    }

    // ── Submit (lock period) ──────────────────────────────────────────────────

    public function submit(Project $project, ProjectLaborCost $laborCost)
    {
        $scopeError = $this->ensureProjectScoped($project, $laborCost);
        if ($scopeError) {
            return back()->withErrors($scopeError);
        }

        if ($laborCost->status !== ProjectLaborCost::STATUS_DRAFT) {
            return back()->with('error', 'Only draft payroll entries can be submitted.');
        }

        $teamMember = $this->getTeamMember(
            $project,
            $laborCost->assignable_type,
            $laborCost->user_id,
            $laborCost->employee_id
        );

        $boundaryError = $this->validateAssignmentBoundary([
            'period_start'    => $laborCost->period_start->format('Y-m-d'),
            'period_end'      => $laborCost->period_end->format('Y-m-d'),
            'assignable_type' => $laborCost->assignable_type,
        ], $teamMember);

        if ($boundaryError) {
            return back()->with('error', array_values($boundaryError)[0]);
        }

        $overlap = ProjectLaborCost::where('project_id', $project->id)
            ->where('id', '!=', $laborCost->id)
            ->whereIn('status', [ProjectLaborCost::STATUS_SUBMITTED, ProjectLaborCost::STATUS_APPROVED, ProjectLaborCost::STATUS_PAID])
            ->where('assignable_type', $laborCost->assignable_type)
            ->where(function ($q) use ($laborCost) {
                if ($laborCost->assignable_type === 'user') {
                    $q->where('user_id', $laborCost->user_id);
                } else {
                    $q->where('employee_id', $laborCost->employee_id);
                }
            })
            ->where(function ($q) use ($laborCost) {
                $start = $laborCost->period_start->format('Y-m-d');
                $end   = $laborCost->period_end->format('Y-m-d');
                $q->whereBetween('period_start', [$start, $end])
                  ->orWhereBetween('period_end',  [$start, $end])
                  ->orWhere(function ($q2) use ($start, $end) {
                      $q2->where('period_start', '<=', $start)
                         ->where('period_end',   '>=', $end);
                  });
            })
            ->exists();

        if ($overlap) {
            return back()->with('error',
                'Cannot submit. Another submitted payroll entry already covers an overlapping period for this worker.'
            );
        }

        // Ensure pay is recomputed from current attendance/rates before funding validation.
        $laborCost->recomputePay();
        $laborCost->refresh();

        $fundingError = $this->validateFunding($project, $laborCost);
        if ($fundingError) {
            return back()->withErrors($fundingError);
        }

        $payType = $laborCost->pay_type ?? 'hourly';

        // For fixed pay type, breakdown is just a summary entry
        if ($payType === 'fixed') {
            $breakdown = ['fixed' => [
                'status'    => 'fixed',
                'base_pay'  => (float) ($laborCost->base_pay ?? 0),
                'gross_pay' => (float) $laborCost->gross_pay,
            ]];
        } else {
            $breakdown = ProjectLaborCost::computeBreakdown(
                $laborCost->attendance ?? [],
                (float) $laborCost->daily_rate,
                $payType,
                (float) ($laborCost->monthly_salary ?? 0)
            );
        }

        $breakdown['_adjustments'] = [
            'base_pay'          => (float) ($laborCost->base_pay ?? 0),
            'overpay_amount'    => (float) ($laborCost->overpay_amount ?? 0),
            'overpay_reason'    => (string) ($laborCost->overpay_reason ?? ''),
            'double_pay_amount' => (float) ($laborCost->double_pay_amount ?? 0),
            'double_pay_reason' => (string) ($laborCost->double_pay_reason ?? ''),
            'damages_deduction' => (float) ($laborCost->damages_deduction ?? 0),
            'damages_reason'    => (string) ($laborCost->damages_reason ?? ''),
            'other_deduction'   => (float) ($laborCost->other_deduction ?? 0),
            'other_deduction_reason' => (string) ($laborCost->other_deduction_reason ?? ''),
            'cash_advance'      => (float) ($laborCost->cash_advance ?? 0),
            'cash_advance_reason' => (string) ($laborCost->cash_advance_reason ?? ''),
            'deduction_items'   => (array) ($laborCost->deduction_items ?? []),
            'payroll_events'    => [],
            'event_lines'       => [],
            'gross_pay'         => (float) $laborCost->gross_pay,
        ];

        $laborCost->update([
            'status'            => ProjectLaborCost::STATUS_SUBMITTED,
            'submitted_at'      => now(),
            'submitted_by'      => Auth::id(),
            'payroll_breakdown' => $breakdown,
            // Clear any previous rejection info on re-submit
            'rejection_reason'  => null,
            'rejected_at'       => null,
            'rejected_by'       => null,
        ]);
        $laborCost->load(['user', 'employee']);

        $this->adminActivityLogs(
            'Labor Cost', 'Submitted',
            'Submitted payroll entry for ' . $laborCost->assignable_name
            . ' — period ' . $laborCost->period_start->format('M d, Y')
            . ' to ' . $laborCost->period_end->format('M d, Y')
            . ' for project "' . $project->project_name . '"'
        );

        $this->createSystemNotification(
            'general', 'Payroll Entry Submitted',
            "Payroll entry for {$laborCost->assignable_name} has been submitted for project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );

        return back()->with('success', 'Payroll entry submitted and locked successfully.');
    }

    // ── Reject (send back to draft) ───────────────────────────────────────────

    public function reject(Request $request, Project $project, ProjectLaborCost $laborCost)
    {
        $scopeError = $this->ensureProjectScoped($project, $laborCost);
        if ($scopeError) {
            return back()->withErrors($scopeError);
        }

        if ($laborCost->status !== ProjectLaborCost::STATUS_SUBMITTED) {
            return back()->with('error', 'Only submitted payroll entries can be rejected.');
        }

        $validated = $request->validate([
            'rejection_reason' => ['required', 'string', 'min:5', 'max:500'],
        ]);

        $laborCost->update([
            'status'           => ProjectLaborCost::STATUS_DRAFT,
            'rejection_reason' => $validated['rejection_reason'],
            'rejected_at'      => now(),
            'rejected_by'      => Auth::id(),
        ]);

        $laborCost->load(['user', 'employee']);

        $this->adminActivityLogs(
            'Labor Cost', 'Rejected',
            'Rejected payroll entry for ' . $laborCost->assignable_name
            . ' — period ' . $laborCost->period_start->format('M d, Y')
            . ' to ' . $laborCost->period_end->format('M d, Y')
            . ' for project "' . $project->project_name . '". Reason: ' . $validated['rejection_reason']
        );

        $this->createSystemNotification(
            'general', 'Payroll Entry Rejected',
            "Payroll entry for {$laborCost->assignable_name} was rejected for project '{$project->project_name}'. Reason: {$validated['rejection_reason']}",
            $project,
            route('project-management.view', $project->id)
        );

        return back()->with('success', 'Payroll entry rejected and returned to draft.');
    }

    public function approve(Project $project, ProjectLaborCost $laborCost)
    {
        $scopeError = $this->ensureProjectScoped($project, $laborCost);
        if ($scopeError) {
            return back()->withErrors($scopeError);
        }

        if ($laborCost->status !== ProjectLaborCost::STATUS_SUBMITTED) {
            return back()->with('error', 'Only submitted payroll entries can be approved.');
        }

        $fundingError = $this->validateFunding($project, $laborCost);
        if ($fundingError) {
            return back()->withErrors($fundingError);
        }

        $laborCost->update([
            'status'      => ProjectLaborCost::STATUS_APPROVED,
            'approved_at' => now(),
            'approved_by' => Auth::id(),
        ]);

        $this->adminActivityLogs(
            'Labor Cost', 'Approved',
            'Approved payroll entry for ' . $laborCost->assignable_name
            . ' — period ' . $laborCost->period_start->format('M d, Y')
            . ' to ' . $laborCost->period_end->format('M d, Y')
            . ' for project "' . $project->project_name . '"'
        );

        return back()->with('success', 'Payroll entry approved successfully.');
    }

    public function markPaid(Project $project, ProjectLaborCost $laborCost)
    {
        $scopeError = $this->ensureProjectScoped($project, $laborCost);
        if ($scopeError) {
            return back()->withErrors($scopeError);
        }

        if ($laborCost->status !== ProjectLaborCost::STATUS_APPROVED) {
            return back()->with('error', 'Only approved payroll entries can be marked as paid.');
        }

        $laborCost->update([
            'status'   => ProjectLaborCost::STATUS_PAID,
            'paid_at'  => now(),
            'paid_by'  => Auth::id(),
        ]);

        $this->adminActivityLogs(
            'Labor Cost', 'Paid',
            'Marked payroll entry as paid for ' . $laborCost->assignable_name
            . ' — period ' . $laborCost->period_start->format('M d, Y')
            . ' to ' . $laborCost->period_end->format('M d, Y')
            . ' for project "' . $project->project_name . '"'
        );

        return back()->with('success', 'Payroll entry marked as paid.');
    }

    // ── Destroy ───────────────────────────────────────────────────────────────

    public function destroy(Project $project, ProjectLaborCost $laborCost)
    {
        $scopeError = $this->ensureProjectScoped($project, $laborCost);
        if ($scopeError) {
            return back()->withErrors($scopeError);
        }

        if ($laborCost->status !== ProjectLaborCost::STATUS_DRAFT) {
            return back()->with('error', 'Only draft payroll entries can be deleted.');
        }

        $laborCost->load(['user', 'employee']);
        $assignableName = $laborCost->assignable_name;
        $periodLabel    = $laborCost->period_start->format('M d')
            . ' – ' . $laborCost->period_end->format('M d, Y');

        $laborCost->delete();

        $this->adminActivityLogs(
            'Labor Cost', 'Deleted',
            'Deleted payroll entry for ' . $assignableName
            . ' (' . $periodLabel . ') from project "' . $project->project_name . '"'
        );

        $this->createSystemNotification(
            'general', 'Payroll Entry Deleted',
            "Payroll entry for {$assignableName} ({$periodLabel}) has been deleted from project '{$project->project_name}'.",
            $project,
            route('project-management.view', $project->id)
        );

        return back()->with('success', 'Payroll entry deleted successfully.');
    }
}
