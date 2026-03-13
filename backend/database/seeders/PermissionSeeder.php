<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Permission;

class PermissionSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $permissions = [
            // Dashboard
            'dashboard.view',

            // Projects
            'projects.view',
            'projects.create',
            'projects.update',
            'projects.delete',
            'projects.view-all',
            'projects.archive',

            // Project Teams
            'project-teams.view',
            'project-teams.create',
            'project-teams.update',
            'project-teams.delete',

            // Project Files
            'project-files.view',
            'project-files.upload',
            'project-files.update',
            'project-files.delete',
            'project-files.download',

            // Project Milestones
            'project-milestones.view',
            'project-milestones.create',
            'project-milestones.update',
            'project-milestones.delete',

            // Project Tasks
            'project-tasks.view',
            'project-tasks.create',
            'project-tasks.update',
            'project-tasks.delete',
            'project-tasks.update-status',

            // Progress Updates
            'progress-updates.view',
            'progress-updates.create',
            'progress-updates.update',
            'progress-updates.delete',

            // Project Issues
            'project-issues.view',
            'project-issues.create',
            'project-issues.update',
            'project-issues.delete',

            // Material Allocations
            'material-allocations.view',
            'material-allocations.create',
            'material-allocations.update',
            'material-allocations.delete',
            'material-allocations.receiving-report',

            // Labor Costs
            'labor-costs.view',
            'labor-costs.create',
            'labor-costs.update',
            'labor-costs.delete',

            // Miscellaneous Expenses
            'miscellaneous-expenses.view',
            'miscellaneous-expenses.create',
            'miscellaneous-expenses.update',
            'miscellaneous-expenses.delete',

            // Clients
            'clients.view',
            'clients.create',
            'clients.update',
            'clients.delete',
            'clients.update-status',

            // Employees
            'employees.view',
            'employees.create',
            'employees.update',
            'employees.delete',
            'employees.update-status',

            // Inventory
            'inventory.view',
            'inventory.create',
            'inventory.update',
            'inventory.delete',
            'inventory.stock-in',
            'inventory.stock-out',
            'inventory.allocate',
            'inventory.archive',

            // Billing
            'billing.view',
            'billing.create',
            'billing.update',
            'billing.delete',
            'billing.add-payment',
            'billing.view-payments',
            'billing.archive',

            // Reports
            'reports.view',
            'reports.project-performance',
            'reports.financial',
            'reports.client',
            'reports.inventory',
            'reports.team-productivity',
            'reports.budget',

            // Users
            'users.view',
            'users.create',
            'users.update',
            'users.delete',
            'users.reset-password',

            // Roles & Permissions
            'roles.view',
            'roles.create',
            'roles.update',
            'roles.delete',
            'roles.assign',

            // Activity Logs
            'activity-logs.view',
            'activity-logs.export',

            // Trash Bin
            'trash-bin.view',
            'trash-bin.restore',
            'trash-bin.force-delete',
        ];

        foreach ($permissions as $permission) {
            Permission::firstOrCreate(
                ['name' => $permission, 'guard_name' => 'web'],
                ['name' => $permission, 'guard_name' => 'web']
            );
        }

        $this->command->info('Permissions seeded successfully!');
    }
}

