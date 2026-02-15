<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreBillingRequest extends FormRequest
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
            'project_id' => ['required', 'exists:projects,id'],
            'billing_type' => ['required', 'in:fixed_price,milestone'],
            'milestone_id' => ['nullable', 'exists:project_milestones,id', 'required_if:billing_type,milestone'],
            'billing_amount' => ['required', 'numeric', 'min:0.01'],
            'billing_date' => ['required', 'date'],
            'due_date' => ['nullable', 'date', 'after_or_equal:billing_date'],
            'description' => ['nullable', 'string'],
        ];
    }
}
