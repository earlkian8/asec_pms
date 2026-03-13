<?php

namespace App\Console\Commands;

use App\Http\Controllers\Admin\TrashBinController;
use Illuminate\Console\Command;

class PruneTrashBinCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'trashbin:prune';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Permanently delete soft-deleted records that have been in the trash for more than 30 days.';

    /**
     * Execute the console command.
     */
    public function handle(): int
    {
        $controller = new TrashBinController();
        $modelMap = (new \ReflectionClass($controller))
            ->getMethod('modelMap')
            ->invoke($controller);

        $cutoff = now()->subDays(30);
        $totalDeleted = 0;

        foreach ($modelMap as $config) {
            $class = $config['class'] ?? null;
            if (!$class || !class_exists($class)) {
                continue;
            }

            $query = $class::onlyTrashed()->where('deleted_at', '<=', $cutoff);
            $query->chunkById(100, function ($models) use (&$totalDeleted) {
                foreach ($models as $model) {
                    $totalDeleted++;
                    $model->forceDelete();
                }
            });
        }

        $this->info("Pruned {$totalDeleted} soft-deleted records older than 30 days.");

        return Command::SUCCESS;
    }
}

