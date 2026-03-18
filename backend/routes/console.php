<?php

use Illuminate\Foundation\Inspiring;
use Illuminate\Support\Facades\Artisan;
use Illuminate\Support\Facades\Schedule;

Artisan::command('inspire', function () {
    $this->comment(Inspiring::quote());
})->purpose('Display an inspiring quote');

// Schedule daily pruning of trash bin items older than 30 days
Schedule::command('trashbin:prune')->daily();

// Rotation: auto-complete assignments whose end_date has passed
// This frees the person for re-assignment to another project
Schedule::command('project-teams:complete-expired')->dailyAt('00:05');
