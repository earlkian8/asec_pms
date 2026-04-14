<?php

use App\Http\Controllers\Admin\ActivityLogsController;
use App\Http\Controllers\Admin\ClientsController;
use App\Http\Controllers\Admin\ClientTypesController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\EmployeesController;
use App\Http\Controllers\Admin\ProjectFilesController;
use App\Http\Controllers\Admin\MilestoneMaterialUsagesController;
use App\Http\Controllers\Admin\ProjectBoqController;
use App\Http\Controllers\Admin\ProjectMilestonesController;
use App\Http\Controllers\Admin\ProjectsController;
use App\Http\Controllers\Admin\ProjectTasksController;
use App\Http\Controllers\Admin\ProjectTeamsController;
use App\Http\Controllers\Admin\ProjectTypesController;
use App\Http\Controllers\Admin\ProgressUpdatesController;
use App\Http\Controllers\Admin\ProjectIssuesController;
use App\Http\Controllers\Admin\ProjectMaterialAllocationsController;
use App\Http\Controllers\Admin\ProjectLaborCostsController;
use App\Http\Controllers\Admin\ProjectMiscellaneousExpensesController;
use App\Http\Controllers\Admin\DirectSuppliesController;
use App\Http\Controllers\Admin\InventoryItemsController;
use App\Http\Controllers\Admin\BillingsController;
use App\Http\Controllers\Admin\ReportsController;
use App\Http\Controllers\Admin\RolesController;
use App\Http\Controllers\Admin\UsersController;
use App\Http\Controllers\Admin\NotificationController;
use App\Http\Controllers\Admin\ChatController;
use App\Http\Controllers\Admin\ClientUpdateRequestViewController;
use App\Http\Controllers\Admin\TrashBinController;
use App\Http\Controllers\ProfileController;
use App\Models\ActivityLogs;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;

Route::get('/', function(){
    return redirect()->route('login');
});

