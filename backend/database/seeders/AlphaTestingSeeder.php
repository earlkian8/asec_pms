<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Client;
use App\Models\ClientType;
use App\Models\Employee;
use App\Models\Project;
use App\Models\ProjectType;
use App\Models\ProjectTeam;
use App\Models\ProjectMilestone;
use App\Models\ProjectTask;
use App\Models\ProjectMaterialAllocation;
use App\Models\ProjectLaborCost;
use App\Models\ProjectMiscellaneousExpense;
use App\Models\ProjectIssue;
use App\Models\Billing;
use App\Models\BillingPayment;
use App\Models\Chat;
use App\Models\Message;
use App\Models\Notification;
use Spatie\Permission\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Hash;
use Carbon\Carbon;

class AlphaTestingSeeder extends Seeder
{
    /**
     * Run the database seeds.
     * Requires: PermissionSeeder, RoleSeeder, ClientTypeSeeder, ProjectTypeSeeder, InventorySeeder
     */
    public function run(): void
    {
        $this->command->info('Starting alpha testing data seeding...');

        $adminUser = $this->createAdminUser();
        $this->call([InventorySeeder::class]);
        $staffUsers = $this->createStaffUsers($adminUser);
        $employees = $this->createEmployees();
        $clients = $this->createClients();
        $inventoryItems = \App\Models\InventoryItem::where('is_active', true)->get();
        $allUsers = User::all();

        if ($inventoryItems->isEmpty()) {
            $this->command->warn('No inventory items found. Material allocations will be skipped.');
        }

        $projects = $this->createProjects($clients, $staffUsers, $employees, $allUsers, $inventoryItems);
        $this->createBillings($projects, $staffUsers);
        $this->createChatsAndMessages($clients, $staffUsers);
        $this->createNotifications($staffUsers, $projects);

        $this->command->info('Alpha testing data seeding completed successfully!');
        $this->command->info('Test accounts: admin@alphasync.com / password, client@alphasync.com / password');
    }

    private function createAdminUser(): User
    {
        $adminUser = User::firstOrCreate(
            ['email' => 'admin@alphasync.com'],
            [
                'name' => 'Alpha Admin',
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]
        );
        $adminUser->password = Hash::make('password');
        $adminUser->save();
        $adminUser->syncRoles(['Admin']);
        $this->command->info('Admin user: admin@alphasync.com');
        return $adminUser;
    }

    private function createStaffUsers(User $adminUser): \Illuminate\Support\Collection
    {
        $staff = [
            ['name' => 'Project Manager Alpha', 'email' => 'pm@alphasync.com', 'role' => 'Project Manager'],
            ['name' => 'Finance Alpha', 'email' => 'finance@alphasync.com', 'role' => 'Finance Manager'],
            ['name' => 'Inventory Alpha', 'email' => 'inventory@alphasync.com', 'role' => 'Inventory Manager'],
            ['name' => 'Foreman Alpha', 'email' => 'foreman@alphasync.com', 'role' => 'Foreman'],
            ['name' => 'Field Worker Alpha', 'email' => 'field@alphasync.com', 'role' => 'Foreman'],
        ];

        $users = collect([$adminUser]);

        foreach ($staff as $data) {
            $user = User::firstOrCreate(
                ['email' => $data['email']],
                [
                    'name' => $data['name'],
                    'password' => Hash::make('password'),
                    'email_verified_at' => now(),
                ]
            );
            $user->syncRoles([$data['role']]);
            $users->push($user);
        }

        $this->command->info('Created ' . $users->count() . ' staff users');
        return $users;
    }

    private function createEmployees(): \Illuminate\Support\Collection
    {
        $employeesData = [
            ['first_name' => 'Juan', 'last_name' => 'Dela Cruz', 'email' => 'juan.delacruz@contractor.local', 'position' => 'Mason'],
            ['first_name' => 'Maria', 'last_name' => 'Santos', 'email' => 'maria.santos@contractor.local', 'position' => 'Electrician'],
            ['first_name' => 'Pedro', 'last_name' => 'Reyes', 'email' => 'pedro.reyes@contractor.local', 'position' => 'Plumber'],
        ];

        $employees = collect();
        foreach ($employeesData as $data) {
            $employee = Employee::firstOrCreate(
                ['email' => $data['email']],
                array_merge($data, [
                    'phone' => '+63' . rand(9000000000, 9999999999),
                    'is_active' => true,
                ])
            );
            $employees->push($employee);
        }

        $this->command->info('Created ' . $employees->count() . ' employees');
        return $employees;
    }

