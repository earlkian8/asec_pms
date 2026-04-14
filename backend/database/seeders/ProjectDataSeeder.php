<?php

namespace Database\Seeders;

use App\Models\User;
use App\Models\Client;
use App\Models\Project;
use App\Models\ProjectTeam;
use App\Models\ProjectMilestone;
use App\Models\ProjectTask;
use App\Models\ProjectMaterialAllocation;
use App\Models\ProjectLaborCost;
use App\Models\Billing;
use App\Models\BillingPayment;
use Spatie\Permission\Models\Role;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;
use Carbon\Carbon;

class ProjectDataSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Starting data seeding...');

        // Create Users with different roles (9 users, test user already created)
        $this->command->info('Creating users with roles...');
        $users = $this->createUsersWithRoles(9);
        $this->command->info("Created {$users->count()} users with roles");

        // Get all users including test user
        $allUsers = User::all();

        // Create Clients (reduced to 10)
        $this->command->info('Creating clients...');
        $clients = $this->createClients(10);
        $this->command->info("Created {$clients->count()} clients");

        // Get existing inventory items
        $inventoryItems = \App\Models\InventoryItem::all();

        // Create Projects with all submodules (reduced to 5)
        $this->command->info('Creating projects with all submodules...');
        $projects = $this->createProjects($clients, $allUsers, $inventoryItems, 5);
        $this->command->info("Created {$projects->count()} projects with all related data");

        // Create Billings for billable projects (reduced)
        $this->command->info('Creating billings...');
        $billings = $this->createBillings($projects, $allUsers);
        $this->command->info("Created {$billings->count()} billings with payments");

        $this->command->info('Data seeding completed successfully!');
    }

    private function createUsersWithRoles($count)
    {
        $roles = [
            'Admin',
            'Project Manager',
            'Finance Manager',
            'Inventory Manager',
            'Team Member',
            'HR Manager',
            'Sales Manager',
            'Viewer',
            'Admin', // Second admin for variety
        ];

        $users = collect();
        $names = [
            'John Doe',
            'Jane Smith',
            'Mike Johnson',
            'Sarah Williams',
            'David Brown',
            'Emily Davis',
            'Chris Wilson',
            'Lisa Anderson',
            'Tom Martinez',
        ];

        for ($i = 0; $i < $count; $i++) {
            $roleName = $roles[$i] ?? 'Team Member';
            $name = $names[$i] ?? fake()->name();
            
            // Generate unique email
            $baseEmail = strtolower(str_replace(' ', '.', $name));
            $email = $baseEmail . '@example.com';
            $counter = 1;
            while (User::where('email', $email)->exists()) {
                $email = $baseEmail . $counter . '@example.com';
                $counter++;
            }
            
            $user = User::create([
                'name' => $name,
                'email' => $email,
                'password' => Hash::make('password'),
                'email_verified_at' => now(),
            ]);

            $role = Role::where('name', $roleName)->first();
            if ($role) {
                $user->assignRole($role);
                Cache::forget("user_permissions_{$user->id}");
            }

            $users->push($user);
        }

        return $users;
    }

    private function createClients($count)
    {
        $clientTypes = ['individual', 'corporation', 'government', 'ngo'];
        $cities = ['Manila', 'Quezon City', 'Makati', 'Taguig', 'Pasig', 'Mandaluyong', 'San Juan', 'Pasay', 'Parañaque', 'Las Piñas'];
        $provinces = ['Metro Manila', 'Cavite', 'Laguna', 'Rizal', 'Bulacan', 'Pampanga', 'Batangas'];
        $countries = ['Philippines'];
        $paymentTerms = ['Net 30', 'Net 15', 'Net 45', 'Net 60', 'COD', '50% Down, 50% on Completion'];

        $clients = collect();
        
        // Create test client first
        $testClient = Client::firstOrCreate(
            ['email' => 'earlkian8@gmail.com'],
            [
                'client_code' => 'CLT-TEST',
                'client_name' => 'Test Client Account',
                'client_type' => 'corporation',
                'contact_person' => 'Earl Kian',
                'password' => Hash::make('password'),
                'phone_number' => '+639123456789',
                'address' => 'Tugbungan',
                'region' => 'Region IX',
                'city' => 'Zamboanga City',
                'province' => 'Zamboanga del Sur',
                'city_municipality' => 'Zamboanga City',
                'barangay' => 'Tugbungan',
                'postal_code' => '7000',
                'zip_code' => '7000',
                'country' => 'Philippines',
                'is_active' => true,
            ]
        );
        
        // Always update password to ensure it's correct
        $testClient->password = Hash::make('password');
        $testClient->is_active = true;
        $testClient->save();
        
        $clients->push($testClient);
        
        // Create remaining clients
        for ($i = 0; $i < $count - 1; $i++) {
            do {
                $random = str_pad(rand(1, 999), 3, '0', STR_PAD_LEFT);
                $clientCode = 'CLT-' . $random;
            } while (Client::where('client_code', $clientCode)->exists());

            $clientType = fake()->randomElement($clientTypes);
            $isCorporation = $clientType === 'corporation';
            $cityMunicipality = fake()->randomElement($cities);
            $zipCode = fake()->numerify('####');

            $clients->push(Client::create([
                'client_code' => $clientCode,
                'client_name' => $this->generateClientName($clientType, $i),
                'client_type' => $clientType,
                'contact_person' => fake()->name(),
                'email' => fake()->unique()->safeEmail(),
                'phone_number' => '+63' . fake()->numerify('9#########'),
                'address' => fake()->streetAddress(),
                'region' => fake()->randomElement(['NCR', 'Region III', 'Region IV-A']),
                'city' => $cityMunicipality,
                'province' => fake()->randomElement($provinces),
                'city_municipality' => $cityMunicipality,
                'barangay' => fake()->citySuffix(),
                'postal_code' => $zipCode,
                'zip_code' => $zipCode,
                'country' => fake()->randomElement($countries),
                'is_active' => fake()->boolean(85), // 85% chance of being active
                'notes' => fake()->optional(0.6)->sentence(),
            ]));
        }

        return $clients;
    }

    private function generateClientName($type, $index)
    {
        $patterns = [
            'individual' => [
                fn() => fake()->name() . ' ' . fake()->randomElement(['Construction', 'Trading', 'Services', 'Consulting']),
                fn() => fake()->company() . ' ' . fake()->randomElement(['Group', 'Enterprises', 'Holdings']),
            ],
            'corporation' => [
                fn() => fake()->company() . ' ' . fake()->randomElement(['Inc.', 'Corp.', 'Corporation', 'Ltd.']),
                fn() => fake()->words(2, true) . ' ' . fake()->randomElement(['Industries', 'Solutions', 'Systems', 'Technologies']),
            ],
            'government' => [
                fn() => fake()->randomElement(['Department of', 'Bureau of', 'Office of']) . ' ' . fake()->words(2, true),
                fn() => fake()->city() . ' ' . fake()->randomElement(['City Government', 'Municipal Government', 'Provincial Government']),
            ],
            'ngo' => [
                fn() => fake()->words(2, true) . ' ' . fake()->randomElement(['Foundation', 'Foundation Inc.', 'Charity', 'Organization']),
                fn() => fake()->words(3, true) . ' ' . fake()->randomElement(['Network', 'Alliance', 'Coalition']),
            ],
        ];

        $generator = fake()->randomElement($patterns[$type]);
        return $generator();
    }

    private function createProjects($clients, $users, $inventoryItems, $count)
    {
        $projectTypes = ['design', 'construction', 'consultancy', 'maintenance', 'structural', 'civil', 'mechanical', 'electrical', 'environmental', 'geotechnical', 'surveying'];
        $statuses = ['active', 'on_hold', 'completed', 'cancelled'];
        $priorities = ['low', 'medium', 'high'];
        $billingTypes = ['fixed_price', 'milestone'];
        $locations = [
            'Manila, Metro Manila',
            'Makati, Metro Manila',
            'Quezon City, Metro Manila',
            'Taguig, Metro Manila',
            'Pasig, Metro Manila',
            'Cavite City, Cavite',
            'Calamba, Laguna',
            'Antipolo, Rizal',
            'San Fernando, Pampanga',
            'Batangas City, Batangas',
        ];

        $roles = ['Project Manager', 'Architect', 'Engineer', 'Designer', 'Developer', 'Supervisor', 'Foreman', 'Worker', 'Consultant', 'Analyst'];

        $projects = collect();

        for ($i = 0; $i < $count; $i++) {
            // Generate unique project code
            do {
                $random = str_pad(rand(1, 999999), 6, '0', STR_PAD_LEFT);
                $projectCode = 'PRJ-' . $random;
            } while (Project::where('project_code', $projectCode)->exists());

            $projectType = fake()->randomElement($projectTypes);
            $status = fake()->randomElement($statuses);
            $priority = fake()->randomElement($priorities);
            $billingType = fake()->randomElement($billingTypes);
            $client = $clients->random();
            
            $startDateObj = fake()->dateTimeBetween('-2 years', 'now');
            $startDate = Carbon::parse($startDateObj);
            // Ensure planned end date is at least 30 days after start date
            $minEndDate = $startDate->copy()->addDays(30);
            $maxEndDate = $startDate->copy()->addYear();
            // Make sure maxEndDate is not in the past
            if ($maxEndDate->isPast()) {
                $maxEndDate = now()->addDays(30);
            }
            $plannedEndDate = Carbon::parse(fake()->dateTimeBetween($minEndDate->toDateTimeString(), $maxEndDate->toDateTimeString()));
            
            // Ensure actual end date is between start and planned end
            $actualEndDate = null;
            if ($status === 'completed' && fake()->boolean(80)) {
                $actualEndDate = Carbon::parse(fake()->dateTimeBetween($startDate->toDateTimeString(), $plannedEndDate->toDateTimeString()));
            }
            
            // Set contract amount higher to ensure revenue > expenses
            // Contract amount will be used as base for billing (revenue)
            // We'll ensure expenses stay below 70% of contract amount
            $contractAmount = fake()->randomFloat(2, 1000000, 10000000);

            $project = Project::create([
                'project_code' => $projectCode,
                'project_name' => $this->generateProjectName($projectType, $i),
                'client_id' => $client->id,
                'project_type' => $projectType,
                'status' => $status,
                'priority' => $priority,
                'contract_amount' => $contractAmount,
                'start_date' => $startDate->toDateString(),
                'planned_end_date' => $plannedEndDate->toDateString(),
                'actual_end_date' => $actualEndDate?->toDateString(),
                'location' => fake()->randomElement($locations),
                'description' => fake()->optional(0.8)->paragraph(),
                'billing_type' => $billingType,
            ]);

            // Create Team Members (2-5 members per project, reduced)
            $teamCount = fake()->numberBetween(2, 5);
            $selectedUsers = $users->random($teamCount);
            $teamStartDate = $startDate;

            foreach ($selectedUsers as $user) {
                // Team start date should be between project start and planned end
                $maxTeamStart = $plannedEndDate->copy()->subDays(1);
                if ($maxTeamStart->lte($startDate)) {
                    $maxTeamStart = $startDate->copy()->addDays(7);
                }
                $teamStartDate = Carbon::parse(fake()->dateTimeBetween($startDate->toDateTimeString(), $maxTeamStart->toDateTimeString()));
                
                // Team end date should be after team start and before planned end
                $teamEndDate = null;
                if (fake()->boolean(30) && $teamStartDate->lt($plannedEndDate)) {
                    $teamEndDate = Carbon::parse(fake()->dateTimeBetween($teamStartDate->copy()->addDay()->toDateTimeString(), $plannedEndDate->toDateTimeString()));
                }
                
                ProjectTeam::create([
                    'project_id' => $project->id,
                    'user_id' => $user->id,
                    'role' => fake()->randomElement($roles),
                    'hourly_rate' => fake()->randomFloat(2, 200, 2000),
                    'start_date' => $teamStartDate->toDateString(),
                    'end_date' => $teamEndDate?->toDateString(),
                    'is_active' => fake()->boolean(85),
                ]);
            }

            // Create Milestones (2-4 milestones per project, reduced)
            $milestoneCount = fake()->numberBetween(2, 4);
            $milestoneDates = $this->generateMilestoneDates($startDate, $plannedEndDate, $milestoneCount);
            $milestones = collect();

            foreach ($milestoneDates as $index => $dueDate) {
                $milestoneStatus = $status === 'completed' ? 'completed' :
                                 ($status === 'active' && $index < $milestoneCount / 2 ? 
                                 fake()->randomElement(['completed', 'in_progress']) : 
                                 fake()->randomElement(['pending', 'in_progress']));

                $milestone = ProjectMilestone::create([
                    'project_id' => $project->id,
                    'name' => $this->generateMilestoneName($projectType, $index, $milestoneCount),
                    'description' => fake()->optional(0.7)->sentence(),
                    'due_date' => $dueDate->toDateString(),
                    'status' => $milestoneStatus,
                ]);

                $milestones->push($milestone);

                // Create Tasks for each milestone (2-4 tasks per milestone, reduced)
                $taskCount = fake()->numberBetween(2, 4);
                $taskUsers = $selectedUsers->random(min(3, $selectedUsers->count()));

                for ($t = 0; $t < $taskCount; $t++) {
                    // Ensure task due date is between start date and milestone due date
                    $taskMinDate = $startDate->copy();
                    $taskMaxDate = $dueDate->copy();
                    
                    // If milestone due date is before or equal to start date, adjust
                    if ($taskMaxDate->lte($taskMinDate)) {
                        $taskMaxDate = $taskMinDate->copy()->addDays(30);
                    }
                    
                    $taskDueDate = Carbon::parse(fake()->dateTimeBetween($taskMinDate->toDateTimeString(), $taskMaxDate->toDateTimeString()));
                    $taskStatus = $milestoneStatus === 'completed' ? 'completed' :
                                 ($milestoneStatus === 'in_progress' && $t < $taskCount / 2 ? 
                                 fake()->randomElement(['completed', 'in_progress']) : 'pending');

                    ProjectTask::create([
                        'project_milestone_id' => $milestone->id,
                        'title' => $this->generateTaskTitle($projectType, $t),
                        'description' => fake()->optional(0.6)->sentence(),
                        'assigned_to' => fake()->boolean(80) ? $taskUsers->random()->id : null,
                        'due_date' => $taskDueDate->toDateString(),
                        'status' => $taskStatus,
                    ]);
                }
            }

            // Create Material Allocations (2-5 items per project, reduced)
            // Limit material costs to ensure they don't exceed contract amount
            // Material costs should be max 30% of contract amount
            $maxMaterialCost = $contractAmount * 0.30;
            $allocationCount = fake()->numberBetween(2, 5);
            $selectedItems = $inventoryItems->where('is_active', true)->random($allocationCount);
            $totalMaterialCost = 0;

            foreach ($selectedItems as $item) {
                // Calculate max quantity based on remaining budget
                $remainingBudget = $maxMaterialCost - $totalMaterialCost;
                $maxQuantityByBudget = $remainingBudget > 0 ? ($remainingBudget / max($item->unit_price, 1)) : 0;
                $maxQuantity = min(500, $maxQuantityByBudget, ($maxMaterialCost / max($item->unit_price, 1)) / $allocationCount);
                
                $quantityAllocated = fake()->randomFloat(2, 10, max(10, $maxQuantity));
                $quantityReceived = fake()->randomFloat(2, 0, $quantityAllocated);
                
                // Track material cost
                $totalMaterialCost += $quantityAllocated * $item->unit_price;
                
                $allocationStatus = $quantityReceived >= $quantityAllocated ? 'received' :
                                   ($quantityReceived > 0 ? 'partial' : 'pending');

                // Ensure allocated_at is between start date and now
                $allocatedAtMin = $startDate->copy();
                $allocatedAtMax = now();
                if ($allocatedAtMax->lte($allocatedAtMin)) {
                    $allocatedAtMax = $allocatedAtMin->copy()->addDays(1);
                }
                $allocatedAt = Carbon::parse(fake()->dateTimeBetween($allocatedAtMin->toDateTimeString(), $allocatedAtMax->toDateTimeString()));

                ProjectMaterialAllocation::create([
                    'project_id' => $project->id,
                    'inventory_item_id' => $item->id,
                    'quantity_allocated' => $quantityAllocated,
                    'quantity_received' => $quantityReceived,
                    'status' => $allocationStatus,
                    'allocated_by' => $users->random()->id,
                    'allocated_at' => $allocatedAt,
                    'notes' => fake()->optional(0.4)->sentence(),
                ]);
            }

            // Create Labor Costs (5-15 entries per project, reduced)
            // Limit labor costs to ensure total expenses < contract amount
            // Labor costs should be max 40% of contract amount
            $maxLaborCost = $contractAmount * 0.40;
            $laborCostCount = fake()->numberBetween(5, 15);
            $projectUsers = $selectedUsers;
            $totalLaborCost = 0;

            for ($l = 0; $l < $laborCostCount; $l++) {
                // Determine max date for work date
                $maxDate = $plannedEndDate->isFuture() ? now() : $plannedEndDate;
                
                // Ensure maxDate is after startDate
                if ($maxDate->lte($startDate)) {
                    $maxDate = $startDate->copy()->addDays(30);
                }
                
                $workDate = Carbon::parse(fake()->dateTimeBetween($startDate->toDateTimeString(), $maxDate->toDateTimeString()));
                $user = $projectUsers->random();
                
                // Get user's hourly rate from team or generate random
                $teamMember = ProjectTeam::where('project_id', $project->id)
                    ->where('user_id', $user->id)
                    ->first();
                $hourlyRate = $teamMember?->hourly_rate ?? fake()->randomFloat(2, 200, 2000);
                
                // Calculate remaining labor budget
                $remainingLaborBudget = $maxLaborCost - $totalLaborCost;
                $maxHours = $remainingLaborBudget > 0 ? min(12, ($remainingLaborBudget / max($hourlyRate, 1)) / max(1, $laborCostCount - $l)) : 0;
                $hoursWorked = fake()->randomFloat(2, 1, max(1, $maxHours));
                
                // Track labor cost
                $totalLaborCost += $hoursWorked * $hourlyRate;

                ProjectLaborCost::create([
                    'project_id' => $project->id,
                    'user_id' => $user->id,
                    'work_date' => $workDate->toDateString(),
                    'hours_worked' => $hoursWorked,
                    'hourly_rate' => $hourlyRate,
                    'description' => fake()->optional(0.7)->sentence(),
                    'notes' => fake()->optional(0.3)->sentence(),
                    'created_by' => $users->random()->id,
                ]);
            }

            $projects->push($project);
        }

        return $projects;
    }

    private function generateProjectName($type, $index)
    {
        $patterns = [
            'design' => [
                fn() => fake()->words(2, true) . ' ' . fake()->randomElement(['Design Project', 'Design Studio', 'Architectural Design']),
                fn() => fake()->company() . ' ' . fake()->randomElement(['Office Design', 'Interior Design', 'Building Design']),
            ],
            'construction' => [
                fn() => fake()->words(2, true) . ' ' . fake()->randomElement(['Construction', 'Building Project', 'Development']),
                fn() => fake()->city() . ' ' . fake()->randomElement(['Residential Complex', 'Commercial Building', 'Infrastructure Project']),
            ],
            'consultancy' => [
                fn() => fake()->words(2, true) . ' ' . fake()->randomElement(['Consulting', 'Advisory Services', 'Consultancy Project']),
                fn() => fake()->company() . ' ' . fake()->randomElement(['Strategic Planning', 'Business Consulting', 'Technical Advisory']),
            ],
            'maintenance' => [
                fn() => fake()->words(2, true) . ' ' . fake()->randomElement(['Maintenance', 'Facility Management', 'Upkeep Project']),
                fn() => fake()->company() . ' ' . fake()->randomElement(['Building Maintenance', 'Equipment Maintenance', 'Property Maintenance']),
            ],
            'structural' => [
                fn() => fake()->words(2, true) . ' ' . fake()->randomElement(['Structural Engineering', 'Structural Analysis', 'Structural Design']),
                fn() => fake()->company() . ' ' . fake()->randomElement(['Structural Assessment', 'Structural Evaluation', 'Structural Project']),
            ],
            'civil' => [
                fn() => fake()->words(2, true) . ' ' . fake()->randomElement(['Civil Engineering', 'Civil Works', 'Civil Infrastructure']),
                fn() => fake()->city() . ' ' . fake()->randomElement(['Road Project', 'Bridge Project', 'Civil Development']),
            ],
            'mechanical' => [
                fn() => fake()->words(2, true) . ' ' . fake()->randomElement(['Mechanical Engineering', 'Mechanical Systems', 'MEP Project']),
                fn() => fake()->company() . ' ' . fake()->randomElement(['HVAC Installation', 'Mechanical Design', 'Mechanical Works']),
            ],
            'electrical' => [
                fn() => fake()->words(2, true) . ' ' . fake()->randomElement(['Electrical Engineering', 'Electrical Systems', 'Electrical Installation']),
                fn() => fake()->company() . ' ' . fake()->randomElement(['Electrical Design', 'Power Systems', 'Electrical Works']),
            ],
            'environmental' => [
                fn() => fake()->words(2, true) . ' ' . fake()->randomElement(['Environmental Assessment', 'Environmental Study', 'Environmental Project']),
                fn() => fake()->company() . ' ' . fake()->randomElement(['Environmental Impact', 'Environmental Consulting', 'Environmental Services']),
            ],
            'geotechnical' => [
                fn() => fake()->words(2, true) . ' ' . fake()->randomElement(['Geotechnical Engineering', 'Soil Analysis', 'Geotechnical Study']),
                fn() => fake()->company() . ' ' . fake()->randomElement(['Geotechnical Investigation', 'Foundation Analysis', 'Geotechnical Assessment']),
            ],
            'surveying' => [
                fn() => fake()->words(2, true) . ' ' . fake()->randomElement(['Surveying Project', 'Land Survey', 'Topographic Survey']),
                fn() => fake()->city() . ' ' . fake()->randomElement(['Site Survey', 'Boundary Survey', 'Surveying Services']),
            ],
        ];

        // Fallback pattern for any type not in the patterns array
        $fallbackPatterns = [
            fn() => fake()->words(2, true) . ' ' . ucfirst($type) . ' Project',
            fn() => fake()->company() . ' ' . ucfirst($type) . ' Services',
        ];

        if (isset($patterns[$type])) {
            $generator = fake()->randomElement($patterns[$type]);
        } else {
            $generator = fake()->randomElement($fallbackPatterns);
        }
        
        return $generator();
    }

    private function generateMilestoneDates($startDate, $endDate, $count)
    {
        $dates = collect();
        $start = Carbon::parse($startDate);
        $end = Carbon::parse($endDate);
        
        // Ensure end is after start
        if ($end->lte($start)) {
            $end = $start->copy()->addDays(30);
        }
        
        $totalDays = $start->diffInDays($end);
        
        // If total days is too small, ensure minimum spacing
        if ($totalDays < $count) {
            $end = $start->copy()->addDays($count * 7);
            $totalDays = $start->diffInDays($end);
        }
        
        $interval = $totalDays / ($count + 1);
        
        for ($i = 1; $i <= $count; $i++) {
            $baseDate = $start->copy()->addDays($interval * $i);
            // Add some randomness but ensure it stays within bounds
            $randomOffset = fake()->numberBetween(-min(7, $interval / 2), min(7, $interval / 2));
            $baseDate->addDays($randomOffset);
            
            // Ensure date is between start and end
            if ($baseDate->lt($start)) {
                $baseDate = $start->copy()->addDays(1);
            }
            if ($baseDate->gt($end)) {
                $baseDate = $end->copy()->subDays(1);
            }
            
            $dates->push($baseDate);
        }

        return $dates->sort()->values();
    }

    private function generateMilestoneName($projectType, $index, $total)
    {
        $patterns = [
            'design' => ['Phase 1: Conceptual Design', 'Phase 2: Detailed Design', 'Phase 3: Final Design', 'Design Review', 'Design Approval'],
            'construction' => ['Phase 1: Foundation', 'Phase 2: Structure', 'Phase 3: Finishing', 'Phase 4: MEP', 'Phase 5: Handover'],
            'consultancy' => ['Phase 1: Assessment', 'Phase 2: Planning', 'Phase 3: Implementation', 'Phase 4: Review', 'Phase 5: Completion'],
            'maintenance' => ['Phase 1: Inspection', 'Phase 2: Repairs', 'Phase 3: Upgrades', 'Phase 4: Testing', 'Phase 5: Documentation'],
            'structural' => ['Phase 1: Site Investigation', 'Phase 2: Structural Design', 'Phase 3: Analysis', 'Phase 4: Review', 'Phase 5: Approval'],
            'civil' => ['Phase 1: Planning', 'Phase 2: Site Preparation', 'Phase 3: Construction', 'Phase 4: Testing', 'Phase 5: Completion'],
            'mechanical' => ['Phase 1: Design', 'Phase 2: Procurement', 'Phase 3: Installation', 'Phase 4: Testing', 'Phase 5: Commissioning'],
            'electrical' => ['Phase 1: Design', 'Phase 2: Procurement', 'Phase 3: Installation', 'Phase 4: Testing', 'Phase 5: Commissioning'],
            'environmental' => ['Phase 1: Assessment', 'Phase 2: Analysis', 'Phase 3: Reporting', 'Phase 4: Review', 'Phase 5: Approval'],
            'geotechnical' => ['Phase 1: Site Investigation', 'Phase 2: Soil Analysis', 'Phase 3: Report', 'Phase 4: Review', 'Phase 5: Recommendations'],
            'surveying' => ['Phase 1: Planning', 'Phase 2: Field Work', 'Phase 3: Data Processing', 'Phase 4: Mapping', 'Phase 5: Final Report'],
        ];

        $baseNames = $patterns[$projectType] ?? ['Phase 1: Planning', 'Phase 2: Execution', 'Phase 3: Review', 'Phase 4: Completion'];
        
        if ($index < count($baseNames)) {
            return $baseNames[$index];
        }

        return 'Phase ' . ($index + 1) . ': ' . fake()->words(2, true);
    }

    private function generateTaskTitle($projectType, $index)
    {
        $tasks = [
            'design' => ['Create initial sketches', 'Develop 3D models', 'Prepare design documents', 'Review design specifications', 'Finalize design plans'],
            'construction' => ['Site preparation', 'Foundation work', 'Structural framing', 'Electrical installation', 'Plumbing installation', 'Finishing work'],
            'consultancy' => ['Client meeting', 'Data analysis', 'Report preparation', 'Presentation', 'Implementation planning'],
            'maintenance' => ['Equipment inspection', 'Routine maintenance', 'Repair work', 'Parts replacement', 'System testing'],
            'structural' => ['Site investigation', 'Load analysis', 'Structural calculations', 'Design review', 'Documentation'],
            'civil' => ['Site survey', 'Earthwork', 'Drainage design', 'Road construction', 'Quality control'],
            'mechanical' => ['System design', 'Equipment selection', 'Installation planning', 'HVAC installation', 'System testing'],
            'electrical' => ['Electrical design', 'Load calculation', 'Wiring installation', 'Panel installation', 'System testing'],
            'environmental' => ['Environmental assessment', 'Data collection', 'Impact analysis', 'Report writing', 'Compliance review'],
            'geotechnical' => ['Soil sampling', 'Laboratory testing', 'Data analysis', 'Report preparation', 'Recommendations'],
            'surveying' => ['Field survey', 'Data collection', 'GPS mapping', 'Data processing', 'Report generation'],
        ];

        $baseTasks = $tasks[$projectType] ?? ['Planning', 'Execution', 'Review', 'Documentation', 'Completion'];
        
        if ($index < count($baseTasks)) {
            return $baseTasks[$index];
        }

        return fake()->words(3, true);
    }

    private function createBillings($projects, $users)
    {
        $billings = collect();
        $paymentMethods = ['cash', 'check', 'bank_transfer', 'credit_card', 'other'];
        
        // Create billings for all projects
        foreach ($projects as $project) {
            $milestones = ProjectMilestone::where('project_id', $project->id)->get();
            
            // Determine how many billings to create based on project type
            if ($project->billing_type === 'milestone' && $milestones->count() > 0) {
                // Create billings for some milestones (60-80% of milestones)
                $milestonesToBill = $milestones->random(fake()->numberBetween(
                    max(1, (int)($milestones->count() * 0.6)),
                    min($milestones->count(), (int)($milestones->count() * 0.8))
                ));
                
                foreach ($milestonesToBill as $milestone) {
                    // Generate unique billing code
                    do {
                        $random = str_pad(rand(1, 999999), 6, '0', STR_PAD_LEFT);
                        $billingCode = 'BLG-' . $random;
                    } while (Billing::where('billing_code', $billingCode)->exists());
                    
                    // Billing amount based on milestone (portion of contract)
                    // Ensure billing amounts are substantial (revenue should be higher than expenses)
                    $milestonePortion = $project->contract_amount / $milestones->count();
                    // Set billing amount to 90-110% of milestone portion to ensure good revenue
                    $billingAmount = fake()->randomFloat(2, $milestonePortion * 0.9, $milestonePortion * 1.1);
                    
                    // Billing date should be around milestone due date
                    $billingDateMin = Carbon::parse($project->start_date);
                    $billingDateMax = Carbon::parse($milestone->due_date);
                    if ($billingDateMax->lte($billingDateMin)) {
                        $billingDateMax = $billingDateMin->copy()->addDays(30);
                    }
                    $billingDate = Carbon::parse(fake()->dateTimeBetween(
                        $billingDateMin->toDateTimeString(),
                        $billingDateMax->toDateTimeString()
                    ));
                    $dueDate = Carbon::parse(fake()->dateTimeBetween(
                        $billingDate->copy()->addDay()->toDateTimeString(),
                        $billingDate->copy()->addDays(30)->toDateTimeString()
                    ));
                    
                    // Random status (weighted: 30% unpaid, 20% partial, 50% paid)
                    $statusRoll = fake()->numberBetween(1, 100);
                    $status = $statusRoll <= 30 ? 'unpaid' : ($statusRoll <= 50 ? 'partial' : 'paid');
                    
                    $billing = Billing::create([
                        'project_id' => $project->id,
                        'billing_code' => $billingCode,
                        'billing_type' => 'milestone',
                        'milestone_id' => $milestone->id,
                        'billing_amount' => $billingAmount,
                        'billing_date' => $billingDate->toDateString(),
                        'due_date' => $dueDate->toDateString(),
                        'status' => $status,
                        'description' => fake()->optional(0.6)->sentence(),
                        'created_by' => $users->random()->id,
                    ]);
                    
                    $billings->push($billing);
                    
                    // Create payments based on status
                    $this->createPaymentsForBilling($billing, $status, $users, $paymentMethods);
                }
            } else {
                // Fixed price billing - create 1-3 billings that don't exceed contract amount
                $billingCount = fake()->numberBetween(1, 3);
                $remainingContract = $project->contract_amount;
                
                for ($i = 0; $i < $billingCount && $remainingContract > 0; $i++) {
                    // Generate unique billing code
                    do {
                        $random = str_pad(rand(1, 999999), 6, '0', STR_PAD_LEFT);
                        $billingCode = 'BLG-' . $random;
                    } while (Billing::where('billing_code', $billingCode)->exists());
                    
                    // Calculate billing amount (last billing gets remaining, others get portion)
                    if ($i === $billingCount - 1) {
                        $billingAmount = $remainingContract;
                    } else {
                        $maxAmount = $remainingContract * 0.6; // Max 60% per billing
                        $billingAmount = fake()->randomFloat(2, $remainingContract * 0.2, $maxAmount);
                    }
                    
                    $remainingContract -= $billingAmount;
                    
                    // Billing date should be within project timeline
                    $billingDateMin = Carbon::parse($project->start_date);
                    $billingDateMax = Carbon::parse(min($project->planned_end_date, now()));
                    if ($billingDateMax->lte($billingDateMin)) {
                        $billingDateMax = $billingDateMin->copy()->addDays(30);
                    }
                    $billingDate = Carbon::parse(fake()->dateTimeBetween(
                        $billingDateMin->toDateTimeString(),
                        $billingDateMax->toDateTimeString()
                    ));
                    $dueDate = Carbon::parse(fake()->dateTimeBetween(
                        $billingDate->copy()->addDay()->toDateTimeString(),
                        $billingDate->copy()->addDays(45)->toDateTimeString()
                    ));
                    
                    // Random status (weighted: 30% unpaid, 20% partial, 50% paid)
                    $statusRoll = fake()->numberBetween(1, 100);
                    $status = $statusRoll <= 30 ? 'unpaid' : ($statusRoll <= 50 ? 'partial' : 'paid');
                    
                    $billing = Billing::create([
                        'project_id' => $project->id,
                        'billing_code' => $billingCode,
                        'billing_type' => 'fixed_price',
                        'milestone_id' => null,
                        'billing_amount' => $billingAmount,
                        'billing_date' => $billingDate->toDateString(),
                        'due_date' => $dueDate->toDateString(),
                        'status' => $status,
                        'description' => fake()->optional(0.6)->sentence(),
                        'created_by' => $users->random()->id,
                    ]);
                    
                    $billings->push($billing);
                    
                    // Create payments based on status
                    $this->createPaymentsForBilling($billing, $status, $users, $paymentMethods);
                }
            }
        }
        
        return $billings;
    }

    private function createPaymentsForBilling($billing, $status, $users, $paymentMethods)
    {
        if ($status === 'unpaid') {
            // No payments for unpaid billings
            return;
        }
        
        $totalPaid = 0;
        $targetAmount = $status === 'paid' ? $billing->billing_amount : 
                       ($billing->billing_amount * fake()->randomFloat(2, 0.3, 0.9));
        
        // Create 1-3 payments
        $paymentCount = fake()->numberBetween(1, 3);
        
        for ($i = 0; $i < $paymentCount; $i++) {
            // Last payment should cover remaining amount
            if ($i === $paymentCount - 1) {
                $paymentAmount = $targetAmount - $totalPaid;
            } else {
                $remaining = $targetAmount - $totalPaid;
                $maxPayment = $remaining * 0.7; // Max 70% per payment
                $paymentAmount = fake()->randomFloat(2, $remaining * 0.2, $maxPayment);
            }
            
            // Ensure payment doesn't exceed billing amount
            if ($totalPaid + $paymentAmount > $billing->billing_amount) {
                $paymentAmount = $billing->billing_amount - $totalPaid;
            }
            
            if ($paymentAmount <= 0) {
                break;
            }
            
            // Generate unique payment code
            do {
                $random = str_pad(rand(1, 999999), 6, '0', STR_PAD_LEFT);
                $paymentCode = 'PAY-' . $random;
            } while (BillingPayment::where('payment_code', $paymentCode)->exists());
            
            // Payment date should be after billing date
            $paymentDateMin = Carbon::parse($billing->billing_date);
            $paymentDateMax = $billing->due_date ? 
                Carbon::parse(min(now(), $billing->due_date)) : 
                now();
            
            if ($paymentDateMax->lte($paymentDateMin)) {
                $paymentDateMax = $paymentDateMin->copy()->addDays(1);
            }
            
            $paymentDate = Carbon::parse(fake()->dateTimeBetween(
                $paymentDateMin->toDateTimeString(),
                $paymentDateMax->toDateTimeString()
            ));
            
            BillingPayment::create([
                'billing_id' => $billing->id,
                'payment_code' => $paymentCode,
                'payment_amount' => $paymentAmount,
                'payment_date' => $paymentDate->toDateString(),
                'payment_method' => fake()->randomElement($paymentMethods),
                'reference_number' => fake()->optional(0.7)->numerify('REF-########'),
                'notes' => fake()->optional(0.4)->sentence(),
                'created_by' => $users->random()->id,
            ]);
            
            $totalPaid += $paymentAmount;
            
            // If fully paid, stop creating more payments
            if ($totalPaid >= $billing->billing_amount) {
                break;
            }
        }
        
        // Update billing status based on actual payments
        $billing->updateStatus();
    }
}

