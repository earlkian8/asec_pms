<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class UpdateProjectRequest extends FormRequest
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
        ];
    }
}
