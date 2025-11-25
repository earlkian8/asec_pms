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
    
    // Project detail route
    Route::get('/projects/{id}', [ClientDashboardController::class, 'projectDetail']);
    
    // Request Update routes
    Route::post('/request-update', [ClientDashboardController::class, 'requestUpdate']);
    
    // Progress update file download
    Route::get('/projects/{projectId}/progress-updates/{updateId}/download', [ClientDashboardController::class, 'downloadProgressUpdateFile'])
        ->name('client.progress-updates.download');
    Route::options('/projects/{projectId}/progress-updates/{updateId}/download', function (Request $request) {
        $origin = $request->header('Origin');
        
        $response = response('', 200)
            ->header('Access-Control-Allow-Methods', 'GET, OPTIONS')
            ->header('Access-Control-Allow-Headers', 'Authorization, Content-Type, X-Requested-With, Accept')
            ->header('Access-Control-Max-Age', '3600');
        
        if ($origin) {
            $response->header('Access-Control-Allow-Origin', $origin)
                     ->header('Access-Control-Allow-Credentials', 'true');
        } else {
            $response->header('Access-Control-Allow-Origin', '*');
        }
        
        return $response;
    });
});

// Default user route (for admin/other users)
Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
