<?php

namespace App\Http\Controllers\Admin;

use App\Http\Controllers\Controller;
use App\Models\Project;
use App\Models\ProjectLaborCost;
use App\Models\ProjectTeam;
use App\Traits\ActivityLogsTrait;
use App\Traits\NotificationTrait;
use Carbon\Carbon;
use Carbon\CarbonPeriod;
use Illuminate\Http\Request;

class ProjectLaborCostsController extends Controller
{
    use ActivityLogsTrait, NotificationTrait;

    // ── Shared helper ─────────────────────────────────────────────────────────

    private function getTeamMember(Project $project, string $assignableType, ?int $userId, ?int $employeeId): ?\App\Models\ProjectTeam
    {
        return ProjectTeam::where('project_id', $project->id)
            ->where('assignable_type', $assignableType)
            ->when($assignableType === 'user',     fn ($q) => $q->where('user_id',     $userId))
            ->when($assignableType === 'employee', fn ($q) => $q->where('employee_id', $employeeId))
            ->first();
    }

    private function validateAssignmentBoundary(array $data, ?\App\Models\ProjectTeam $teamMember): ?array
    {
        if (!$teamMember) {
            return ['assignable_id' => 'This worker is not assigned to this project.'];
        }

        if (
            $teamMember->start_date &&
            $data['period_start'] < $teamMember->start_date->format('Y-m-d')
        ) {
            return [
                'period_start' => 'Period start cannot be before the worker\'s assignment start date ('
                    . $teamMember->start_date->format('M d, Y') . ').',
            ];
        }

        if (
            $teamMember->end_date &&
            $data['period_end'] > $teamMember->end_date->format('Y-m-d')
        ) {
            return [
                'period_end' => 'Period end cannot be after the worker\'s assignment end date ('
                    . $teamMember->end_date->format('M d, Y') . '). '
                    . 'Extend the team member\'s end date first if needed.',
            ];
        }

        return null;
    }

    // ── Store ─────────────────────────────────────────────────────────────────

    public function store(Project $project, Request $request)
    {
        $data = $request->validate([
            'assignable_id'   => ['required', 'integer'],
            'assignable_type' => ['required', 'in:user,employee'],
            'period_start'    => ['required', 'date'],
            'period_end'      => ['required', 'date', 'after_or_equal:period_start'],
            'daily_rate'      => ['required', 'numeric', 'min:0'],
            'attendance'      => ['required', 'array'],
            'attendance.*'    => ['required', 'in:P,A,HD'],
            'description'     => ['nullable', 'string', 'max:500'],
            'notes'           => ['nullable', 'string'],
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

        // ── Guard: period must fall within the worker's assignment dates ──────
        $teamMember    = $this->getTeamMember($project, $data['assignable_type'], $userId, $employeeId);
        $boundaryError = $this->validateAssignmentBoundary($data, $teamMember);
        if ($boundaryError) {
            return back()->withErrors($boundaryError)->withInput();
        }

        // ── Guard: no overlapping period for the same worker ──────────────────
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

        $entry = ProjectLaborCost::create([
            'project_id'      => $project->id,
            'user_id'         => $userId,
            'employee_id'     => $employeeId,
            'assignable_type' => $data['assignable_type'],
            'period_start'    => $data['period_start'],
            'period_end'      => $data['period_end'],
            'status'          => 'draft',
            'daily_rate'      => $data['daily_rate'],
            'attendance'      => $data['attendance'],
            'description'     => $data['description'] ?? null,
            'notes'           => $data['notes']        ?? null,
            'created_by'      => auth()->id(),
        ]);

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
        if ($laborCost->status === 'submitted') {
            return back()->withErrors(['status' => 'Cannot edit a submitted payroll entry.']);
        }

        $data = $request->validate([
            'assignable_id'   => ['required', 'integer'],
            'assignable_type' => ['required', 'in:user,employee'],
            'period_start'    => ['required', 'date'],
            'period_end'      => ['required', 'date', 'after_or_equal:period_start'],
            'daily_rate'      => ['required', 'numeric', 'min:0'],
            'attendance'      => ['required', 'array'],
            'attendance.*'    => ['required', 'in:P,A,HD'],
            'description'     => ['nullable', 'string', 'max:500'],
            'notes'           => ['nullable', 'string'],
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

        // ── Guard: period must fall within the worker's assignment dates ──────
        $teamMember    = $this->getTeamMember($project, $data['assignable_type'], $userId, $employeeId);
        $boundaryError = $this->validateAssignmentBoundary($data, $teamMember);
        if ($boundaryError) {
            return back()->withErrors($boundaryError)->withInput();
        }

        // ── Overlap guard — exclude self ──────────────────────────────────────
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

        $laborCost->update([
            'user_id'         => $userId,
            'employee_id'     => $employeeId,
            'assignable_type' => $data['assignable_type'],
            'period_start'    => $data['period_start'],
            'period_end'      => $data['period_end'],
            'daily_rate'      => $data['daily_rate'],
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
        if ($laborCost->status === 'submitted') {
            return back()->with('error', 'This payroll entry is already submitted.');
        }

        $laborCost->update(['status' => 'submitted']);
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

    // ── Destroy ───────────────────────────────────────────────────────────────

    public function destroy(Project $project, ProjectLaborCost $laborCost)
    {
        if ($laborCost->status === 'submitted') {
            return back()->with('error', 'Cannot delete a submitted payroll entry.');
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