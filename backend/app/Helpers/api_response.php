<?php

use Illuminate\Http\JsonResponse;

if (! function_exists('api_success')) {
    /**
     * Return a consistent JSON success response for API endpoints.
     *
     * @param  array<string, mixed>|object  $data
     */
    function api_success($data, ?string $message = null, int $status = 200): JsonResponse
    {
        $payload = [
            'success' => true,
            'data' => $data,
        ];
        if ($message !== null) {
            $payload['message'] = $message;
        }

        return response()->json($payload, $status);
    }
}

if (! function_exists('api_error')) {
    /**
     * Return a consistent JSON error response for API endpoints.
     *
     * @param  array<string, mixed>|null  $errors
     */
    function api_error(string $message, $errors = null, int $status = 400): JsonResponse
    {
        $payload = [
            'success' => false,
            'message' => $message,
        ];
        if ($errors !== null) {
            $payload['errors'] = $errors;
        }

        return response()->json($payload, $status);
    }
}