Route::get('/dashboard', [DashboardController::class, 'index'])->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    
    // Project Management
    Route::prefix('project-management')->name('project-management.')->group(function(){
        Route::get('/', [ProjectsController::class, 'index'])->middleware('permission:projects.view')->name('index');
        Route::post('/store', [ProjectsController::class, 'store'])->middleware('permission:projects.create')->name('store');
        Route::put('/update/{project}', [ProjectsController::class, 'update'])->middleware('permission:projects.update')->name('update');
        Route::delete('/delete/{project}', [ProjectsController::class, 'destroy'])->middleware('permission:projects.delete')->name('destroy');
        Route::get('/view/{project}', [ProjectsController::class, 'show'])->middleware('permission:projects.view')->name('view');
        Route::get('/document/{project}/{field}', [ProjectsController::class, 'serveDocument'])->middleware('permission:projects.view')->name('document'); 
        Route::get('/project-management/archived', [ProjectsController::class, 'archived'])->middleware('permission:projects.archive')->name('archived');
        Route::post('/project-management/{project}/archive', [ProjectsController::class, 'archive'])->middleware('permission:projects.archive')->name('archive');
        Route::post('/project-management/{project}/unarchive', [ProjectsController::class, 'unarchive'])->middleware('permission:projects.archive')->name('unarchive');
        // Project Teams
        Route::prefix('project-teams')->name('project-teams.')->group(function(){
            Route::post('/store/{project}', [ProjectTeamsController::class, 'store'])
                ->middleware('permission:project-teams.create')
                ->name('store');

            Route::post('/delete/{project}/{projectTeam?}', [ProjectTeamsController::class, 'destroy'])
                ->middleware('permission:project-teams.delete')
                ->name('destroy');

            Route::put('/update-status/{project}/team/{projectTeam}', [ProjectTeamsController::class, 'handleStatus'])
                ->middleware('permission:project-teams.update')
                ->name('update-status');

            Route::put('/update/{project}/team/{projectTeam}', [ProjectTeamsController::class, 'update'])
                ->middleware('permission:project-teams.update')
                ->name('update');

            Route::delete('/force-remove/{project}/{projectTeam?}', [ProjectTeamsController::class, 'forceRemove'])
                ->middleware('permission:project-teams.delete')
                ->name('force-remove');

            Route::put('/bulk-status/{project}', [ProjectTeamsController::class, 'bulkStatus'])
                ->middleware('permission:project-teams.update')
                ->name('bulk-status');

            Route::get('/history', [ProjectTeamsController::class, 'history'])
                ->middleware('permission:project-teams.view')
                ->name('history');

            Route::get('/status-logs/{project}/team/{projectTeam}', [ProjectTeamsController::class, 'statusLogs'])
                ->middleware('permission:project-teams.view')
                ->name('status-logs');
        });

        // Project Files
        Route::prefix('project-files')->name('project-files.')->group(function(){
            Route::post('/store/{project}', [ProjectFilesController::class, 'store'])->middleware('permission:project-files.upload')->name('store');
            Route::put('/update/{project}/files/{file}', [ProjectFilesController::class, 'update'])->middleware('permission:project-files.update')->name('update');
            Route::delete('/destroy/{project}/files/{file?}', [ProjectFilesController::class, 'destroy'])->middleware('permission:project-files.delete')->name('destroy');
            Route::get('/download/{project}/files/{file}', [ProjectFilesController::class, 'download'])->middleware('permission:project-files.download')->name('download');
        });

        // Project BOQ
        Route::prefix('project-boq')->name('project-boq.')->group(function(){
            Route::post('/store/{project}', [ProjectBoqController::class, 'storeBulk'])->middleware('permission:project-boq.create')->name('store');
            Route::post('/sections/{project}', [ProjectBoqController::class, 'storeSection'])->middleware('permission:project-boq.create')->name('sections.store');
            Route::put('/sections/{project}/section/{section}', [ProjectBoqController::class, 'updateSection'])->middleware('permission:project-boq.update')->name('sections.update');
            Route::delete('/sections/{project}/section/{section}', [ProjectBoqController::class, 'destroySection'])->middleware('permission:project-boq.delete')->name('sections.destroy');
            Route::post('/items/{project}/section/{section}', [ProjectBoqController::class, 'storeItem'])->middleware('permission:project-boq.create')->name('items.store');
            Route::put('/items/{project}/item/{item}', [ProjectBoqController::class, 'updateItem'])->middleware('permission:project-boq.update')->name('items.update');
            Route::delete('/items/{project}/item/{item}', [ProjectBoqController::class, 'destroyItem'])->middleware('permission:project-boq.delete')->name('items.destroy');
            Route::get('/export/{project}', [ProjectBoqController::class, 'export'])->middleware('permission:project-boq.view')->name('export');
        });

        // Project Milestones
        Route::prefix('project-milestones')->name('project-milestones.')->group(function(){
            Route::post('/store/{project}', [ProjectMilestonesController::class, 'store'])->middleware('permission:project-milestones.create')->name('store');
            Route::put('/update/{project}/milestone/{milestone}', [ProjectMilestonesController::class, 'update'])->middleware('permission:project-milestones.update')->name('update');
            Route::delete('/destroy/{project}/milestone/{milestone}', [ProjectMilestonesController::class, 'destroy'])->middleware('permission:project-milestones.delete')->name('destroy');
            Route::get('/export-pdf/{project}', [ProjectMilestonesController::class, 'exportPdf'])->middleware('permission:project-milestones.view')->name('export-pdf');
            // Milestone Material Usages
            Route::post('/material-usage/{project}/milestone/{milestone}', [MilestoneMaterialUsagesController::class, 'store'])->middleware('permission:milestone-material-usage.create')->name('material-usage.store');
            Route::put('/material-usage/{project}/milestone/{milestone}/usage/{usage}', [MilestoneMaterialUsagesController::class, 'update'])->middleware('permission:milestone-material-usage.update')->name('material-usage.update');
            Route::delete('/material-usage/{project}/milestone/{milestone}/usage/{usage}', [MilestoneMaterialUsagesController::class, 'destroy'])->middleware('permission:milestone-material-usage.delete')->name('material-usage.destroy');
        });

        // Project Tasks
        Route::prefix('project-tasks')->name('project-tasks.')->group(function(){
            Route::post('/store', [ProjectTasksController::class, 'store'])->middleware('permission:project-tasks.create')->name('store');
            Route::put('/update/{milestone}/task/{task}', [ProjectTasksController::class, 'update'])->middleware('permission:project-tasks.update')->name('update');
            Route::put('/update-status/{milestone}/task/{task}', [ProjectTasksController::class, 'updateStatus'])->middleware('permission:project-tasks.update-status')->name('update-status');
            Route::delete('/destroy/{milestone}/task/{task}', [ProjectTasksController::class, 'destroy'])->middleware('permission:project-tasks.delete')->name('destroy');
        });

        // Progress Updates
        Route::prefix('progress-updates')->name('progress-updates.')->group(function(){
            Route::post('/store', [ProgressUpdatesController::class, 'store'])->middleware('permission:progress-updates.create')->name('store');
            Route::put('/update/{milestone}/task/{task}/update/{progressUpdate}', [ProgressUpdatesController::class, 'update'])->middleware('permission:progress-updates.update')->name('update');
            Route::delete('/destroy/{milestone}/task/{task}/update/{progressUpdate}', [ProgressUpdatesController::class, 'destroy'])->middleware('permission:progress-updates.delete')->name('destroy');
            Route::get('/download/{milestone}/task/{task}/update/{progressUpdate}', [ProgressUpdatesController::class, 'download'])->middleware('permission:progress-updates.view')->name('download');
        });

        // Project Issues
        Route::prefix('project-issues')->name('project-issues.')->group(function(){
            Route::post('/store', [ProjectIssuesController::class, 'store'])->middleware('permission:project-issues.create')->name('store');
            Route::put('/update/{project}/issue/{issue}', [ProjectIssuesController::class, 'update'])->middleware('permission:project-issues.update')->name('update');
            Route::delete('/destroy/{project}/issue/{issue}', [ProjectIssuesController::class, 'destroy'])->middleware('permission:project-issues.delete')->name('destroy');
        });

        // Material Allocations
        Route::prefix('material-allocations')->name('material-allocations.')->group(function(){
            Route::post('/receiving-report/{project}/allocation/{allocation}', [ProjectMaterialAllocationsController::class, 'storeReceivingReport'])->middleware('permission:material-allocations.receiving-report')->name('store-receiving-report');
            Route::put('/receiving-report/{project}/allocation/{allocation}/report/{receivingReport}', [ProjectMaterialAllocationsController::class, 'updateReceivingReport'])->middleware('permission:material-allocations.update')->name('update-receiving-report');
            Route::delete('/receiving-report/{project}/allocation/{allocation}/report/{receivingReport}', [ProjectMaterialAllocationsController::class, 'destroyReceivingReport'])->middleware('permission:material-allocations.delete')->name('destroy-receiving-report');
            Route::delete('/{project}/allocation/{allocation}', [ProjectMaterialAllocationsController::class, 'destroy'])->middleware('permission:material-allocations.delete')->name('destroy');
            Route::post('/bulk-receiving-report/{project}', [ProjectMaterialAllocationsController::class, 'bulkReceivingReport'])->middleware('permission:material-allocations.receiving-report')->name('bulk-receiving-report');
        });

        // Labor Costs
        Route::prefix('labor-costs')->name('labor-costs.')->group(function(){
            Route::post('/store/{project}', [ProjectLaborCostsController::class, 'store'])->middleware('permission:labor-costs.create')->name('store');
            Route::put('/update/{project}/cost/{laborCost}', [ProjectLaborCostsController::class, 'update'])->middleware('permission:labor-costs.update')->name('update');
            Route::put('/submit/{project}/cost/{laborCost}', [ProjectLaborCostsController::class, 'submit'])->middleware('permission:labor-costs.update')->name('submit');
            Route::delete('/destroy/{project}/cost/{laborCost}', [ProjectLaborCostsController::class, 'destroy'])->middleware('permission:labor-costs.delete')->name('destroy');
        });

        // Miscellaneous Expenses
        Route::prefix('miscellaneous-expenses')->name('miscellaneous-expenses.')->group(function(){
            Route::post('/store/{project}', [ProjectMiscellaneousExpensesController::class, 'store'])->middleware('permission:miscellaneous-expenses.create')->name('store');
            Route::put('/update/{project}/expense/{expense}', [ProjectMiscellaneousExpensesController::class, 'update'])->middleware('permission:miscellaneous-expenses.update')->name('update');
            Route::delete('/destroy/{project}/expense/{expense}', [ProjectMiscellaneousExpensesController::class, 'destroy'])->middleware('permission:miscellaneous-expenses.delete')->name('destroy');
        });

        // Request Updates
        Route::prefix('request-updates')->name('request-updates.')->group(function(){
            Route::delete('/delete/{project}/{clientUpdateRequest}', [ProjectsController::class, 'destroyRequestUpdate'])->middleware('permission:projects.delete')->name('destroy');
        }); 

        Route::prefix('client-update-requests')->name('client-update-requests.')->group(function(){
            // Mark a single request as viewed
            Route::post('{clientUpdateRequest}/mark-viewed', [ClientUpdateRequestViewController::class, 'markViewed'])
                ->middleware('permission:projects.update')
                ->name('mark-viewed');
            
            // Bulk-mark multiple requests as viewed (used by TaskDetailModal on tab open)
            Route::post('mark-viewed-bulk', [ClientUpdateRequestViewController::class, 'markViewedBulk'])
                ->middleware('permission:projects.update')
                ->name('mark-viewed-bulk');
        });
    });

    // Employee Management
    Route::prefix('employee-management')->name('employee-management.')->group(function(){
        Route::get('/', [EmployeesController::class, 'index'])->middleware('permission:employees.view')->name('index');
        Route::post('/store', [EmployeesController::class, 'store'])->middleware('permission:employees.create')->name('store');
        Route::put('/update/{employee}', [EmployeesController::class, 'update'])->middleware('permission:employees.update')->name('update');
        Route::delete('/delete/{employee}', [EmployeesController::class, 'destroy'])->middleware('permission:employees.delete')->name('destroy');
        Route::put('/update-status/{employee}', [EmployeesController::class, 'handleStatus'])->middleware('permission:employees.update-status')->name('update-status');
    });
    // Project Type Management
    Route::prefix('project-type-management')->name('project-type-management.')->group(function(){
        Route::get('/', [ProjectTypesController::class, 'index'])->middleware('permission:projects.view')->name('index');
        Route::post('/store', [ProjectTypesController::class, 'store'])->middleware('permission:projects.create')->name('store');
        Route::put('/update/{projectType}', [ProjectTypesController::class, 'update'])->middleware('permission:projects.update')->name('update');
        Route::delete('/delete/{projectType}', [ProjectTypesController::class, 'destroy'])->middleware('permission:projects.delete')->name('destroy');
        Route::put('/update-status/{projectType}', [ProjectTypesController::class, 'handleStatus'])->middleware('permission:projects.update')->name('update-status');
    });

    // Client Type Management
    Route::prefix('client-type-management')->name('client-type-management.')->group(function(){
        Route::get('/', [ClientTypesController::class, 'index'])->middleware('permission:clients.view')->name('index');
        Route::post('/store', [ClientTypesController::class, 'store'])->middleware('permission:clients.create')->name('store');
        Route::put('/update/{clientType}', [ClientTypesController::class, 'update'])->middleware('permission:clients.update')->name('update');
        Route::delete('/delete/{clientType}', [ClientTypesController::class, 'destroy'])->middleware('permission:clients.delete')->name('destroy');
        Route::put('/update-status/{clientType}', [ClientTypesController::class, 'handleStatus'])->middleware('permission:clients.update')->name('update-status');
    });

    // Client Management
    Route::prefix('client-management')->name('client-management.')->group(function(){
        Route::get('/', [ClientsController::class, 'index'])->middleware('permission:clients.view')->name('index');
        Route::post('/store', [ClientsController::class, 'store'])->middleware('permission:clients.create')->name('store');
        Route::put('/update/{client}', [ClientsController::class, 'update'])->middleware('permission:clients.update')->name('update');
        Route::delete('/delete/{client}', [ClientsController::class, 'destroy'])->middleware('permission:clients.delete')->name('destroy');
        Route::put('/update-status/{client}', [ClientsController::class, 'handleStatus'])->middleware('permission:clients.update-status')->name('update-status');
        Route::patch('/reset-password/{client}', [ClientsController::class, 'resetPassword'])->middleware('permission:clients.update')->name('reset-password');
        Route::post('/send-credentials/{client}', [ClientsController::class, 'sendCredentials'])->middleware('permission:clients.update')->name('send-credentials');
    });
    // Reports & Analytics
    Route::prefix('reports')->name('reports.')->group(function(){
        Route::get('/', [ReportsController::class, 'index'])->middleware('permission:reports.view')->name('index');
        Route::get('/export/project-performance', [ReportsController::class, 'exportProjectPerformance'])->middleware('permission:reports.view')->name('export.project-performance');
        Route::get('/export/financial', [ReportsController::class, 'exportFinancial'])->middleware('permission:reports.view')->name('export.financial');
        Route::get('/export/client', [ReportsController::class, 'exportClient'])->middleware('permission:reports.view')->name('export.client');
        Route::get('/export/inventory', [ReportsController::class, 'exportInventory'])->middleware('permission:reports.view')->name('export.inventory');
        Route::get('/export/team-productivity', [ReportsController::class, 'exportTeamProductivity'])->middleware('permission:reports.view')->name('export.team-productivity');
        Route::get('/export/budget', [ReportsController::class, 'exportBudget'])->middleware('permission:reports.view')->name('export.budget');
        Route::get('/export/all', [ReportsController::class, 'exportAll'])->middleware('permission:reports.view')->name('export.all');
    });

    // User Management
    Route::prefix('user-management')->name('user-management.')->group(function () {

        // Roles & Permissions
        Route::prefix('roles-and-permissions')->name('roles-and-permissions.')->group(function(){
            Route::get('/', [RolesController::class, 'index'])->middleware('permission:roles.view')->name('index');
            Route::post('/store', [RolesController::class, 'store'])->middleware('permission:roles.create')->name('store');
            Route::get('/edit/{role}', [RolesController::class, 'edit'])->middleware('permission:roles.update')->name('edit');
            Route::put('/update/{role}', [RolesController::class, 'update'])->middleware('permission:roles.update')->name('update');
            Route::delete('/destroy/{role}', [RolesController::class, 'destroy'])->middleware('permission:roles.delete')->name('destroy');
        });
        // Users
        Route::prefix('users')->name('users.')->group(function(){
            Route::get('/', [UsersController::class, 'index'])->middleware('permission:users.view')->name('index');
            Route::post('/store', [UsersController::class, 'store'])->middleware('permission:users.create')->name('store');
            Route::put('/update/{user}', [UsersController::class, 'update'])->middleware('permission:users.update')->name('update');
            Route::patch('/reset-password/{user}', [UsersController::class, 'resetPassword'])->middleware('permission:users.reset-password')->name('reset-password');
            Route::post('/send-credentials/{user}', [UsersController::class, 'sendCredentials'])->middleware('permission:users.update')->name('send-credentials');
            Route::delete('/destroy/{user}', [UsersController::class, 'destroy'])->middleware('permission:users.delete')->name('destroy');
        });
        // Activity Logs
        Route::prefix('activity-logs')->name('activity-logs.')->group(function(){
            Route::get('/', [ActivityLogsController::class, 'index'])->middleware('permission:activity-logs.view')->name('index');
        });

        // Trash Bin
        Route::prefix('trash-bin')->name('trash-bin.')->group(function () {
            Route::get('/', [TrashBinController::class, 'index'])->middleware('permission:trash-bin.view')->name('index');
            Route::post('/restore', [TrashBinController::class, 'restore'])->middleware('permission:trash-bin.restore')->name('restore');
            Route::delete('/force-delete', [TrashBinController::class, 'forceDelete'])->middleware('permission:trash-bin.force-delete')->name('force-delete');
        });
    });

    // Direct Supply Management
    Route::prefix('direct-supply-management')->name('direct-supply-management.')->group(function(){
        Route::get('/', [DirectSuppliesController::class, 'index'])->middleware('permission:direct-supply.view')->name('index');
        Route::post('/store', [DirectSuppliesController::class, 'store'])->middleware('permission:direct-supply.create')->name('store');
        Route::put('/update/{directSupply}', [DirectSuppliesController::class, 'update'])->middleware('permission:direct-supply.update')->name('update');
        Route::delete('/destroy/{directSupply}', [DirectSuppliesController::class, 'destroy'])->middleware('permission:direct-supply.delete')->name('destroy');
        Route::put('/update-status/{directSupply}', [DirectSuppliesController::class, 'updateStatus'])->middleware('permission:direct-supply.update')->name('update-status');
        Route::post('/allocate/{directSupply}', [DirectSuppliesController::class, 'allocate'])->middleware('permission:direct-supply.allocate')->name('allocate');
        Route::put('/archive/{directSupply}', [DirectSuppliesController::class, 'archive'])->middleware('permission:direct-supply.delete')->name('archive');
        Route::put('/restore/{directSupply}', [DirectSuppliesController::class, 'restore'])->middleware('permission:direct-supply.update')->name('restore');
    });

    // Inventory Management
    Route::prefix('inventory-management')->name('inventory-management.')->group(function(){
        Route::get('/', [InventoryItemsController::class, 'index'])->middleware('permission:inventory.view')->name('index');
        Route::get('/transactions', [InventoryItemsController::class, 'transactions'])->middleware('permission:inventory.view')->name('transactions');
        Route::post('/store', [InventoryItemsController::class, 'store'])->middleware('permission:inventory.create')->name('store');
        Route::put('/update/{inventoryItem}', [InventoryItemsController::class, 'update'])->middleware('permission:inventory.update')->name('update');
        Route::delete('/destroy/{inventoryItem}', [InventoryItemsController::class, 'destroy'])->middleware('permission:inventory.delete')->name('destroy');
        Route::post('/stock-in/{inventoryItem}', [InventoryItemsController::class, 'stockIn'])->middleware('permission:inventory.stock-in')->name('stock-in');
        Route::post('/stock-out/{inventoryItem}', [InventoryItemsController::class, 'stockOut'])->middleware('permission:inventory.stock-out')->name('stock-out');
        Route::put('/update-status/{inventoryItem}', [InventoryItemsController::class, 'updateStatus'])->middleware('permission:inventory.update')->name('update-status');
        Route::get('/archived', [InventoryItemsController::class, 'archived'])->middleware('permission:inventory.archive')->name('archived');
        Route::put('/{inventoryItem}/archive', [InventoryItemsController::class, 'archive'])->middleware('permission:inventory.archive')->name('archive');
        Route::put('/{inventoryItem}/restore', [InventoryItemsController::class, 'restore'])->middleware('permission:inventory.update')->name('restore');
    });

    // Billing Management
    Route::prefix('billing-management')->name('billing-management.')->group(function(){
        Route::get('/', [BillingsController::class, 'index'])->middleware('permission:billing.view')->name('index');
        Route::post('/store', [BillingsController::class, 'store'])->middleware('permission:billing.create')->name('store');
        Route::put('/update/{billing}', [BillingsController::class, 'update'])->middleware('permission:billing.update')->name('update');
        Route::delete('/destroy/{billing}', [BillingsController::class, 'destroy'])->middleware('permission:billing.delete')->name('destroy');
        Route::get('/view/{billing}', [BillingsController::class, 'show'])->middleware('permission:billing.view')->name('show');
        Route::post('/payment/{billing}', [BillingsController::class, 'addPayment'])->middleware('permission:billing.add-payment')->name('add-payment');
        Route::post('/archive/{billing}', [BillingsController::class, 'archive'])->middleware('permission:billing.archive')->name('archive');
        Route::post('/unarchive/{billing}', [BillingsController::class, 'unarchive'])->middleware('permission:billing.archive')->name('unarchive');
        Route::get('/archived', [BillingsController::class, 'archived'])->middleware('permission:billing.view')->name('archived');
        Route::put('/client-portal-billing-display', [BillingsController::class, 'updateClientPortalBillingDisplay'])->middleware('permission:billing.update')->name('client-portal-billing-display');
    });

    // Notifications
    Route::prefix('notifications')->name('notifications.')->group(function(){
        Route::get('/', [NotificationController::class, 'index'])->name('index');
        Route::get('/unread-count', [NotificationController::class, 'unreadCount'])->name('unread-count');
        Route::get('/counts-by-type', [NotificationController::class, 'countsByType'])->name('counts-by-type');
        Route::put('/{notification}/read', [NotificationController::class, 'markAsRead'])->name('mark-as-read');
        Route::put('/mark-all-read', [NotificationController::class, 'markAllAsRead'])->name('mark-all-read');
        Route::put('/mark-by-type-read', [NotificationController::class, 'markByTypeAsRead'])->name('mark-by-type-read');
        Route::delete('/{notification}', [NotificationController::class, 'destroy'])->name('destroy');
    });

    // Chat Management
    Route::prefix('chat')->name('chat.')->group(function(){
        Route::get('/', [ChatController::class, 'index'])->name('index');
        Route::get('/{chatId}', [ChatController::class, 'show'])->name('show');
        Route::get('/{chatId}/messages', [ChatController::class, 'getMessages'])->name('messages');
        Route::post('/{chatId}/messages', [ChatController::class, 'sendMessage'])->name('send-message');
    });
});