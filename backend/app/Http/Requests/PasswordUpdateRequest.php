<?php

namespace App\Http\Requests;

use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\Rules\Password;

class PasswordUpdateRequest extends FormRequest
{
    public function rules(): array
    {
        return [
            'current_password'      => ['required', 'current_password'],
            'password'              => [
                'required',
                'string',
                'confirmed',
                Password::min(8)
                    ->mixedCase()
                    ->numbers()
                    ->symbols(),
                function ($attribute, $value, $fail) {
                    if (Hash::check($value, $this->user()->password)) {
                        $fail('New password must be different from your current password.');
                    }
                },
            ],
            'password_confirmation' => ['required'],
        ];
    }

    public function messages(): array
    {
        return [
            'current_password.required'         => 'Current password is required.',
            'current_password.current_password'  => 'Current password is incorrect.',
            'password.required'                  => 'New password is required.',
            'password.confirmed'                 => 'Passwords do not match.',
            'password.min'                       => 'Password must be at least 8 characters.',
            'password.mixed'                     => 'Must include an uppercase and lowercase letter.',
            'password.numbers'                   => 'Must include a number.',
            'password.symbols'                   => 'Must include a special character.',
            'password_confirmation.required'     => 'Please confirm your new password.',
        ];
    }
}