<?php

namespace App\Http\Controllers\API;

use App\Http\Controllers\Controller;
use App\Models\Client;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Validation\ValidationException;

class ClientAuthController extends Controller
{
    /**
     * Client login
     */
    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|string|email',
            'password' => 'required|string',
        ]);

        $client = Client::where('email', $request->email)->first();

        if (! $client || ! Hash::check($request->password, $client->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid email or password'],
            ]);
        }

        if (! $client->is_active) {
            return api_error('Your account is inactive. Please contact support.', [
                'email' => ['Your account is inactive. Please contact support.'],
            ], 403);
        }

        // Revoke all existing tokens (optional - for single device login)
        // $client->tokens()->delete();

        $token = $client->createToken('client-api-token')->plainTextToken;

        // Check if password needs to be changed (password_changed_at is null)
        $mustChangePassword = is_null($client->password_changed_at);

        return api_success([
            'client' => [
                'id' => $client->id,
                'client_code' => $client->client_code,
                'name' => $client->client_name,
                'email' => $client->email,
                'contact_person' => $client->contact_person,
                'company' => $client->client_name,
                'phone_number' => $client->phone_number,
                'is_active' => $client->is_active,
            ],
            'token' => $token,
            'must_change_password' => $mustChangePassword,
        ], 'Login successful');
    }

    /**
     * Get authenticated client
     */
    public function me(Request $request)
    {
        $client = $request->user();

        return api_success([
            'id' => $client->id,
            'client_code' => $client->client_code,
            'name' => $client->client_name,
            'email' => $client->email,
            'contact_person' => $client->contact_person,
            'company' => $client->client_name,
            'phone_number' => $client->phone_number,
            'is_active' => $client->is_active,
        ]);
    }

    /**
     * Client logout
     */
    public function logout(Request $request)
    {
        // Revoke current token
        $request->user()->currentAccessToken()->delete();

        return api_success([], 'Logged out successfully');
    }

    /**
     * Revoke all tokens (logout from all devices)
     */
    public function logoutAll(Request $request)
    {
        $request->user()->tokens()->delete();

        return api_success([], 'Logged out from all devices successfully');
    }

    /**
     * Change password
     */
    public function changePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|string|min:8|confirmed',
        ]);

        $client = $request->user();

        // Verify current password
        if (! Hash::check($request->current_password, $client->password)) {
            return api_error('Current password is incorrect.', null, 422);
        }

        // Update password
        $client->password = Hash::make($request->new_password);
        $client->password_changed_at = now();
        $client->save();

        return api_success([], 'Password changed successfully. Please login again.');
    }
}
