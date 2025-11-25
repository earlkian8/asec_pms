<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use App\Http\Controllers\Api\ClientAuthController;
use App\Http\Controllers\Api\ClientDashboardController;

// Public routes
Route::prefix('client')->group(function () {
    Route::post('/login', [ClientAuthController::class, 'login']);
});

// Protected routes
Route::prefix('client')->middleware('auth:sanctum')->group(function () {
    Route::get('/me', [ClientAuthController::class, 'me']);
    Route::post('/logout', [ClientAuthController::class, 'logout']);
    Route::post('/logout-all', [ClientAuthController::class, 'logoutAll']);
    
    // Dashboard routes
    Route::get('/dashboard/statistics', [ClientDashboardController::class, 'statistics']);
    Route::get('/dashboard/projects', [ClientDashboardController::class, 'projects']);
    Route::get('/dashboard/projects/export', [ClientDashboardController::class, 'exportProjects']);
});

// Default user route (for admin/other users)
Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
