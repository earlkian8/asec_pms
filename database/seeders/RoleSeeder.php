<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RoleSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        // Reset cached roles and permissions
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        // Get all permissions
        $allPermissions = Permission::all()->pluck('name')->toArray();

        // 1. Super Admin - All permissions
        $superAdmin = Role::firstOrCreate(
            ['name' => 'Super Admin', 'guard_name' => 'web'],
            ['name' => 'Super Admin', 'guard_name' => 'web']
        );
        $superAdmin->syncPermissions($allPermissions);

        // 2. Admin - Most permissions except sensitive user management
        $admin = Role::firstOrCreate(
            ['name' => 'Admin', 'guard_name' => 'web'],
            ['name' => 'Admin', 'guard_name' => 'web']
        );
        $admin->syncPermissions([
            'dashboard.view',
            'projects.view', 'projects.create', 'projects.update', 'projects.delete', 'projects.view-all',
            'project-teams.view', 'project-teams.create', 'project-teams.update', 'project-teams.delete',
            'project-files.view', 'project-files.upload', 'project-files.update', 'project-files.delete', 'project-files.download',
            'project-milestones.view', 'project-milestones.create', 'project-milestones.update', 'project-milestones.delete',
            'project-tasks.view', 'project-tasks.create', 'project-tasks.update', 'project-tasks.delete', 'project-tasks.update-status',
            'progress-updates.view', 'progress-updates.create', 'progress-updates.update', 'progress-updates.delete',
            'project-issues.view', 'project-issues.create', 'project-issues.update', 'project-issues.delete',
            'material-allocations.view', 'material-allocations.create', 'material-allocations.update', 'material-allocations.delete', 'material-allocations.receiving-report',
            'labor-costs.view', 'labor-costs.create', 'labor-costs.update', 'labor-costs.delete',
            'clients.view', 'clients.create', 'clients.update', 'clients.delete', 'clients.update-status',
            'employees.view', 'employees.create', 'employees.update', 'employees.delete', 'employees.update-status',
            'inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete', 'inventory.stock-in', 'inventory.stock-out', 'inventory.allocate',
            'billing.view', 'billing.create', 'billing.update', 'billing.delete', 'billing.add-payment', 'billing.view-payments',
            'reports.view', 'reports.project-performance', 'reports.financial', 'reports.client', 'reports.inventory', 'reports.team-productivity', 'reports.budget',
            'users.view', // View only
            'activity-logs.view', // View only
        ]);

        // 3. Project Manager
        $projectManager = Role::firstOrCreate(
            ['name' => 'Project Manager', 'guard_name' => 'web'],
            ['name' => 'Project Manager', 'guard_name' => 'web']
        );
        $projectManager->syncPermissions([
            'dashboard.view',
            'projects.view', 'projects.create', 'projects.update', 'projects.delete', 'projects.view-all',
            'project-teams.view', 'project-teams.create', 'project-teams.update', 'project-teams.delete',
            'project-files.view', 'project-files.upload', 'project-files.update', 'project-files.delete', 'project-files.download',
            'project-milestones.view', 'project-milestones.create', 'project-milestones.update', 'project-milestones.delete',
            'project-tasks.view', 'project-tasks.create', 'project-tasks.update', 'project-tasks.delete', 'project-tasks.update-status',
            'progress-updates.view', 'progress-updates.create', 'progress-updates.update', 'progress-updates.delete',
            'project-issues.view', 'project-issues.create', 'project-issues.update', 'project-issues.delete',
            'material-allocations.view', 'material-allocations.create', 'material-allocations.update', 'material-allocations.delete', 'material-allocations.receiving-report',
            'labor-costs.view', 'labor-costs.create', 'labor-costs.update', 'labor-costs.delete',
            'clients.view', // View only
            'employees.view', // View only
            'inventory.view', 'inventory.allocate',
            'billing.view', 'billing.create', 'billing.update',
            'reports.view', 'reports.project-performance',
        ]);

        // 4. Finance Manager
        $financeManager = Role::firstOrCreate(
            ['name' => 'Finance Manager', 'guard_name' => 'web'],
            ['name' => 'Finance Manager', 'guard_name' => 'web']
        );
        $financeManager->syncPermissions([
            'dashboard.view',
            'billing.view', 'billing.create', 'billing.update', 'billing.delete', 'billing.add-payment', 'billing.view-payments',
            'projects.view', // View only
            'clients.view', // View only
            'reports.view', 'reports.financial', 'reports.budget',
        ]);

        // 5. Inventory Manager
        $inventoryManager = Role::firstOrCreate(
            ['name' => 'Inventory Manager', 'guard_name' => 'web'],
            ['name' => 'Inventory Manager', 'guard_name' => 'web']
        );
        $inventoryManager->syncPermissions([
            'dashboard.view',
            'inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete', 'inventory.stock-in', 'inventory.stock-out', 'inventory.allocate',
            'projects.view', // View only for context
            'reports.view', 'reports.inventory',
        ]);

        // 6. Team Member
        $teamMember = Role::firstOrCreate(
            ['name' => 'Team Member', 'guard_name' => 'web'],
            ['name' => 'Team Member', 'guard_name' => 'web']
        );
        $teamMember->syncPermissions([
            'dashboard.view',
            'projects.view', // Assigned projects only (needs scope implementation)
            'project-tasks.view', 'project-tasks.update', // Own tasks
            'progress-updates.view', 'progress-updates.create', 'progress-updates.update', // Own updates
            'project-files.view', 'project-files.download',
        ]);

        // 7. HR Manager
        $hrManager = Role::firstOrCreate(
            ['name' => 'HR Manager', 'guard_name' => 'web'],
            ['name' => 'HR Manager', 'guard_name' => 'web']
        );
        $hrManager->syncPermissions([
            'dashboard.view',
            'employees.view', 'employees.create', 'employees.update', 'employees.delete', 'employees.update-status',
            'projects.view', // View only for team assignment context
            'reports.view', 'reports.team-productivity',
        ]);

        // 8. Sales Manager
        $salesManager = Role::firstOrCreate(
            ['name' => 'Sales Manager', 'guard_name' => 'web'],
            ['name' => 'Sales Manager', 'guard_name' => 'web']
        );
        $salesManager->syncPermissions([
            'dashboard.view',
            'clients.view', 'clients.create', 'clients.update', 'clients.delete', 'clients.update-status',
            'projects.view', // View only
            'billing.view', // View only
            'reports.view', 'reports.client',
        ]);

        // 9. Viewer
        $viewer = Role::firstOrCreate(
            ['name' => 'Viewer', 'guard_name' => 'web'],
            ['name' => 'Viewer', 'guard_name' => 'web']
        );
        $viewer->syncPermissions([
            'dashboard.view',
            'projects.view',
            'clients.view',
            'employees.view',
            'inventory.view',
            'billing.view',
            'reports.view',
        ]);

        $this->command->info('Roles seeded successfully!');
    }
}

