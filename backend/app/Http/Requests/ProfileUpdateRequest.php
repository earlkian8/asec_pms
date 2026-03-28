<?php

namespace App\Http\Requests;

use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Rule;
use Illuminate\Validation\Rules\Password;

class ProfileUpdateRequest extends FormRequest
{
    public function rules(): array
    {
        $userId = $this->user()->id;

        return [
            // Identity
            'first_name'  => ['required', 'string', 'max:100'],
            'middle_name' => ['nullable', 'string', 'max:100'],
            'last_name'   => ['required', 'string', 'max:100'],
            'email'       => ['required', 'string', 'email', 'max:254', Rule::unique(User::class)->ignore($userId)],

            // Password (optional change)
            'current_password'      => ['nullable', 'string', 'current_password'],
            'password'              => ['nullable', 'string', 'confirmed', Password::min(8)->max(254)->mixedCase()->numbers()->symbols()],
            'password_confirmation' => ['nullable', 'string'],

            // Profile image
            'profile_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:2048'],

            // Personal
            'phone'           => ['nullable', 'string', 'max:30'],
            'secondary_phone' => ['nullable', 'string', 'max:30'],
            'gender'          => ['nullable', 'in:male,female,other,prefer_not_to_say'],
            'date_of_birth'   => ['nullable', 'date', 'before:today'],
            'civil_status'    => ['nullable', 'in:single,married,widowed,separated,divorced'],
            'nationality'     => ['nullable', 'string', 'max:100'],

            // Address
            'region'            => ['nullable', 'string', 'max:150'],
            'province'          => ['nullable', 'string', 'max:150'],
            'city_municipality' => ['nullable', 'string', 'max:150'],
            'barangay'          => ['nullable', 'string', 'max:150'],
            'address'           => ['nullable', 'string'],
            'zip_code'          => ['nullable', 'string', 'max:20'],

            // Emergency
            'emergency_contact_name'         => ['nullable', 'string', 'max:150'],
            'emergency_contact_relationship' => ['nullable', 'string', 'max:80'],
            'emergency_contact_phone'        => ['nullable', 'string', 'max:30'],

            // Gov IDs
            'sss_number'          => ['nullable', 'string', 'max:30'],
            'sss_id_image'        => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'philhealth_number'   => ['nullable', 'string', 'max:30'],
            'philhealth_id_image' => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'pagibig_number'      => ['nullable', 'string', 'max:30'],
            'pagibig_id_image'    => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],
            'tin_number'          => ['nullable', 'string', 'max:30'],
            'tin_id_image'        => ['nullable', 'image', 'mimes:jpg,jpeg,png,webp', 'max:5120'],

            // Notes
            'notes' => ['nullable', 'string'],
        ];
    }

    public function messages(): array
    {
        return [
            'first_name.required'  => 'First name is required.',
            'last_name.required'   => 'Last name is required.',
            'email.required'       => 'Email is required.',
            'email.unique'         => 'This email address is already taken.',
            'current_password.current_password' => 'The current password is incorrect.',
            'password.min'         => 'Password must be at least 8 characters.',
            'password.mixed'       => 'Must include an uppercase and lowercase letter.',
            'password.numbers'     => 'Must include a number.',
            'password.symbols'     => 'Must include a special character.',
            'password.confirmed'   => 'Passwords do not match.',
        ];
    }
}
