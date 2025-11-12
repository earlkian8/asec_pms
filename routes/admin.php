<?php

use App\Http\Controllers\Admin\ActivityLogsController;
use App\Http\Controllers\Admin\ClientsController;
use App\Http\Controllers\Admin\EmployeesController;
use App\Http\Controllers\Admin\RolesController;
use App\Http\Controllers\Admin\UsersController;
use App\Http\Controllers\ProfileController;
use App\Models\ActivityLogs;
use Illuminate\Foundation\Application;
use Illuminate\Support\Facades\Route;
use Inertia\Inertia;


Route::get('/dashboard', function () {
    return Inertia::render('Dashboard');
})->middleware(['auth', 'verified'])->name('dashboard');

Route::middleware('auth')->group(function () {
    
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
        Route::get('/', [ClientsController::class, 'index'])->name('index');
        Route::post('/store', [ClientsController::class, 'store'])->name('store');
        Route::put('/update/{client}', [ClientsController::class, 'update'])->name('update');
        Route::delete('/delete/{client}', [ClientsController::class, 'destroy'])->name('destroy');
        Route::put('/update-status/{client}', [ClientsController::class, 'handleStatus'])->name('update-status');
    });
    // User Management
    Route::prefix('user-management')->name('user-management.')->group(function () {

        // Roles & Permissions
        Route::prefix('roles-and-permissions')->name('roles-and-permissions.')->group(function(){
            Route::get('/', [RolesController::class, 'index'])->name('index');
            Route::post('/store', [RolesController::class, 'store'])->name('store');
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
});