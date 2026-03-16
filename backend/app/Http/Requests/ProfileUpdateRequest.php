<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;

class ProfileUpdateRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'name'  => ['required', 'string', 'max:255'],
            'email' => [
                'required',
                'string',
                'lowercase',
                'email',
                'max:254',
                Rule::unique(User::class)->ignore($this->user()->id),
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'name.required'   => 'Name is required.',
            'name.max'        => 'Name must not exceed 255 characters.',
            'email.required'  => 'Email is required.',
            'email.email'     => 'Invalid email format.',
            'email.max'       => 'Email is too long (max 254 characters).',
            'email.unique'    => 'This email address is already taken.',
        ];
    }

    /**
     * Trim name and email before validation runs.
     */
    protected function prepareForValidation(): void
    {
        $this->merge([
            'name'  => trim($this->name),
            'email' => trim($this->email),
        ]);
    }
}