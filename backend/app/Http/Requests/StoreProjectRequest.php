<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreProjectRequest extends FormRequest
{
    public function authorize(): bool
    {
        return true;
    }

    /**
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'project_name' => ['required', 'max:255'],
            'client_id' => ['required', 'exists:clients,id'],
            'project_type_id' => ['required', 'exists:project_types,id'],
            'status' => ['nullable', 'in:active,on_hold,completed,cancelled'],
            'priority' => ['nullable', 'in:low,medium,high'],
            'contract_amount' => ['required', 'numeric'],
            'start_date' => ['nullable', 'date'],
            'planned_end_date' => ['nullable', 'date'],
            'actual_end_date' => ['nullable', 'date'],
            'location' => ['nullable', 'string'],
            'description' => ['nullable', 'string'],
            'billing_type' => ['nullable', 'in:fixed_price,milestone'],
            'team_members' => ['nullable', 'array'],
            'team_members.*.id' => ['required', 'integer'],
            'team_members.*.type' => ['required', 'in:user,employee'],
            'team_members.*.role' => ['required', 'string', 'max:50'],
            'team_members.*.hourly_rate' => ['required', 'numeric', 'min:0'],
            'team_members.*.start_date' => ['required', 'date'],
            'team_members.*.end_date' => ['nullable', 'date', 'after_or_equal:team_members.*.start_date'],
            'milestones' => ['nullable', 'array'],
            'milestones.*.name' => ['required', 'string', 'max:255'],
            'milestones.*.description' => ['nullable', 'string'],
            'milestones.*.start_date' => ['nullable', 'date'],
            'milestones.*.due_date' => ['nullable', 'date', 'after_or_equal:milestones.*.start_date'],
            'milestones.*.billing_percentage' => ['nullable', 'numeric', 'min:0', 'max:100'],
            'milestones.*.status' => ['nullable', 'in:pending,in_progress,completed'],
            'material_allocations' => ['nullable', 'array'],
            'material_allocations.*.inventory_item_id' => ['required', 'exists:inventory_items,id'],
            'material_allocations.*.quantity_allocated' => ['required', 'numeric', 'min:0.01'],
            'material_allocations.*.notes' => ['nullable', 'string'],
            'labor_costs' => ['nullable', 'array'],
            'labor_costs.*.assignable_id' => ['required', 'integer'],
            'labor_costs.*.assignable_type' => ['required', 'in:user,employee'],
            'labor_costs.*.work_date' => ['required', 'date'],
            'labor_costs.*.hours_worked' => ['required', 'numeric', 'min:0.01'],
            'labor_costs.*.hourly_rate' => ['required', 'numeric', 'min:0'],
            'labor_costs.*.description' => ['nullable', 'string', 'max:500'],
            'labor_costs.*.notes' => ['nullable', 'string'],
        ];
    }
}
