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
        ]);

        // Create test user with Super Admin role
        $testUser = User::create([
            'name' => 'Test User',
            'email' => 'dev@unisync.com',
            'password' => Hash::make('password'),
            'email_verified_at' => now(),
        ]);
        $testUser->assignRole('Super Admin');

        // Seed project data (clients, inventory, projects with all submodules, and additional users)
        $this->call([
            ProjectDataSeeder::class,
        ]);
    }
}
