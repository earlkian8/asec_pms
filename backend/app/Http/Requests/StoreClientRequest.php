<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;

class StoreClientRequest extends FormRequest
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
            'client_name' => ['required', 'max:255'],
            'client_type_id' => ['required', 'exists:client_types,id'],
            'contact_person' => ['required', 'max:255'],
            'email' => ['required', 'email', 'max:100'],
            'phone_number' => ['nullable', 'max:20'],
            'address' => ['nullable', 'max:255'],
            'city' => ['nullable', 'max:100'],
            'province' => ['nullable', 'max:100'],
            'postal_code' => ['nullable', 'max:20'],
            'country' => ['nullable', 'max:100'],
            'tax_id' => ['nullable', 'max:50'],
            'business_permit' => ['nullable', 'max:50'],
            'credit_limit' => ['nullable', 'numeric'],
            'payment_terms' => ['nullable', 'max:100'],
            'is_active' => ['required', 'boolean'],
            'notes' => ['nullable', 'string'],
        ];
    }
}
