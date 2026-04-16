<?php

namespace Database\Seeders;

use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;
use Spatie\Permission\Models\Role;
use Spatie\Permission\Models\Permission;

class RoleSeeder extends Seeder
{
    public function run(): void
    {
        app()[\Spatie\Permission\PermissionRegistrar::class]->forgetCachedPermissions();

        $allPermissions = Permission::all()->pluck('name')->toArray();

        // ─────────────────────────────────────────────────────────────────────
        // Permission groups — reused across multiple roles
        // ─────────────────────────────────────────────────────────────────────

        $projectReadOnly = [
            'dashboard.view',
            'projects.view', 'projects.view-all',
            'project-teams.view',
            'project-files.view', 'project-files.download',
            'project-boq.view',
            'project-milestones.view', 'project-milestones.view-detail',
            'milestone-material-usage.view',
            'project-tasks.view',
            'progress-updates.view',
            'project-issues.view',
            'material-allocations.view',
            'labor-costs.view',
            'miscellaneous-expenses.view',
        ];

        $projectExecution = [
            // View everything on the project
            ...$projectReadOnly,

            // Milestones & tasks
            'project-milestones.create', 'project-milestones.update',
            'milestone-material-usage.create', 'milestone-material-usage.update', 'milestone-material-usage.delete',
            'project-tasks.create', 'project-tasks.update', 'project-tasks.update-status',
            'progress-updates.create', 'progress-updates.update', 'progress-updates.delete',
            'project-issues.create', 'project-issues.update',

            // Files
            'project-files.upload',

            // Labor & miscellaneous recording
            'labor-costs.create', 'labor-costs.update',
            'miscellaneous-expenses.create', 'miscellaneous-expenses.update',

            // Material usage (receiving reports)
            'material-allocations.view', 'material-allocations.receiving-report',
        ];

        // ─────────────────────────────────────────────────────────────────────
        // 1. Super Admin — full system access
        // ─────────────────────────────────────────────────────────────────────
        $superAdmin = Role::firstOrCreate(['name' => 'Super Admin', 'guard_name' => 'web']);
        $superAdmin->syncPermissions($allPermissions);
        $this->clearCacheForRole($superAdmin);

        // ─────────────────────────────────────────────────────────────────────
        // 2. Developer — full access (internal use)
        // ─────────────────────────────────────────────────────────────────────
        $developer = Role::firstOrCreate(['name' => 'Developer', 'guard_name' => 'web']);
        $developer->syncPermissions($allPermissions);
        $this->clearCacheForRole($developer);

        // ─────────────────────────────────────────────────────────────────────
        // 3. Admin — company administrator; full operational access, no system
        //    management (users, roles, activity logs)
        // ─────────────────────────────────────────────────────────────────────
        $admin = Role::firstOrCreate(['name' => 'Admin', 'guard_name' => 'web']);
        $admin->syncPermissions([
            'dashboard.view',

            // Projects — full lifecycle
            'projects.view', 'projects.create', 'projects.update', 'projects.delete',
            'projects.view-all', 'projects.archive',

            // Project sub-modules — full access
            'project-teams.view', 'project-teams.create', 'project-teams.update',
            'project-teams.delete', 'project-teams.rotate',
            'project-files.view', 'project-files.upload', 'project-files.update',
            'project-files.delete', 'project-files.download',
            'project-boq.view', 'project-boq.create', 'project-boq.update', 'project-boq.delete',
            'project-milestones.view', 'project-milestones.view-detail',
            'project-milestones.create', 'project-milestones.update', 'project-milestones.delete',
            'milestone-material-usage.view', 'milestone-material-usage.create',
            'milestone-material-usage.update', 'milestone-material-usage.delete',
            'project-tasks.view', 'project-tasks.create', 'project-tasks.update',
            'project-tasks.delete', 'project-tasks.update-status',
            'progress-updates.view', 'progress-updates.create',
            'progress-updates.update', 'progress-updates.delete',
            'project-issues.view', 'project-issues.create',
            'project-issues.update', 'project-issues.delete',
            'material-allocations.view', 'material-allocations.create',
            'material-allocations.update', 'material-allocations.delete',
            'material-allocations.receiving-report',
            'labor-costs.view', 'labor-costs.create', 'labor-costs.update', 'labor-costs.delete',
            'miscellaneous-expenses.view', 'miscellaneous-expenses.create',
            'miscellaneous-expenses.update', 'miscellaneous-expenses.delete',

            // Clients & Employees — full
            'clients.view', 'clients.create', 'clients.update', 'clients.delete', 'clients.update-status',
            'employees.view', 'employees.create', 'employees.update', 'employees.delete', 'employees.update-status',

            // Inventory & Direct Supply — full
            'inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete',
            'inventory.stock-in', 'inventory.stock-out', 'inventory.allocate', 'inventory.archive',
            'direct-supply.view', 'direct-supply.create', 'direct-supply.update',
            'direct-supply.delete', 'direct-supply.allocate',

            // Billing — full
            'billing.view', 'billing.create', 'billing.update', 'billing.delete',
            'billing.add-payment', 'billing.view-payments', 'billing.archive',

            // Reports — all
            'reports.view', 'reports.project-performance', 'reports.financial',
            'reports.client', 'reports.inventory', 'reports.team-productivity', 'reports.budget',
        ]);
        $this->clearCacheForRole($admin);

        // ─────────────────────────────────────────────────────────────────────
        // 4. Project Manager — owns full project lifecycle from scoping to
        //    completion; manages team, BOQ, milestones, costs, files, and
        //    approves labor cost payroll submissions
        // ─────────────────────────────────────────────────────────────────────
        $pm = Role::firstOrCreate(['name' => 'Project Manager', 'guard_name' => 'web']);
        $pm->syncPermissions([
            'dashboard.view',

            // Projects — create and manage own; view all for cross-project awareness
            'projects.view', 'projects.create', 'projects.update', 'projects.view-all',

            // Team management
            'project-teams.view', 'project-teams.create', 'project-teams.update',
            'project-teams.delete', 'project-teams.rotate',

            // Files
            'project-files.view', 'project-files.upload', 'project-files.update',
            'project-files.delete', 'project-files.download',

            // BOQ — full
            'project-boq.view', 'project-boq.create', 'project-boq.update', 'project-boq.delete',

            // Milestones & tasks — full
            'project-milestones.view', 'project-milestones.view-detail',
            'project-milestones.create', 'project-milestones.update', 'project-milestones.delete',
            'milestone-material-usage.view', 'milestone-material-usage.create',
            'milestone-material-usage.update', 'milestone-material-usage.delete',
            'project-tasks.view', 'project-tasks.create', 'project-tasks.update',
            'project-tasks.delete', 'project-tasks.update-status',
            'progress-updates.view', 'progress-updates.create',
            'progress-updates.update', 'progress-updates.delete',
            'project-issues.view', 'project-issues.create',
            'project-issues.update', 'project-issues.delete',

            // Materials & costs — full
            'material-allocations.view', 'material-allocations.create',
            'material-allocations.update', 'material-allocations.delete',
            'material-allocations.receiving-report',
            'labor-costs.view', 'labor-costs.create', 'labor-costs.update', 'labor-costs.delete',
            'miscellaneous-expenses.view', 'miscellaneous-expenses.create',
            'miscellaneous-expenses.update', 'miscellaneous-expenses.delete',

            // Supporting lookups
            'clients.view',
            'employees.view',
            'inventory.view',
            'direct-supply.view',
            'billing.view',

            // Reports
            'reports.view', 'reports.project-performance',
            'reports.team-productivity', 'reports.budget',
        ]);
        $this->clearCacheForRole($pm);

        // ─────────────────────────────────────────────────────────────────────
        // 5. Finance Manager — handles billing, payments, financial reporting,
        //    and payroll (labor cost timesheets); manages employee records
        // ─────────────────────────────────────────────────────────────────────
        $finance = Role::firstOrCreate(['name' => 'Finance Manager', 'guard_name' => 'web']);
        $finance->syncPermissions([
            'dashboard.view',

            // Billing — full
            'billing.view', 'billing.create', 'billing.update', 'billing.delete',
            'billing.add-payment', 'billing.view-payments', 'billing.archive',

            // Projects & team — view for billing/payroll context
            'projects.view', 'projects.view-all',
            'project-teams.view',

            // BOQ — view for cost reference
            'project-boq.view',

            // Clients — view
            'clients.view',

            // Employees — full (handles payroll records)
            'employees.view', 'employees.create', 'employees.update',
            'employees.delete', 'employees.update-status',

            // Labor costs — full (timekeeping / payroll processing)
            'labor-costs.view', 'labor-costs.create', 'labor-costs.update', 'labor-costs.delete',

            // Supporting expense view
            'material-allocations.view',
            'miscellaneous-expenses.view',

            // Reports
            'reports.view', 'reports.financial', 'reports.client',
            'reports.team-productivity', 'reports.budget',
        ]);
        $this->clearCacheForRole($finance);

        // ─────────────────────────────────────────────────────────────────────
        // 6. Inventory Manager — manages materials, inventory, and direct
        //    supply; fulfils material allocations from the field
        // ─────────────────────────────────────────────────────────────────────
        $procurement = Role::firstOrCreate(['name' => 'Inventory Manager', 'guard_name' => 'web']);
        $procurement->syncPermissions([
            'dashboard.view',

            // Inventory — full
            'inventory.view', 'inventory.create', 'inventory.update', 'inventory.delete',
            'inventory.stock-in', 'inventory.stock-out', 'inventory.allocate', 'inventory.archive',

            // Direct Supply — full
            'direct-supply.view', 'direct-supply.create', 'direct-supply.update',
            'direct-supply.delete', 'direct-supply.allocate',

            // Material allocations — full (receives, delivers to site)
            'material-allocations.view', 'material-allocations.create',
            'material-allocations.update', 'material-allocations.delete',
            'material-allocations.receiving-report',

            // Milestone material usage — view + record
            'milestone-material-usage.view', 'milestone-material-usage.create',
            'milestone-material-usage.update', 'milestone-material-usage.delete',

            // Projects & milestones — read (context for orders)
            'projects.view', 'projects.view-all',
            'project-milestones.view', 'project-milestones.view-detail',
            'project-boq.view',

            // Reports
            'reports.view', 'reports.inventory',
        ]);
        $this->clearCacheForRole($procurement);

        // ─────────────────────────────────────────────────────────────────────
        // 7. Foreman — field supervisor; records daily work progress and
        //     material consumption, raises issues
        // ─────────────────────────────────────────────────────────────────────
        $foreman = Role::firstOrCreate(['name' => 'Foreman', 'guard_name' => 'web']);
        $foreman->syncPermissions([
            'dashboard.view',

            // Projects — view assigned
            'projects.view', 'projects.view-all',
            'project-teams.view',
            'project-boq.view',

            // Milestones & tasks — view + update status
            'project-milestones.view', 'project-milestones.view-detail',
            'milestone-material-usage.view', 'milestone-material-usage.create',
            'milestone-material-usage.update', 'milestone-material-usage.delete',
            'project-tasks.view', 'project-tasks.update', 'project-tasks.update-status',

            // Progress — full own
            'progress-updates.view', 'progress-updates.create', 'progress-updates.update',

            // Issues — raise and update
            'project-issues.view', 'project-issues.create', 'project-issues.update',

            // Files — view and upload
            'project-files.view', 'project-files.upload', 'project-files.download',

            // Material & labor recording
            'material-allocations.view', 'material-allocations.receiving-report',
            'labor-costs.view', 'labor-costs.create', 'labor-costs.update',
            'miscellaneous-expenses.view', 'miscellaneous-expenses.create',
            'miscellaneous-expenses.update',

            // Supporting lookups
            'employees.view',

            // Reports
            'reports.view', 'reports.project-performance',
        ]);
        $this->clearCacheForRole($foreman);

        // ─────────────────────────────────────────────────────────────────────
        // 8. Foreman (TM) — mobile task-management app; field execution only
        // ─────────────────────────────────────────────────────────────────────
        $tmForeman = Role::firstOrCreate(['name' => 'Foreman (TM)', 'guard_name' => 'web']);
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
        $this->clearCacheForRole($tmForeman);

        // ─────────────────────────────────────────────────────────────────────
        // 9. Engineer (TM) — mobile app with project-scoped management;
        //     can delegate TM permissions to workers
        // ─────────────────────────────────────────────────────────────────────
        $tmEngineer = Role::firstOrCreate(['name' => 'Engineer (TM)', 'guard_name' => 'web']);
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

            // Project-scoped management
            'tm.projects.view-assigned',
            'tm.milestones.manage',
            'tm.tasks.manage',
            'tm.team.view',
            'tm.team.assign',
            'tm.team.release',
            'tm.team.reactivate',
            'tm.team.force-remove',

            // Material receiving on-site
            'material-allocations.receiving-report',

            // Permission delegation
            'tm.permissions.delegate',
        ]);
        $this->clearCacheForRole($tmEngineer);

        $this->command->info('Roles seeded successfully!');
    }

    private function clearCacheForRole(Role $role): void
    {
        $role->loadMissing('users:id');
        foreach ($role->users as $user) {
            Cache::forget("user_permissions_{$user->id}");
        }
    }
}
