<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Cache;

class AssignSuperAdmin extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'user:assign-super-admin {email}';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Assign Super Admin role to a user by email';

    /**
     * Execute the console command.
     */
    public function handle()
    {
        $email = $this->argument('email');
        
        $user = User::where('email', $email)->first();
        
        if (!$user) {
            $this->error("User with email '{$email}' not found.");
            return 1;
        }
        
        // Assign Super Admin role
        $user->syncRoles(['Super Admin']);
        Cache::forget("user_permissions_{$user->id}");
        
        $this->info("Super Admin role has been assigned to: {$user->name} ({$user->email})");
        $this->info("Current roles: " . $user->roles->pluck('name')->implode(', '));
        
        return 0;
    }
}
