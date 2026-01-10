<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // Seed permissions and roles first
        $this->call([
            PermissionSeeder::class,
            RoleSeeder::class,
            ClientTypeSeeder::class,
            ProjectTypeSeeder::class,
            // InventorySeeder::class,
        ]);

        // Create or update admin user with Super Admin role
        // Update this email to match your account email
        $adminEmail = 'dev@unisync.com'; // Change this to your email
        
        $adminUser = User::firstOrCreate(
            ['email' => $adminEmail],
            [
                'name' => 'Earl Kian',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
        
        // Ensure Super Admin role is assigned (remove other roles first)
        $adminUser->syncRoles(['Super Admin']);
        
        // $this->command->info("Super Admin role assigned to: {$adminEmail}");

        // // Seed project data (inventory, clients, projects with all submodules, and additional users)
        // $this->call([
        //     InventorySeeder::class,
        //     ProjectDataSeeder::class,
        // ]);
    }
}