    private function createClients(): \Illuminate\Support\Collection
    {
        $corporationType = ClientType::where('name', 'Corporation')->first();
        $individualType = ClientType::where('name', 'Individual')->first();
        $governmentType = ClientType::where('name', 'Government')->first();

        $clients = collect();

        $testClient = Client::firstOrCreate(
            ['email' => 'client@alphasync.com'],
            [
                'client_code' => 'CLT-ALPHA',
                'client_name' => 'Alpha Test Corporation',
                'client_type_id' => $corporationType?->id,
                'contact_person' => 'Alpha Tester',
                'password' => Hash::make('password'),
                'password_changed_at' => now(),
                'phone_number' => '+639171234567',
                'address' => '123 Alpha Street',
                'city' => 'Manila',
                'province' => 'Metro Manila',
                'postal_code' => '1000',
                'country' => 'Philippines',
                'tax_id' => 'TIN-123-456-789',
                'credit_limit' => 5000000,
                'payment_terms' => 'Net 30',
                'is_active' => true,
            ]
        );
        $testClient->password = 'password';
        $testClient->save();
        $clients->push($testClient);

        $additionalClients = [
            ['client_code' => 'CLT-1001', 'client_name' => 'BuildRight Construction Inc.', 'client_type_id' => $corporationType?->id],
            ['client_code' => 'CLT-1002', 'client_name' => 'Metro City Government', 'client_type_id' => $governmentType?->id],
            ['client_code' => 'CLT-1003', 'client_name' => 'Roberto Garcia', 'client_type_id' => $individualType?->id],
            ['client_code' => 'CLT-1004', 'client_name' => 'Pacific Development Corp.', 'client_type_id' => $corporationType?->id],
        ];

        foreach ($additionalClients as $data) {
            $client = Client::firstOrCreate(
                ['client_code' => $data['client_code']],
                array_merge($data, [
                    'contact_person' => fake()->name(),
                    'email' => 'client' . substr($data['client_code'], -4) . '@alpha-test.com',
                    'phone_number' => '+63' . rand(9000000000, 9999999999),
                    'address' => fake()->streetAddress(),
                    'city' => fake()->randomElement(['Manila', 'Quezon City', 'Makati', 'Cebu City']),
                    'province' => 'Metro Manila',
                    'country' => 'Philippines',
                    'credit_limit' => rand(500000, 2000000),
                    'payment_terms' => fake()->randomElement(['Net 30', 'Net 15', 'Net 45']),
                    'is_active' => true,
                ])
            );
            $clients->push($client);
        }

        $this->command->info('Created ' . $clients->count() . ' clients');
        return $clients;
    }

