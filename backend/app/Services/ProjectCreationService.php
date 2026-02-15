<?php

namespace App\Services;

use App\Models\Employee;
use App\Models\Project;
use App\Models\ProjectLaborCost;
use App\Models\ProjectMaterialAllocation;
use App\Models\ProjectMilestone;
use App\Models\ProjectTeam;
use App\Models\User;
use Illuminate\Support\Facades\DB;
use Illuminate\Validation\ValidationException;

class ProjectCreationService
{
    public function __construct(protected CodeGeneratorService $codeGeneratorService) {}

    /**
     * Create project with team, milestones, material allocations, and labor costs.
     *
     * @param  array<string, mixed>  $validated
     *
     * @throws ValidationException
     */
    public function create(array $validated): Project
    {
        $validated['project_code'] = $this->codeGeneratorService->generateUniqueCode('PRJ', 'projects', 'project_code', 6);

        DB::beginTransaction();
        try {
            $project = Project::create($validated);

            if (! empty($validated['team_members'])) {
                $this->validateTeamMemberIds($validated['team_members']);
                foreach ($validated['team_members'] as $member) {
                    ProjectTeam::create([
                        'project_id' => $project->id,
                        'user_id' => $member['type'] === 'user' ? $member['id'] : null,
                        'employee_id' => $member['type'] === 'employee' ? $member['id'] : null,
                        'assignable_type' => $member['type'],
                        'role' => $member['role'],
                        'hourly_rate' => $member['hourly_rate'],
                        'start_date' => $member['start_date'],
                        'end_date' => $member['end_date'] ?? null,
                        'is_active' => true,
                    ]);
                }
            }

            if (! empty($validated['milestones'])) {
                foreach ($validated['milestones'] as $milestone) {
                    ProjectMilestone::create([
                        'project_id' => $project->id,
                        'name' => $milestone['name'],
                        'description' => $milestone['description'] ?? null,
                        'start_date' => $milestone['start_date'] ?? null,
                        'due_date' => $milestone['due_date'] ?? null,
                        'billing_percentage' => $milestone['billing_percentage'] ?? null,
                        'status' => $milestone['status'] ?? 'pending',
                    ]);
                }
            }

            if (! empty($validated['material_allocations'])) {
                foreach ($validated['material_allocations'] as $allocation) {
                    ProjectMaterialAllocation::create([
                        'project_id' => $project->id,
                        'inventory_item_id' => $allocation['inventory_item_id'],
                        'quantity_allocated' => $allocation['quantity_allocated'],
                        'quantity_received' => 0,
                        'status' => 'pending',
                        'allocated_by' => auth()->id(),
                        'allocated_at' => now(),
                        'notes' => $allocation['notes'] ?? null,
                    ]);
                }
            }

            if (! empty($validated['labor_costs'])) {
                $this->validateLaborCostIds($validated['labor_costs']);
                foreach ($validated['labor_costs'] as $laborCost) {
                    ProjectLaborCost::create([
                        'project_id' => $project->id,
                        'user_id' => $laborCost['assignable_type'] === 'user' ? $laborCost['assignable_id'] : null,
                        'employee_id' => $laborCost['assignable_type'] === 'employee' ? $laborCost['assignable_id'] : null,
                        'assignable_type' => $laborCost['assignable_type'],
                        'work_date' => $laborCost['work_date'],
                        'hours_worked' => $laborCost['hours_worked'],
                        'hourly_rate' => $laborCost['hourly_rate'],
                        'description' => $laborCost['description'] ?? null,
                        'notes' => $laborCost['notes'] ?? null,
                        'created_by' => auth()->id(),
                    ]);
                }
            }

            DB::commit();

            return $project;
        } catch (\Throwable $e) {
            DB::rollBack();
            throw $e;
        }
    }

    /**
     * @param  array<int, array{id: int, type: string}>  $teamMembers
     *
     * @throws ValidationException
     */
    private function validateTeamMemberIds(array $teamMembers): void
    {
        foreach ($teamMembers as $index => $member) {
            if ($member['type'] === 'user' && ! User::where('id', $member['id'])->exists()) {
                throw ValidationException::withMessages([
                    "team_members.{$index}.id" => ['The selected team member ID is invalid for user type.'],
                ]);
            }
            if ($member['type'] === 'employee' && ! Employee::where('id', $member['id'])->where('is_active', true)->exists()) {
                throw ValidationException::withMessages([
                    "team_members.{$index}.id" => ['The selected team member ID is invalid for employee type.'],
                ]);
            }
        }
    }

    /**
     * @param  array<int, array{assignable_id: int, assignable_type: string}>  $laborCosts
     *
     * @throws ValidationException
     */
    private function validateLaborCostIds(array $laborCosts): void
    {
        foreach ($laborCosts as $index => $laborCost) {
            if ($laborCost['assignable_type'] === 'user' && ! User::where('id', $laborCost['assignable_id'])->exists()) {
                throw ValidationException::withMessages([
                    "labor_costs.{$index}.assignable_id" => ['The selected team member ID is invalid for user type.'],
                ]);
            }
            if ($laborCost['assignable_type'] === 'employee' && ! Employee::where('id', $laborCost['assignable_id'])->where('is_active', true)->exists()) {
                throw ValidationException::withMessages([
                    "labor_costs.{$index}.assignable_id" => ['The selected team member ID is invalid for employee type.'],
                ]);
            }
        }
    }
}
