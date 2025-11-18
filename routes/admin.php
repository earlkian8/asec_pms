<?php

use App\Http\Controllers\Admin\ActivityLogsController;
use App\Http\Controllers\Admin\ClientsController;
use App\Http\Controllers\Admin\DashboardController;
use App\Http\Controllers\Admin\EmployeesController;
use App\Http\Controllers\Admin\ProjectFilesController;
use App\Http\Controllers\Admin\ProjectMilestonesController;
use App\Http\Controllers\Admin\ProjectsController;
use App\Http\Controllers\Admin\ProjectTasksController;
use App\Http\Controllers\Admin\ProjectTeamsController;
use App\Http\Controllers\Admin\ProgressUpdatesController;
use App\Http\Controllers\Admin\ProjectIssuesController;
use App\Http\Controllers\Admin\ProjectMaterialAllocationsController;
use App\Http\Controllers\Admin\ProjectLaborCostsController;
use App\Http\Controllers\Admin\InventoryItemsController;
use App\Http\Controllers\Admin\BillingsController;
use App\Http\Controllers\Admin\ReportsController;
use App\Http\Controllers\Admin\RolesController;
use App\Http\Controllers\Admin\UsersController;
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
        
        // Project Teams
        Route::prefix('project-teams')->name('project-teams.')->group(function(){
            Route::post('/store/{project}', [ProjectTeamsController::class, 'store'])->middleware('permission:project-teams.create')->name('store');
            Route::post('/delete/{project}/{projectTeam?}', [ProjectTeamsController::class, 'destroy'])->middleware('permission:project-teams.delete')->name('destroy');
            Route::put('/update-status/{project}/team/{projectTeam}', [ProjectTeamsController::class, 'handleStatus'])->middleware('permission:project-teams.update')->name('update-status');
            Route::put('/update/{project}/team/{projectTeam}', [ProjectTeamsController::class, 'update'])->middleware('permission:project-teams.update')->name('update');
        });

        // Project Files
        Route::prefix('project-files')->name('project-files.')->group(function(){
            Route::post('/store/{project}', [ProjectFilesController::class, 'store'])->middleware('permission:project-files.upload')->name('store');
            Route::put('/update/{project}/files/{file}', [ProjectFilesController::class, 'update'])->middleware('permission:project-files.update')->name('update');
            Route::delete('/destroy/{project}/files/{file?}', [ProjectFilesController::class, 'destroy'])->middleware('permission:project-files.delete')->name('destroy');
            Route::get('/download/{project}/files/{file}', [ProjectFilesController::class, 'download'])->middleware('permission:project-files.download')->name('download');
        });

        // Project Milestones
        Route::prefix('project-milestones')->name('project-milestones.')->group(function(){
            Route::post('/store/{project}', [ProjectMilestonesController::class, 'store'])->middleware('permission:project-milestones.create')->name('store');
            Route::put('/update/{project}/milestone/{milestone}', [ProjectMilestonesController::class, 'update'])->middleware('permission:project-milestones.update')->name('update');
            Route::delete('/destroy/{project}/milestone/{milestone}', [ProjectMilestonesController::class, 'destroy'])->middleware('permission:project-milestones.delete')->name('destroy');
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
        });

        // Labor Costs
        Route::prefix('labor-costs')->name('labor-costs.')->group(function(){
            Route::post('/store/{project}', [ProjectLaborCostsController::class, 'store'])->middleware('permission:labor-costs.create')->name('store');
            Route::put('/update/{project}/cost/{laborCost}', [ProjectLaborCostsController::class, 'update'])->middleware('permission:labor-costs.update')->name('update');
            Route::delete('/destroy/{project}/cost/{laborCost}', [ProjectLaborCostsController::class, 'destroy'])->middleware('permission:labor-costs.delete')->name('destroy');
        }); 
    });

    // Employee Management
    Route::prefix('employee-management')->name('employee-management.')->group(function(){
        Route::get('/', [EmployeesController::class, 'index'])->name('index');
        Route::post('/store', [EmployeesController::class, 'store'])->name('store');
        Route::put('/update/{employee}', [EmployeesController::class, 'update'])->name('update');
        Route::delete('/delete/{employee}', [EmployeesController::class, 'destroy'])->name('destroy');
        Route::put('/update-status/{employee}', [EmployeesController::class, 'handleStatus'])->name('update-status');
    });
    // Client Management
    Route::prefix('client-management')->name('client-management.')->group(function(){
        Route::get('/', [ClientsController::class, 'index'])->middleware('permission:clients.view')->name('index');
        Route::post('/store', [ClientsController::class, 'store'])->middleware('permission:clients.create')->name('store');
        Route::put('/update/{client}', [ClientsController::class, 'update'])->middleware('permission:clients.update')->name('update');
        Route::delete('/delete/{client}', [ClientsController::class, 'destroy'])->middleware('permission:clients.delete')->name('destroy');
        Route::put('/update-status/{client}', [ClientsController::class, 'handleStatus'])->middleware('permission:clients.update-status')->name('update-status');
    });
    // Reports & Analytics
    Route::prefix('reports')->name('reports.')->group(function(){
        Route::get('/', [ReportsController::class, 'index'])->name('index');
    });

    // User Management
    Route::prefix('user-management')->name('user-management.')->group(function () {

        // Roles & Permissions
        Route::prefix('roles-and-permissions')->name('roles-and-permissions.')->group(function(){
            Route::get('/', [RolesController::class, 'index'])->name('index');
            Route::post('/store', [RolesController::class, 'store'])->name('store');
            Route::get('/edit/{role}', [RolesController::class, 'edit'])->name('edit');
            Route::put('/update/{role}', [RolesController::class, 'update'])->name('update');
            Route::delete('/destroy/{role}', [RolesController::class, 'destroy'])->name('destroy');
        });
        // Users
        Route::prefix('users')->name('users.')->group(function(){
            Route::get('/', [UsersController::class, 'index'])->name('index');
            Route::post('/store', [UsersController::class, 'store'])->name('store');
            Route::put('/update/{user}', [UsersController::class, 'update'])->name('update');
            Route::patch('/reset-password/{user}', [UsersController::class, 'resetPassword'])->name('reset-password');
            Route::delete('/destroy/{user}', [UsersController::class, 'destroy'])->name('destroy');
        });
        // Activity Logs
        Route::prefix('activity-logs')->name('activity-logs.')->group(function(){
            Route::get('/', [ActivityLogsController::class, 'index'])->name('index');
        });
    });

    // Inventory Management
    Route::prefix('inventory-management')->name('inventory-management.')->group(function(){
        Route::get('/', [InventoryItemsController::class, 'index'])->name('index');
        Route::get('/transactions', [InventoryItemsController::class, 'transactions'])->name('transactions');
        Route::post('/store', [InventoryItemsController::class, 'store'])->name('store');
        Route::put('/update/{inventoryItem}', [InventoryItemsController::class, 'update'])->name('update');
        Route::delete('/destroy/{inventoryItem}', [InventoryItemsController::class, 'destroy'])->name('destroy');
        Route::post('/stock-in/{inventoryItem}', [InventoryItemsController::class, 'stockIn'])->name('stock-in');
        Route::post('/stock-out/{inventoryItem}', [InventoryItemsController::class, 'stockOut'])->name('stock-out');
    });

    // Billing Management
    Route::prefix('billing-management')->name('billing-management.')->group(function(){
        Route::get('/', [BillingsController::class, 'index'])->name('index');
        Route::post('/store', [BillingsController::class, 'store'])->name('store');
        Route::put('/update/{billing}', [BillingsController::class, 'update'])->name('update');
        Route::delete('/destroy/{billing}', [BillingsController::class, 'destroy'])->name('destroy');
        Route::get('/view/{billing}', [BillingsController::class, 'show'])->name('show');
        Route::post('/payment/{billing}', [BillingsController::class, 'addPayment'])->name('add-payment');
    });
});