    private function createProjects(
        \Illuminate\Support\Collection $clients,
        \Illuminate\Support\Collection $staffUsers,
        \Illuminate\Support\Collection $employees,
        \Illuminate\Support\Collection $allUsers,
        \Illuminate\Support\Collection $inventoryItems
    ): \Illuminate\Support\Collection {
        $projectTypes = ProjectType::where('is_active', true)->take(5)->get();
        $statuses = ['active', 'active', 'on_hold', 'completed'];
        $projects = collect();

        $projectConfigs = [
            ['name' => 'Residential Villa - Alpha Phase 1', 'status' => 'active', 'contract' => 2500000],
            ['name' => 'Office Renovation - Beta Tower', 'status' => 'active', 'contract' => 1800000],
            ['name' => 'Road Repair - Gamma District', 'status' => 'on_hold', 'contract' => 3500000],
            ['name' => 'Warehouse Construction - Delta Site', 'status' => 'completed', 'contract' => 4200000],
        ];

        foreach ($projectConfigs as $i => $config) {
            $projectCode = 'PRJ-ALPHA-' . str_pad($i + 1, 3, '0', STR_PAD_LEFT);
            $projectType = $projectTypes->get($i % $projectTypes->count()) ?? $projectTypes->first();
            $client = $clients->get($i % $clients->count());

            $startDate = Carbon::now()->subMonths(rand(2, 6));
            $plannedEndDate = $startDate->copy()->addMonths(rand(3, 6));
            $actualEndDate = $config['status'] === 'completed' ? $plannedEndDate->copy()->subDays(rand(0, 14)) : null;

            $project = Project::firstOrCreate(
                ['project_code' => $projectCode],
                [
                    'project_name' => $config['name'],
                    'client_id' => $client->id,
                    'project_type_id' => $projectType->id,
                    'status' => $config['status'],
                    'priority' => fake()->randomElement(['low', 'medium', 'high']),
                    'contract_amount' => $config['contract'],
                    'start_date' => $startDate,
                    'planned_end_date' => $plannedEndDate,
                    'actual_end_date' => $actualEndDate,
                    'location' => fake()->randomElement(['Manila', 'Makati', 'Quezon City', 'Taguig']) . ', Metro Manila',
                    'description' => 'Alpha testing project - ' . $config['name'],
                    'billing_type' => fake()->randomElement(['fixed_price', 'milestone']),
                ]
            );

            $teamUsers = $staffUsers->random(min(3, $staffUsers->count()));
            foreach ($teamUsers as $user) {
                ProjectTeam::firstOrCreate(
                    [
                        'project_id' => $project->id,
                        'user_id' => $user->id,
                        'role' => fake()->randomElement(['Project Manager', 'Engineer', 'Supervisor', 'Foreman']),
                    ],
                    [
                        'employee_id' => null,
                        'assignable_type' => 'user',
                        'hourly_rate' => rand(300, 800),
                        'start_date' => $startDate,
                        'end_date' => null,
                        'is_active' => true,
                    ]
                );
            }

            $teamEmployees = $employees->random(min(2, $employees->count()));
            foreach ($teamEmployees as $employee) {
                ProjectTeam::firstOrCreate(
                    [
                        'project_id' => $project->id,
                        'employee_id' => $employee->id,
                        'role' => $employee->position,
                    ],
                    [
                        'user_id' => null,
                        'assignable_type' => 'employee',
                        'hourly_rate' => rand(150, 400),
                        'start_date' => $startDate,
                        'end_date' => null,
                        'is_active' => true,
                    ]
                );
            }

            $milestones = $this->createMilestonesAndTasks($project, $teamUsers, $allUsers, $startDate, $plannedEndDate, $config['status']);
            $this->createMaterialAllocations($project, $inventoryItems, $allUsers);
            $this->createLaborCosts($project, $teamUsers, $employees, $allUsers, $startDate, $plannedEndDate);
            $this->createMiscellaneousExpenses($project, $allUsers, $startDate);
            $this->createIssues($project, $milestones, $allUsers);

            $projects->push($project);
        }

        $this->command->info('Created ' . $projects->count() . ' projects with full data');
        return $projects;
    }

    private function createMilestonesAndTasks(
        Project $project,
        \Illuminate\Support\Collection $teamUsers,
        \Illuminate\Support\Collection $allUsers,
        Carbon $startDate,
        Carbon $plannedEndDate,
        string $projectStatus
    ): \Illuminate\Support\Collection {
        $milestoneNames = ['Phase 1: Foundation', 'Phase 2: Structure', 'Phase 3: Finishing'];
        $milestones = collect();
        $interval = $startDate->diffInDays($plannedEndDate) / 4;

        foreach (array_slice($milestoneNames, 0, rand(2, 3)) as $idx => $name) {
            $dueDate = $startDate->copy()->addDays((int) ($interval * ($idx + 1)));
            $status = $projectStatus === 'completed' ? 'completed' :
                ($projectStatus === 'active' && $idx < 1 ? 'in_progress' : 'pending');

            $milestone = ProjectMilestone::create([
                'project_id' => $project->id,
                'name' => $name,
                'description' => "Alpha milestone: $name",
                'start_date' => $startDate->copy()->addDays((int) ($interval * $idx)),
                'due_date' => $dueDate,
                'billing_percentage' => 100 / 3,
                'status' => $status,
            ]);

            $taskTitles = ['Site preparation', 'Material delivery', 'Quality inspection'];
            foreach (array_slice($taskTitles, 0, rand(2, 3)) as $tIdx => $title) {
                ProjectTask::create([
                    'project_milestone_id' => $milestone->id,
                    'title' => $title,
                    'description' => "Task: $title",
                    'assigned_to' => $teamUsers->isNotEmpty() ? $teamUsers->random()->id : null,
                    'due_date' => $dueDate->copy()->subDays(rand(1, 5)),
                    'status' => $status,
                ]);
            }

            $milestones->push($milestone);
        }

        return $milestones;
    }

    private function createMaterialAllocations(
        Project $project,
        \Illuminate\Support\Collection $inventoryItems,
        \Illuminate\Support\Collection $users
    ): void {
        if ($inventoryItems->isEmpty()) {
            return;
        }

        $items = $inventoryItems->random(min(3, $inventoryItems->count()));
        foreach ($items as $item) {
            $qty = rand(10, 100);
            ProjectMaterialAllocation::firstOrCreate(
                [
                    'project_id' => $project->id,
                    'inventory_item_id' => $item->id,
                ],
                [
                    'quantity_allocated' => $qty,
                    'quantity_received' => rand(0, (int) $qty),
                    'status' => 'pending',
                    'allocated_by' => $users->random()->id ?? null,
                    'allocated_at' => $project->start_date,
                ]
            );
        }
    }

