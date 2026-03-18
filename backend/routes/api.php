<?php

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Route;
use Illuminate\Support\Facades\Broadcast;
use App\Http\Controllers\API\ClientAuthController;
use App\Http\Controllers\API\ClientDashboardController;
use App\Http\Controllers\API\ClientNotificationController;
use App\Http\Controllers\API\ClientBillingController;
use App\Http\Controllers\API\ChatController;
use App\Http\Controllers\API\WebhookController;
use App\Http\Controllers\API\TaskManagementAuthController;
use App\Http\Controllers\API\TaskManagementDashboardController;
use App\Http\Controllers\API\TaskManagementTaskController;

// PayMongo webhook (public - verify signature in production)
Route::post('/webhooks/paymongo', [WebhookController::class, 'handlePayMongo']);

// Public routes
Route::prefix('client')->group(function () {
    Route::post('/login', [ClientAuthController::class, 'login']);
});

// Task Management Public routes
Route::prefix('task-management')->group(function () {
    Route::post('/login', [TaskManagementAuthController::class, 'login']);
});

// Broadcasting auth endpoint for API clients
Route::post('/broadcasting/auth', function (Request $request) {
    return Broadcast::auth($request);
})->middleware('auth:sanctum');

// Protected routes
Route::prefix('client')->middleware('auth:sanctum')->group(function () {
    Route::get('/me', [ClientAuthController::class, 'me']);
    Route::post('/logout', [ClientAuthController::class, 'logout']);
    Route::post('/logout-all', [ClientAuthController::class, 'logoutAll']);
    Route::post('/change-password', [ClientAuthController::class, 'changePassword']);
    
    // Dashboard routes
    Route::get('/dashboard/statistics', [ClientDashboardController::class, 'statistics']);
    Route::get('/dashboard/projects', [ClientDashboardController::class, 'projects']);
    Route::get('/dashboard/projects/export', [ClientDashboardController::class, 'exportProjects']);
    
    // Project detail route
    Route::get('/projects/{id}', [ClientDashboardController::class, 'projectDetail']);

    // Task detail route (task-scoped drilldown)
    Route::get('/tasks/{id}', [ClientDashboardController::class, 'taskDetail']);
    
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
    
    // Notification routes
    Route::get('/notifications', [ClientNotificationController::class, 'index']);
    // Route::get('/notifications/unread-count', [ClientNotificationController::class, 'unreadCount']);
    Route::put('/notifications/{id}/read', [ClientNotificationController::class, 'markAsRead']);
    Route::put('/notifications/read-all', [ClientNotificationController::class, 'markAllAsRead']);
    Route::delete('/notifications/{id}', [ClientNotificationController::class, 'destroy']);
    Route::delete('/notifications', [ClientNotificationController::class, 'clearAll']);
    
    // Chat routes
    Route::get('/chat', [ChatController::class, 'getChat']);
    Route::get('/chat/{chatId}/messages', [ChatController::class, 'getMessages']);
    Route::post('/chat/{chatId}/messages', [ChatController::class, 'sendMessage']);
    
    // Billing routes
    // IMPORTANT: Specific routes must come BEFORE parameterized routes
    Route::get('/billings/transactions', [ClientBillingController::class, 'transactions']);
    Route::get('/billings', [ClientBillingController::class, 'index']);
    Route::get('/billings/{id}', [ClientBillingController::class, 'show']);
    Route::post('/billings/{id}/pay', [ClientBillingController::class, 'initiatePayment']);
    Route::get('/billings/{id}/payment-status', [ClientBillingController::class, 'checkPaymentStatus']);
});

// Payment redirect handlers (public routes for PayMongo redirects)
Route::prefix('client')->group(function () {
    Route::get('/payment/checkout-success', [ClientBillingController::class, 'checkoutSuccess']);
    Route::get('/payment/checkout-cancel', [ClientBillingController::class, 'checkoutCancel']);
    Route::get('/payment/return', [ClientBillingController::class, 'paymentReturn']);
    Route::get('/payment/success', [ClientBillingController::class, 'paymentSuccess']);
    Route::get('/payment/failed', [ClientBillingController::class, 'paymentFailed']);
});

// Task Management Protected routes
Route::prefix('task-management')->middleware('auth:sanctum')->group(function () {
    Route::get('/me', [TaskManagementAuthController::class, 'me']);
    Route::put('/profile', [TaskManagementAuthController::class, 'updateProfile']);
    Route::post('/logout', [TaskManagementAuthController::class, 'logout']);
    Route::post('/logout-all', [TaskManagementAuthController::class, 'logoutAll']);
    
    // Dashboard routes
    Route::get('/dashboard/statistics', [TaskManagementDashboardController::class, 'statistics']);
    Route::get('/dashboard/upcoming-tasks', [TaskManagementDashboardController::class, 'upcomingTasks']);
    Route::get('/dashboard/history', [TaskManagementDashboardController::class, 'history']);
    Route::get('/tasks', [TaskManagementDashboardController::class, 'tasks']);
    
    // Task detail routes 
    Route::get('/tasks/{id}', [TaskManagementTaskController::class, 'show']);
    Route::put('/tasks/{id}/status', [TaskManagementTaskController::class, 'updateStatus']);
    
    // Progress updates routes
    Route::get('/tasks/{id}/progress-updates', [TaskManagementTaskController::class, 'progressUpdates']);
    Route::post('/tasks/{id}/progress-updates', [TaskManagementTaskController::class, 'storeProgressUpdate']);
    Route::put('/tasks/{id}/progress-updates/{updateId}', [TaskManagementTaskController::class, 'updateProgressUpdate']);
    Route::delete('/tasks/{id}/progress-updates/{updateId}', [TaskManagementTaskController::class, 'deleteProgressUpdate']);
    Route::get('/tasks/{id}/progress-updates/{updateId}/download', [TaskManagementTaskController::class, 'downloadProgressUpdateFile']);
    
    // Issues routes
    Route::get('/tasks/{id}/issues', [TaskManagementTaskController::class, 'issues']);
    Route::post('/tasks/{id}/issues', [TaskManagementTaskController::class, 'storeIssue']);
    Route::put('/tasks/{id}/issues/{issueId}', [TaskManagementTaskController::class, 'updateIssue']);
    Route::delete('/tasks/{id}/issues/{issueId}', [TaskManagementTaskController::class, 'deleteIssue']);
});

// Default user route (for admin/other users)
Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
