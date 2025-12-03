<?php

namespace Database\Seeders;

use App\Models\ProjectType;
use Illuminate\Database\Seeder;

class ProjectTypeSeeder extends Seeder
{
    /**
     * Run the database seeds.
     */
    public function run(): void
    {
        $this->command->info('Creating project types...');

        $projectTypes = [
            [
                'name' => 'Residential Construction',
                'description' => 'Construction of residential buildings including houses, apartments, condominiums, and townhouses.',
                'is_active' => true,
            ],
            [
                'name' => 'Commercial Construction',
                'description' => 'Construction of commercial buildings such as offices, retail stores, shopping centers, and business facilities.',
                'is_active' => true,
            ],
            [
                'name' => 'Industrial Construction',
                'description' => 'Construction of industrial facilities including factories, warehouses, manufacturing plants, and distribution centers.',
                'is_active' => true,
            ],
            [
                'name' => 'Infrastructure Construction',
                'description' => 'Large-scale infrastructure projects including roads, bridges, tunnels, airports, and public utilities.',
                'is_active' => true,
            ],
            [
                'name' => 'Renovation & Remodeling',
                'description' => 'Renovation, remodeling, and retrofitting of existing structures to improve functionality or aesthetics.',
                'is_active' => true,
            ],
            [
                'name' => 'Design & Engineering',
                'description' => 'Architectural design, engineering services, and project planning for construction projects.',
                'is_active' => true,
            ],
            [
                'name' => 'Site Preparation',
                'description' => 'Site clearing, excavation, grading, and preparation work before construction begins.',
                'is_active' => true,
            ],
            [
                'name' => 'Structural Engineering',
                'description' => 'Design and construction of structural elements including foundations, beams, columns, and load-bearing systems.',
                'is_active' => true,
            ],
            [
                'name' => 'Civil Engineering',
                'description' => 'Civil engineering projects including roads, drainage systems, water supply, and public works.',
                'is_active' => true,
            ],
            [
                'name' => 'Mechanical & Electrical',
                'description' => 'Installation and maintenance of mechanical systems (HVAC, plumbing) and electrical systems.',
                'is_active' => true,
            ],
            [
                'name' => 'Environmental & Geotechnical',
                'description' => 'Environmental assessments, geotechnical surveys, soil testing, and environmental remediation projects.',
                'is_active' => true,
            ],
            [
                'name' => 'Maintenance & Repair',
                'description' => 'Ongoing maintenance, repairs, and facility management services for existing structures.',
                'is_active' => true,
            ],
            [
                'name' => 'Demolition',
                'description' => 'Safe demolition and removal of structures, including site cleanup and waste management.',
                'is_active' => true,
            ],
            [
                'name' => 'Landscaping & Site Development',
                'description' => 'Landscaping, hardscaping, site development, and outdoor construction projects.',
                'is_active' => true,
            ],
            [
                'name' => 'Road & Bridge Construction',
                'description' => 'Construction and maintenance of roads, highways, bridges, and transportation infrastructure.',
                'is_active' => true,
            ],
            [
                'name' => 'Water & Wastewater Systems',
                'description' => 'Construction of water treatment plants, wastewater systems, pipelines, and water infrastructure.',
                'is_active' => true,
            ],
            [
                'name' => 'Institutional Construction',
                'description' => 'Construction of institutional buildings such as schools, hospitals, government buildings, and public facilities.',
                'is_active' => true,
            ],
            [
                'name' => 'Consultancy Services',
                'description' => 'Construction consultancy, project management, and advisory services.',
                'is_active' => true,
            ],
            [
                'name' => 'Installation & Commissioning',
                'description' => 'Installation of equipment and systems, followed by testing, commissioning, and handover.',
                'is_active' => true,
            ],
            [
                'name' => 'Inspection & Quality Control',
                'description' => 'Quality inspections, safety audits, code compliance checks, and quality assurance services.',
                'is_active' => true,
            ],
            [
                'name' => 'Surveying & Mapping',
                'description' => 'Land surveying, topographic mapping, boundary surveys, and construction staking.',
                'is_active' => true,
            ],
            [
                'name' => 'Specialty Construction',
                'description' => 'Specialized construction projects such as green buildings, smart buildings, or unique architectural projects.',
                'is_active' => true,
            ],
        ];

        foreach ($projectTypes as $projectType) {
            ProjectType::firstOrCreate(
                ['name' => $projectType['name']],
                $projectType
            );
        }

        $this->command->info('Project types created successfully!');
    }
}