    private function createLaborCosts(
        Project $project,
        \Illuminate\Support\Collection $teamUsers,
        \Illuminate\Support\Collection $employees,
        \Illuminate\Support\Collection $allUsers,
        Carbon $startDate,
        Carbon $plannedEndDate
    ): void {
        $workDateEnd = $project->status === 'completed' ? $project->actual_end_date ?? $plannedEndDate : now();
        $entries = rand(3, 5);

        for ($i = 0; $i < $entries; $i++) {
            $workDate = Carbon::parse(fake()->dateTimeBetween($startDate, $workDateEnd));
            $useEmployee = fake()->boolean(40) && $employees->isNotEmpty();

            if ($useEmployee) {
                $employee = $employees->random();
                $hourlyRate = rand(150, 400);
                ProjectLaborCost::create([
                    'project_id' => $project->id,
                    'user_id' => null,
                    'employee_id' => $employee->id,
                    'assignable_type' => 'employee',
                    'work_date' => $workDate,
                    'hours_worked' => rand(4, 10) + (rand(0, 99) / 100),
                    'hourly_rate' => $hourlyRate,
                    'description' => 'Labor - ' . $employee->position,
                    'created_by' => $allUsers->random()->id ?? null,
                ]);
            } elseif ($teamUsers->isNotEmpty()) {
                $user = $teamUsers->random();
                $teamMember = ProjectTeam::where('project_id', $project->id)->where('user_id', $user->id)->first();
                $hourlyRate = $teamMember?->hourly_rate ?? rand(300, 600);
                ProjectLaborCost::create([
                    'project_id' => $project->id,
                    'user_id' => $user->id,
                    'employee_id' => null,
                    'assignable_type' => 'user',
                    'work_date' => $workDate,
                    'hours_worked' => rand(4, 8) + (rand(0, 99) / 100),
                    'hourly_rate' => $hourlyRate,
                    'description' => 'Labor - supervision',
                    'created_by' => $allUsers->random()->id ?? null,
                ]);
            }
        }
    }

    private function createMiscellaneousExpenses(
        Project $project,
        \Illuminate\Support\Collection $users,
        Carbon $startDate
    ): void {
        $expenses = [
            ['type' => 'transportation', 'name' => 'Site transportation', 'amount' => rand(2000, 8000)],
            ['type' => 'supplies', 'name' => 'Office supplies', 'amount' => rand(500, 3000)],
        ];

        foreach (array_slice($expenses, 0, rand(1, 2)) as $exp) {
            ProjectMiscellaneousExpense::create([
                'project_id' => $project->id,
                'expense_type' => $exp['type'],
                'expense_name' => $exp['name'],
                'expense_date' => Carbon::parse(fake()->dateTimeBetween($startDate, now())),
                'amount' => $exp['amount'],
                'description' => 'Alpha test expense',
                'created_by' => $users->random()->id ?? null,
            ]);
        }
    }

    private function createIssues(
        Project $project,
        \Illuminate\Support\Collection $milestones,
        \Illuminate\Support\Collection $users
    ): void {
        $count = rand(1, 2);
        for ($i = 0; $i < $count; $i++) {
            $milestone = $milestones->isNotEmpty() ? $milestones->random() : null;
            ProjectIssue::create([
                'project_id' => $project->id,
                'project_milestone_id' => $milestone?->id,
                'project_task_id' => null,
                'title' => 'Alpha test issue #' . ($i + 1),
                'description' => 'Issue for alpha testing workflow',
                'priority' => fake()->randomElement(['low', 'medium', 'high']),
                'status' => fake()->randomElement(['open', 'in_progress', 'resolved']),
                'reported_by' => $users->random()->id ?? null,
                'assigned_to' => $users->random()->id ?? null,
                'due_date' => now()->addDays(rand(5, 14)),
            ]);
        }
    }

