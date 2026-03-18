<?php

namespace App\Console\Commands;

use App\Enums\AssignmentStatus;
use App\Models\ProjectTeam;
use Illuminate\Console\Command;

class CompleteExpiredAssignments extends Command
{
    /**
     * The name and signature of the console command.
     */
    protected $signature = 'project-teams:complete-expired
                            {--dry-run : Show how many records would be updated without actually updating them}';

    /**
     * The console command description.
     */
    protected $description = 'Transition active project-team assignments whose end_date has passed to "completed", freeing those people for re-assignment (rotation).';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $query = ProjectTeam::where('assignment_status', AssignmentStatus::Active->value)
            ->whereNotNull('end_date')
            ->where('end_date', '<', now()->toDateString());

        $count = $query->count();

        if ($count === 0) {
            $this->info('No expired assignments to complete.');
            return self::SUCCESS;
        }

        if ($this->option('dry-run')) {
            $this->line("[DRY RUN] Would complete {$count} expired assignment(s).");
            return self::SUCCESS;
        }

        $query->update(['assignment_status' => AssignmentStatus::Completed->value]);

        $this->info("Completed {$count} expired assignment(s). Those people are now available for re-assignment.");

        return self::SUCCESS;
    }
}
