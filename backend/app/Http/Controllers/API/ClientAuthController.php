<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Client;
use App\Models\ClientPortalSetting;
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

        if (!$client || !Hash::check($request->password, $client->password)) {
            throw ValidationException::withMessages([
                'email' => ['Invalid email or password'],
            ]);
        }

        if (!$client->is_active) {
            return response()->json([
                'success' => false,
                'message' => 'Your account is inactive. Please contact support.',
                'errors' => [
                    'email' => ['Your account is inactive. Please contact support.'],
                ],
            ], 403);
        }

        // Revoke all existing tokens (optional - for single device login)
        // $client->tokens()->delete();

        $token = $client->createToken('client-api-token')->plainTextToken;

        // Check if password needs to be changed (password_changed_at is null)
        $mustChangePassword = is_null($client->password_changed_at);

        return response()->json([
            'success' => true,
            'message' => 'Login successful',
            'data' => [
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
            ],
        ]);
    }

    /**
     * Get authenticated client
     */
    public function me(Request $request)
    {
        $client = $request->user();

        return response()->json([
            'success' => true,
            'data' => [
                'id' => $client->id,
                'client_code' => $client->client_code,
                'name' => $client->client_name,
                'email' => $client->email,
                'contact_person' => $client->contact_person,
                'company' => $client->client_name,
                'phone_number' => $client->phone_number,
                'is_active' => $client->is_active,
            ],
            'config' => [
                'display_billing_module' => ClientPortalSetting::displayBillingModule(),
            ],
        ]);
    }

    /**
     * Client logout
     */
    public function logout(Request $request)
    {
        // Revoke current token
        $request->user()->currentAccessToken()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out successfully',
        ]);
    }

    /**
     * Revoke all tokens (logout from all devices)
     */
    public function logoutAll(Request $request)
    {
        $request->user()->tokens()->delete();

        return response()->json([
            'success' => true,
            'message' => 'Logged out from all devices successfully',
        ]);
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
        if (!Hash::check($request->current_password, $client->password)) {
            return response()->json([
                'success' => false,
                'message' => 'Current password is incorrect.',
            ], 422);
        }

        // Update password
        $client->password = Hash::make($request->new_password);
        $client->password_changed_at = now();
        $client->save();

        return response()->json([
            'success' => true,
            'message' => 'Password changed successfully. Please login again.',
        ]);
    }
}

