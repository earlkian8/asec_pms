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

        $developer = Role::firstOrCreate(
            ['name' => 'Developer', 'guard_name' => 'web'],
            ['name' => 'Developer', 'guard_name' => 'web']
        );
        $superAdmin->syncPermissions($allPermissions);
        $developer->syncPermissions($allPermissions);

        // 2. Admin - All permissions except user management (users, roles, activity-logs)
        $admin = Role::firstOrCreate(
            ['name' => 'Admin', 'guard_name' => 'web'],
            ['name' => 'Admin', 'guard_name' => 'web']
        );
        $admin->syncPermissions([
            'dashboard.view',
            'projects.view', 'projects.create', 'projects.update', 'projects.delete', 'projects.view-all',
            'project-teams.view', 'project-teams.create', 'project-teams.update', 'project-teams.delete',
            'project-files.view', 'project-files.upload', 'project-files.update', 'project-files.delete', 'project-files.download',
            'project-milestones.view', 'project-milestones.view-detail', 'project-milestones.create', 'project-milestones.update', 'project-milestones.delete',
            'milestone-material-usage.view', 'milestone-material-usage.create', 'milestone-material-usage.update', 'milestone-material-usage.delete',
            'project-tasks.view', 'project-tasks.create', 'project-tasks.update', 'project-tasks.delete', 'project-tasks.update-status',
            'progress-updates.view', 'progress-updates.create', 'progress-updates.update', 'progress-updates.delete',
            'project-issues.view', 'project-issues.create', 'project-issues.update', 'project-issues.delete',
            'material-allocations.view', 'material-allocations.create', 'material-allocations.update', 'material-allocations.delete', 'material-allocations.receiving-report',
            'labor-costs.view', 'labor-costs.create', 'labor-costs.update', 'labor-costs.delete',
            'miscellaneous-expenses.view', 'miscellaneous-expenses.create', 'miscellaneous-expenses.update', 'miscellaneous-expenses.delete',
            'clients.view', 'clients.create', 'clients.update', 'clients.delete', 'clients.update-status',
            'employees.view', 'employees.create', 'employees.update', 'employees.delete', 'employees.update-status',
            'inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete', 'inventory.stock-in', 'inventory.stock-out', 'inventory.allocate',
            'billing.view', 'billing.create', 'billing.update', 'billing.delete', 'billing.add-payment', 'billing.view-payments',
            'reports.view', 'reports.project-performance', 'reports.financial', 'reports.client', 'reports.inventory', 'reports.team-productivity', 'reports.budget',
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
            'project-milestones.view', 'project-milestones.view-detail', 'project-milestones.create', 'project-milestones.update', 'project-milestones.delete',
            'milestone-material-usage.view', 'milestone-material-usage.create', 'milestone-material-usage.update', 'milestone-material-usage.delete',
            'project-tasks.view', 'project-tasks.create', 'project-tasks.update', 'project-tasks.delete', 'project-tasks.update-status',
            'progress-updates.view', 'progress-updates.create', 'progress-updates.update', 'progress-updates.delete',
            'project-issues.view', 'project-issues.create', 'project-issues.update', 'project-issues.delete',
            'material-allocations.view', 'material-allocations.create', 'material-allocations.update', 'material-allocations.delete', 'material-allocations.receiving-report',
            'labor-costs.view', 'labor-costs.create', 'labor-costs.update', 'labor-costs.delete',
            'miscellaneous-expenses.view', 'miscellaneous-expenses.create', 'miscellaneous-expenses.update', 'miscellaneous-expenses.delete',
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
            'project-milestones.view', 'project-milestones.view-detail', // View milestone details for material context
            'material-allocations.view', 'material-allocations.create', 'material-allocations.update', 'material-allocations.delete', 'material-allocations.receiving-report',
            'milestone-material-usage.view',
            'reports.view', 'reports.inventory',
        ]);

        // 6. Foreman - Field supervisor with project execution capabilities
        $foreman = Role::firstOrCreate(
            ['name' => 'Foreman', 'guard_name' => 'web'],
            ['name' => 'Foreman', 'guard_name' => 'web']
        );
        $foreman->syncPermissions([
            'dashboard.view',
            'projects.view', 'projects.view-all', // View assigned projects
            'project-teams.view', // View team members
            'project-milestones.view', 'project-milestones.view-detail', // View milestones
            'milestone-material-usage.view', 'milestone-material-usage.create', 'milestone-material-usage.update', 'milestone-material-usage.delete',
            'project-tasks.view', 'project-tasks.update', 'project-tasks.update-status', // Manage tasks
            'progress-updates.view', 'progress-updates.create', 'progress-updates.update', // Create and update progress
            'project-files.view', 'project-files.upload', 'project-files.download', // View and upload files
            'project-issues.view', 'project-issues.create', 'project-issues.update', // Report and manage issues
            'material-allocations.view', 'material-allocations.receiving-report', // View allocations and create receiving reports
            'labor-costs.view', 'labor-costs.create', 'labor-costs.update', // Track labor costs
            'miscellaneous-expenses.view', 'miscellaneous-expenses.create', 'miscellaneous-expenses.update', // Track expenses
            'employees.view', // View employees for team context
            'reports.view', 'reports.project-performance', // View project reports
        ]);

        // 7. Foreman (TM) - Task-management app execution only (permission-driven)
        $tmForeman = Role::firstOrCreate(
            ['name' => 'Foreman (TM)', 'guard_name' => 'web'],
            ['name' => 'Foreman (TM)', 'guard_name' => 'web']
        );
        $tmForeman->syncPermissions([
            'tm.access',
            'tm.tasks.view',
            'tm.tasks.update-status',
            'tm.progress-updates.view',
            'tm.progress-updates.create',
            'tm.progress-updates.update-own',
            'tm.progress-updates.delete-own',
            'tm.issues.view',
            'tm.issues.create',
            'tm.issues.update-own',
            'tm.issues.delete-own',
            'tm.files.download',
        ]);

        // 8. Engineer (TM) - Task-management app project-scoped management
        $tmEngineer = Role::firstOrCreate(
            ['name' => 'Engineer (TM)', 'guard_name' => 'web'],
            ['name' => 'Engineer (TM)', 'guard_name' => 'web']
        );
        $tmEngineer->syncPermissions([
            // Execution
            'tm.access',
            'tm.tasks.view',
            'tm.tasks.update-status',
            'tm.progress-updates.view',
            'tm.progress-updates.create',
            'tm.progress-updates.update-own',
            'tm.progress-updates.delete-own',
            'tm.issues.view',
            'tm.issues.create',
            'tm.issues.update-own',
            'tm.issues.delete-own',
            'tm.files.download',

            // Management
            'tm.projects.view-assigned',
            'tm.milestones.manage',
            'tm.tasks.manage',
            'tm.team.view',
            'tm.team.assign',
            'tm.team.release',
            'tm.team.reactivate',
            'tm.team.force-remove',

            // Material receiving reports
            'material-allocations.receiving-report',

            // Permission delegation — only original Engineer (TM) users may delegate
            'tm.permissions.delegate',
        ]);

        $this->command->info('Roles seeded successfully!');
    }
}

