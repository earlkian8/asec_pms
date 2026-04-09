<?php

namespace App\Http\Controllers;

use App\Http\Requests\ProfileUpdateRequest;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Redirect;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class ProfileController extends Controller
{
    private array $imageFields = [
        'profile_image'       => 'profile-images',
        'sss_id_image'        => 'gov-ids/sss',
        'philhealth_id_image' => 'gov-ids/philhealth',
        'pagibig_id_image'    => 'gov-ids/pagibig',
        'tin_id_image'        => 'gov-ids/tin',
    ];

    public function edit(Request $request): Response
    {
        $user = $request->user()->load('roles');

        return Inertia::render('Profile/Edit', [
            'user'   => $user,
            'status' => session('status'),
        ]);
    }

    public function update(ProfileUpdateRequest $request): RedirectResponse
    {
        $user = $request->user();
        $v    = $request->validated();

        $data = [
            'first_name'  => $v['first_name'],
            'middle_name' => $v['middle_name'] ?? null,
            'last_name'   => $v['last_name'],
            'email'       => $v['email'],

            'phone'           => $v['phone']           ?? null,
            'secondary_phone' => $v['secondary_phone'] ?? null,
            'gender'          => $v['gender']          ?? null,
            'date_of_birth'   => $v['date_of_birth']   ?? null,
            'civil_status'    => $v['civil_status']    ?? null,
            'nationality'     => $v['nationality']     ?? null,

            'region'            => $v['region']            ?? null,
            'province'          => $v['province']          ?? null,
            'city_municipality' => $v['city_municipality'] ?? null,
            'barangay'          => $v['barangay']          ?? null,
            'address'           => $v['address']           ?? null,
            'zip_code'          => $v['zip_code']          ?? null,

            'emergency_contact_name'         => $v['emergency_contact_name']         ?? null,
            'emergency_contact_relationship' => $v['emergency_contact_relationship'] ?? null,
            'emergency_contact_phone'        => $v['emergency_contact_phone']        ?? null,

            'sss_number'        => $v['sss_number']        ?? null,
            'philhealth_number' => $v['philhealth_number'] ?? null,
            'pagibig_number'    => $v['pagibig_number']    ?? null,
            'tin_number'        => $v['tin_number']        ?? null,

            'notes' => $v['notes'] ?? null,
        ];

        // Handle image uploads
        foreach ($this->imageFields as $field => $folder) {
            if ($request->hasFile($field)) {
                if ($user->{$field}) {
                    Storage::disk(config('filesystems.default'))->delete($user->{$field});
                }
                $data[$field] = $request->file($field)->store($folder, config('filesystems.default'));
            }
        }

        // Handle password change
        if (!empty($v['password'])) {
            $data['password'] = Hash::make($v['password']);
        }

        // Reset email verification if email changed
        if ($user->email !== $v['email']) {
            $data['email_verified_at'] = null;
        }

        $user->update($data);

        return back()->with('status', 'profile-updated');
    }

    public function destroy(Request $request): RedirectResponse
    {
        $request->validate([
            'password' => ['required', 'current_password'],
        ]);

        $user = $request->user();

        Auth::logout();
        $user->delete();

        $request->session()->invalidate();
        $request->session()->regenerateToken();

        return Redirect::to('/');
    }
}