    private function createBillings(\Illuminate\Support\Collection $projects, \Illuminate\Support\Collection $users): void
    {
        $paymentMethods = ['cash', 'check', 'bank_transfer', 'credit_card'];

        foreach ($projects as $project) {
            $milestones = ProjectMilestone::where('project_id', $project->id)->get();

            if ($project->billing_type === 'milestone' && $milestones->isNotEmpty()) {
                $selected = $milestones->random(min(2, $milestones->count()));
                foreach ($selected as $milestone) {
                    $amount = $project->contract_amount / max($milestones->count(), 1) * (0.8 + (rand(0, 40) / 100));
                    $billing = $this->createBilling($project, $users, $amount, 'milestone', $milestone->id);
                    $this->createPayments($billing, $users, $paymentMethods);
                }
            } else {
                $amount = $project->contract_amount * (0.3 + (rand(0, 40) / 100));
                $billing = $this->createBilling($project, $users, $amount, 'fixed_price', null);
                $this->createPayments($billing, $users, $paymentMethods);
            }
        }

        $this->command->info('Created billings and payments');
    }

    private function createBilling(
        Project $project,
        \Illuminate\Support\Collection $users,
        float $amount,
        string $type,
        ?int $milestoneId
    ): Billing {
        do {
            $code = 'BLG-ALPHA-' . str_pad(rand(1, 9999), 4, '0', STR_PAD_LEFT);
        } while (Billing::where('billing_code', $code)->exists());

        return Billing::create([
            'project_id' => $project->id,
            'billing_code' => $code,
            'billing_type' => $type,
            'milestone_id' => $milestoneId,
            'billing_amount' => round($amount, 2),
            'billing_date' => $project->start_date,
            'due_date' => Carbon::parse($project->start_date)->addDays(30),
            'status' => 'unpaid',
            'description' => 'Alpha billing',
            'created_by' => $users->random()->id ?? null,
        ]);
    }

    private function createPayments(
        Billing $billing,
        \Illuminate\Support\Collection $users,
        array $paymentMethods
    ): void {
        $toPay = $billing->billing_amount * (rand(50, 100) / 100);

        do {
            $code = 'PAY-ALPHA-' . str_pad(rand(1, 99999), 5, '0', STR_PAD_LEFT);
        } while (BillingPayment::where('payment_code', $code)->exists());

        BillingPayment::create([
            'billing_id' => $billing->id,
            'payment_code' => $code,
            'payment_amount' => round($toPay, 2),
            'payment_date' => Carbon::parse($billing->billing_date)->addDays(rand(1, 15)),
            'payment_method' => fake()->randomElement($paymentMethods),
            'payment_status' => 'paid',
            'reference_number' => 'REF-' . rand(100000, 999999),
            'notes' => 'Alpha test payment',
            'created_by' => $users->random()->id ?? null,
        ]);

        $billing->updateStatus();
    }

    private function createChatsAndMessages(
        \Illuminate\Support\Collection $clients,
        \Illuminate\Support\Collection $staffUsers
    ): void {
        if ($staffUsers->isEmpty()) {
            return;
        }

        $clientsWithPassword = $clients->filter(fn ($c) => $c->email === 'client@alphasync.com');
        $clientsToChat = $clientsWithPassword->isEmpty() ? $clients->take(2) : $clientsWithPassword;
        $adminUser = $staffUsers->first();

        foreach ($clientsToChat as $client) {
            $chat = Chat::firstOrCreate(
                ['client_id' => $client->id],
                [
                    'user_id' => $adminUser->id,
                    'last_message_at' => now(),
                ]
            );

            if ($chat->messages()->count() === 0) {
                Message::create([
                    'chat_id' => $chat->id,
                    'sender_type' => 'client',
                    'sender_id' => $client->id,
                    'message' => 'Hello, I have a question about my project.',
                    'read' => false,
                ]);

                Message::create([
                    'chat_id' => $chat->id,
                    'sender_type' => 'admin',
                    'sender_id' => $adminUser->id,
                    'message' => 'Thank you for reaching out. How can we help you today?',
                    'read' => true,
                    'read_at' => now(),
                ]);
            }
        }

        $this->command->info('Created chats and messages');
    }

    private function createNotifications(
        \Illuminate\Support\Collection $staffUsers,
        \Illuminate\Support\Collection $projects
    ): void {
        $types = ['milestone', 'status_change', 'task', 'update', 'issue'];
        $project = $projects->first();

        foreach ($staffUsers->take(3) as $user) {
            for ($i = 0; $i < rand(2, 4); $i++) {
                Notification::create([
                    'user_id' => $user->id,
                    'project_id' => $project?->id,
                    'type' => $types[$i % count($types)],
                    'title' => 'Alpha test notification #' . ($i + 1),
                    'message' => 'This is an alpha testing notification.',
                    'read' => (bool) rand(0, 1),
                    'link' => $project ? "/projects/{$project->id}" : null,
                ]);
            }
        }

        $this->command->info('Created notifications');
    }
}
