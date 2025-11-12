<?php

use App\Http\Controllers\Admin\ActivityLogsController;
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