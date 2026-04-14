<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;
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

        $projectManagementPermissions = [
            'dashboard.view',
            'projects.view', 'projects.create', 'projects.update', 'projects.view-all',
            'project-teams.view', 'project-teams.create', 'project-teams.update', 'project-teams.delete',
            'project-files.view', 'project-files.upload', 'project-files.update', 'project-files.delete', 'project-files.download',
            'project-boq.view', 'project-boq.create', 'project-boq.update', 'project-boq.delete',
            'project-milestones.view', 'project-milestones.view-detail', 'project-milestones.create', 'project-milestones.update', 'project-milestones.delete',
            'milestone-material-usage.view', 'milestone-material-usage.create', 'milestone-material-usage.update', 'milestone-material-usage.delete',
            'project-tasks.view', 'project-tasks.create', 'project-tasks.update', 'project-tasks.delete', 'project-tasks.update-status',
            'progress-updates.view', 'progress-updates.create', 'progress-updates.update', 'progress-updates.delete',
            'project-issues.view', 'project-issues.create', 'project-issues.update', 'project-issues.delete',
            'material-allocations.view', 'material-allocations.create', 'material-allocations.update', 'material-allocations.delete', 'material-allocations.receiving-report',
            'labor-costs.view', 'labor-costs.create', 'labor-costs.update', 'labor-costs.delete',
            'miscellaneous-expenses.view', 'miscellaneous-expenses.create', 'miscellaneous-expenses.update', 'miscellaneous-expenses.delete',
            'clients.view',
            'employees.view',
            'inventory.view',
            'billing.view',
            'reports.view', 'reports.project-performance',
        ];

        $financePermissions = [
            'dashboard.view',
            'billing.view', 'billing.create', 'billing.update', 'billing.delete', 'billing.add-payment', 'billing.view-payments',
            'projects.view',
            'clients.view',
            'reports.view', 'reports.financial', 'reports.budget',
        ];

        $inventoryPermissions = [
            'dashboard.view',
            'inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete', 'inventory.stock-in', 'inventory.stock-out', 'inventory.allocate',
            'projects.view',
            'project-milestones.view', 'project-milestones.view-detail',
            'material-allocations.view', 'material-allocations.create', 'material-allocations.update', 'material-allocations.delete', 'material-allocations.receiving-report',
            'milestone-material-usage.view', 'milestone-material-usage.create', 'milestone-material-usage.update', 'milestone-material-usage.delete',
            'reports.view', 'reports.inventory',
        ];

        $foremanPermissions = [
            'dashboard.view',
            'projects.view', 'projects.view-all',
            'project-teams.view',
            'project-milestones.view', 'project-milestones.view-detail',
            'milestone-material-usage.view', 'milestone-material-usage.create', 'milestone-material-usage.update', 'milestone-material-usage.delete',
            'project-tasks.view', 'project-tasks.update', 'project-tasks.update-status',
            'progress-updates.view', 'progress-updates.create', 'progress-updates.update',
            'project-files.view', 'project-files.upload', 'project-files.download',
            'project-issues.view', 'project-issues.create', 'project-issues.update',
            'material-allocations.view', 'material-allocations.receiving-report',
            'labor-costs.view', 'labor-costs.create', 'labor-costs.update',
            'miscellaneous-expenses.view', 'miscellaneous-expenses.create', 'miscellaneous-expenses.update',
            'employees.view',
            'reports.view', 'reports.project-performance',
        ];

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
        $this->clearUserPermissionCacheForRole($superAdmin);
        $developer->syncPermissions($allPermissions);
        $this->clearUserPermissionCacheForRole($developer);

        // 2. Admin - All permissions except user management (users, roles, activity-logs)
        $admin = Role::firstOrCreate(
            ['name' => 'Admin', 'guard_name' => 'web'],
            ['name' => 'Admin', 'guard_name' => 'web']
        );
        $admin->syncPermissions([
            'dashboard.view',
            'projects.view', 'projects.create', 'projects.update', 'projects.delete', 'projects.view-all', 'projects.archive',
            'project-teams.view', 'project-teams.create', 'project-teams.update', 'project-teams.delete', 'project-teams.rotate',
            'project-files.view', 'project-files.upload', 'project-files.update', 'project-files.delete', 'project-files.download',
            'project-boq.view', 'project-boq.create', 'project-boq.update', 'project-boq.delete',
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
            'inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete', 'inventory.stock-in', 'inventory.stock-out', 'inventory.allocate', 'inventory.archive',
            'billing.view', 'billing.create', 'billing.update', 'billing.delete', 'billing.add-payment', 'billing.view-payments', 'billing.archive',
            'reports.view', 'reports.project-performance', 'reports.financial', 'reports.client', 'reports.inventory', 'reports.team-productivity', 'reports.budget',
        ]);
        $this->clearUserPermissionCacheForRole($admin);

        // 3. Project Manager
        $projectManager = Role::firstOrCreate(
            ['name' => 'Project Manager', 'guard_name' => 'web'],
            ['name' => 'Project Manager', 'guard_name' => 'web']
        );
        $projectManager->syncPermissions($projectManagementPermissions);
        $this->clearUserPermissionCacheForRole($projectManager);

        // 4. Finance Manager
        $financeManager = Role::firstOrCreate(
            ['name' => 'Finance Manager', 'guard_name' => 'web'],
            ['name' => 'Finance Manager', 'guard_name' => 'web']
        );
        $financeManager->syncPermissions($financePermissions);
        $this->clearUserPermissionCacheForRole($financeManager);

        // 5. Inventory Manager
        $inventoryManager = Role::firstOrCreate(
            ['name' => 'Inventory Manager', 'guard_name' => 'web'],
            ['name' => 'Inventory Manager', 'guard_name' => 'web']
        );
        $inventoryManager->syncPermissions($inventoryPermissions);
        $this->clearUserPermissionCacheForRole($inventoryManager);

        // 6. Foreman - Field supervisor with project execution capabilities
        $foreman = Role::firstOrCreate(
            ['name' => 'Foreman', 'guard_name' => 'web'],
            ['name' => 'Foreman', 'guard_name' => 'web']
        );
        $foreman->syncPermissions($foremanPermissions);
        $this->clearUserPermissionCacheForRole($foreman);

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
        $this->clearUserPermissionCacheForRole($tmForeman);

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
        $this->clearUserPermissionCacheForRole($tmEngineer);

        $this->command->info('Roles seeded successfully!');
    }

    private function clearUserPermissionCacheForRole(Role $role): void
    {
        $role->loadMissing('users:id');

        foreach ($role->users as $user) {
            Cache::forget("user_permissions_{$user->id}");
        }
    }
}

