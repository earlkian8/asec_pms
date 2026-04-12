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
use App\Http\Controllers\API\TaskManagement\ProjectsController as TaskManagementProjectsController;
use App\Http\Controllers\API\TaskManagement\MilestonesController as TaskManagementMilestonesController;
use App\Http\Controllers\API\TaskManagement\TasksController as TaskManagementTasksController;
use App\Http\Controllers\API\TaskManagement\TeamController as TaskManagementTeamController;
use App\Http\Controllers\API\TaskManagement\PermissionDelegationController as TaskManagementPermissionDelegationController;
use App\Http\Controllers\API\TaskManagement\NotificationController as TaskManagementNotificationController;
use App\Http\Controllers\API\TaskManagement\MaterialAllocationsController as TaskManagementMaterialAllocationsController;

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
    Route::post('/push-token', [ClientAuthController::class, 'updatePushToken']);
    
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
    // Base access to task-management API
    Route::middleware('permission:tm.access')->group(function () {
    Route::get('/me', [TaskManagementAuthController::class, 'me']);
    Route::put('/profile', [TaskManagementAuthController::class, 'updateProfile']);
    Route::post('/logout', [TaskManagementAuthController::class, 'logout']);
    Route::post('/logout-all', [TaskManagementAuthController::class, 'logoutAll']);
    
    // Dashboard routes
    Route::get('/dashboard/statistics', [TaskManagementDashboardController::class, 'statistics'])->middleware('permission:tm.tasks.view');
    Route::get('/dashboard/upcoming-tasks', [TaskManagementDashboardController::class, 'upcomingTasks'])->middleware('permission:tm.tasks.view');
    Route::get('/dashboard/history', [TaskManagementDashboardController::class, 'history'])->middleware('permission:tm.tasks.view');
    Route::get('/tasks', [TaskManagementDashboardController::class, 'tasks'])->middleware('permission:tm.tasks.view');
    
    // Task detail routes 
    Route::get('/tasks/{id}', [TaskManagementTaskController::class, 'show'])->middleware('permission:tm.tasks.view');
    Route::put('/tasks/{id}/status', [TaskManagementTaskController::class, 'updateStatus'])->middleware('permission:tm.tasks.update-status');
    
    // Progress updates routes
    Route::get('/tasks/{id}/progress-updates', [TaskManagementTaskController::class, 'progressUpdates'])->middleware('permission:tm.progress-updates.view');
    Route::post('/tasks/{id}/progress-updates/tickets', [TaskManagementTaskController::class, 'createProgressUpdateUploadTicket'])->middleware('permission:tm.progress-updates.create');
    Route::post('/tasks/{id}/progress-updates/finalize', [TaskManagementTaskController::class, 'finalizeProgressUpdate'])->middleware('permission:tm.progress-updates.create');
    Route::get('/tasks/{id}/progress-updates/{updateId}/download-url', [TaskManagementTaskController::class, 'progressUpdateDownloadUrl'])->middleware('permission:tm.files.download');
    Route::post('/tasks/{id}/progress-updates', [TaskManagementTaskController::class, 'storeProgressUpdate'])->middleware('permission:tm.progress-updates.create');
    Route::post('/tasks/{id}/progress-updates/{updateId}', [TaskManagementTaskController::class, 'updateProgressUpdate'])->middleware('permission:tm.progress-updates.update-own');
    Route::delete('/tasks/{id}/progress-updates/{updateId}', [TaskManagementTaskController::class, 'deleteProgressUpdate'])->middleware('permission:tm.progress-updates.delete-own');
    Route::get('/tasks/{id}/progress-updates/{updateId}/download', [TaskManagementTaskController::class, 'downloadProgressUpdateFile'])->middleware('permission:tm.files.download');
    
    // Issues routes
    Route::get('/tasks/{id}/issues', [TaskManagementTaskController::class, 'issues'])->middleware('permission:tm.issues.view');
    Route::post('/tasks/{id}/issues', [TaskManagementTaskController::class, 'storeIssue'])->middleware('permission:tm.issues.create');
    Route::put('/tasks/{id}/issues/{issueId}', [TaskManagementTaskController::class, 'updateIssue'])->middleware('permission:tm.issues.update-own');
    Route::delete('/tasks/{id}/issues/{issueId}', [TaskManagementTaskController::class, 'deleteIssue'])->middleware('permission:tm.issues.delete-own');

    // Request updates (view-only)
    Route::get('/tasks/{id}/request-updates', [TaskManagementTaskController::class, 'requestUpdates'])->middleware('permission:tm.tasks.view');

    // Engineer / project-scoped management
    Route::get('/projects', [TaskManagementProjectsController::class, 'index'])->middleware('permission:tm.projects.view-assigned');
    Route::get('/projects/{project}', [TaskManagementProjectsController::class, 'show'])->middleware('permission:tm.projects.view-assigned');

    // Milestones (project-scoped)
    Route::get('/projects/{project}/milestones', [TaskManagementMilestonesController::class, 'index'])->middleware('permission:tm.milestones.manage');
    Route::post('/projects/{project}/milestones', [TaskManagementMilestonesController::class, 'store'])->middleware('permission:tm.milestones.manage');
    Route::put('/projects/{project}/milestones/{milestone}', [TaskManagementMilestonesController::class, 'update'])->middleware('permission:tm.milestones.manage');
    Route::delete('/projects/{project}/milestones/{milestone}', [TaskManagementMilestonesController::class, 'destroy'])->middleware('permission:tm.milestones.manage');
    // Milestone material usages
    Route::post('/projects/{project}/milestones/{milestone}/material-usage', [TaskManagementMilestonesController::class, 'storeMaterialUsage'])->middleware('permission:milestone-material-usage.create');
    Route::put('/projects/{project}/milestones/{milestone}/material-usage/{usage}', [TaskManagementMilestonesController::class, 'updateMaterialUsage'])->middleware('permission:milestone-material-usage.update');
    Route::delete('/projects/{project}/milestones/{milestone}/material-usage/{usage}', [TaskManagementMilestonesController::class, 'destroyMaterialUsage'])->middleware('permission:milestone-material-usage.delete');

    // Tasks (milestone-scoped, but project access enforced via milestone->project)
    Route::get('/milestones/{milestone}/tasks', [TaskManagementTasksController::class, 'index'])->middleware('permission:tm.tasks.manage');
    Route::post('/milestones/{milestone}/tasks', [TaskManagementTasksController::class, 'store'])->middleware('permission:tm.tasks.manage');
    Route::put('/milestones/{milestone}/tasks/{task}', [TaskManagementTasksController::class, 'update'])->middleware('permission:tm.tasks.manage');
    Route::delete('/milestones/{milestone}/tasks/{task}', [TaskManagementTasksController::class, 'destroy'])->middleware('permission:tm.tasks.manage');

    // Team management (project-scoped)
    Route::get('/projects/{project}/team', [TaskManagementTeamController::class, 'index'])->middleware('permission:tm.team.view');
    Route::get('/projects/{project}/team/assignables', [TaskManagementTeamController::class, 'assignables'])->middleware('permission:tm.team.assign');
    Route::post('/projects/{project}/team', [TaskManagementTeamController::class, 'store'])->middleware('permission:tm.team.assign');
    Route::put('/projects/{project}/team/{projectTeam}', [TaskManagementTeamController::class, 'update'])->middleware('permission:tm.team.assign');
    Route::put('/projects/{project}/team/{projectTeam}/status', [TaskManagementTeamController::class, 'updateStatus'])->middleware('permission:tm.team.reactivate');
    Route::delete('/projects/{project}/team/{projectTeam}', [TaskManagementTeamController::class, 'release'])->middleware('permission:tm.team.release');
    Route::delete('/projects/{project}/team/{projectTeam}/force-remove', [TaskManagementTeamController::class, 'forceRemove'])->middleware('permission:tm.team.force-remove');

    // Permission delegation — only non-delegated users (original authority) may delegate
    // Fix #1 + #7: route-level guard using tm.permissions.delegate
    Route::middleware('permission:tm.permissions.delegate')->group(function () {
        Route::get('/permissions/granted-users', [TaskManagementPermissionDelegationController::class, 'grantedUsers']);
        Route::get('/permissions/eligible-users', [TaskManagementPermissionDelegationController::class, 'eligibleUsers']);
        Route::post('/permissions/grant', [TaskManagementPermissionDelegationController::class, 'grant']);
        Route::post('/permissions/update-modules', [TaskManagementPermissionDelegationController::class, 'updateModules']);
        Route::post('/permissions/revoke', [TaskManagementPermissionDelegationController::class, 'revoke']);
    });

    // Notifications
    Route::get('/notifications', [TaskManagementNotificationController::class, 'index']);
    Route::get('/notifications/unread-count', [TaskManagementNotificationController::class, 'unreadCount']);
    Route::put('/notifications/{id}/read', [TaskManagementNotificationController::class, 'markAsRead']);
    Route::put('/notifications/read-all', [TaskManagementNotificationController::class, 'markAllAsRead']);

    // Material allocations (project-scoped)
    Route::get('/projects/{project}/material-allocations', [TaskManagementMaterialAllocationsController::class, 'index'])->middleware('permission:tm.projects.view-assigned');
    Route::post('/projects/{project}/material-allocations/{allocation}/receiving-report', [TaskManagementMaterialAllocationsController::class, 'storeReceivingReport'])->middleware('permission:material-allocations.receiving-report');
    });
});

// Default user route (for admin/other users)
Route::get('/user', function (Request $request) {
    return $request->user();
})->middleware('auth:sanctum');
