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
        // Create default admin user
        User::factory()->create([
            'name' => 'Test User',
            'email' => 'dev@unisync.com',
            'password' => Hash::make('password')
        ]);

        // Seed permissions and roles first
        $this->call([
            PermissionSeeder::class,
            RoleSeeder::class,
        ]);

        // Seed project data (clients, inventory, projects with all submodules)
        $this->call([
            ProjectDataSeeder::class,
        ]);
    }
}
