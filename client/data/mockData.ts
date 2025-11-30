export interface Project {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'on-hold' | 'completed' | 'pending';
  progress: number;
  startDate: string;
  expectedCompletion: string;
  budget: number;
  spent: number;
  location: string;
  projectManager: string;
  image?: string;
  milestones: Milestone[];
  recentUpdates: ProjectUpdate[];
  teamMembers: TeamMember[];
  documents: Document[];
}

export interface Milestone {
  id: string;
  name: string;
  description: string;
  status: 'completed' | 'in-progress' | 'pending';
  progress: number;
  dueDate: string;
  completedDate?: string;
  tasks: Task[];
}

export interface Task {
  id: string;
  name: string;
  status: 'completed' | 'in-progress' | 'pending';
  assignedTo: string;
}

export interface ProjectUpdate {
  id: string;
  date: string;
  title: string;
  description: string;
  type: 'progress' | 'milestone' | 'issue' | 'general';
  author: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
  avatar?: string;
}

export interface Document {
  id: string;
  name: string;
  type: string;
  size: string;
  uploadDate: string;
}

export interface Statistics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalBudget: number;
  totalSpent: number;
  onTimeProjects: number;
  overdueProjects: number;
}

export const mockStatistics: Statistics = {
  totalProjects: 8,
  activeProjects: 5,
  completedProjects: 3,
  totalBudget: 12500000,
  totalSpent: 8750000,
  onTimeProjects: 6,
  overdueProjects: 1,
};

export const mockProjects: Project[] = [
  {
    id: '1',
    name: 'Downtown Office Complex',
    description: 'Modern 15-story office building with retail space on ground floor',
    status: 'active',
    progress: 68,
    startDate: '2024-01-15',
    expectedCompletion: '2025-06-30',
    budget: 2500000,
    spent: 1700000,
    location: '123 Main Street, Downtown',
    projectManager: 'Sarah Johnson',
    milestones: [
      {
        id: 'm1',
        name: 'Foundation & Site Prep',
        description: 'Complete excavation and foundation work',
        status: 'completed',
        progress: 100,
        dueDate: '2024-03-30',
        completedDate: '2024-03-25',
        tasks: [
          { id: 't1', name: 'Site excavation', status: 'completed', assignedTo: 'Mike Wilson' },
          { id: 't2', name: 'Foundation pouring', status: 'completed', assignedTo: 'Mike Wilson' },
        ],
      },
      {
        id: 'm2',
        name: 'Structural Framework',
        description: 'Complete steel and concrete framework',
        status: 'in-progress',
        progress: 75,
        dueDate: '2024-08-15',
        tasks: [
          { id: 't3', name: 'Steel frame installation', status: 'completed', assignedTo: 'David Lee' },
          { id: 't4', name: 'Concrete floors', status: 'in-progress', assignedTo: 'David Lee' },
          { id: 't5', name: 'Elevator shafts', status: 'pending', assignedTo: 'David Lee' },
        ],
      },
      {
        id: 'm3',
        name: 'MEP Systems',
        description: 'Mechanical, Electrical, and Plumbing installation',
        status: 'pending',
        progress: 0,
        dueDate: '2024-12-20',
        tasks: [
          { id: 't6', name: 'HVAC installation', status: 'pending', assignedTo: 'Lisa Chen' },
          { id: 't7', name: 'Electrical wiring', status: 'pending', assignedTo: 'Lisa Chen' },
        ],
      },
    ],
    recentUpdates: [
      {
        id: 'u1',
        date: '2024-06-15',
        title: 'Floor 8-10 Framework Complete',
        description: 'Successfully completed structural framework for floors 8 through 10. All inspections passed.',
        type: 'progress',
        author: 'Sarah Johnson',
      },
      {
        id: 'u2',
        date: '2024-06-10',
        title: 'Material Delivery',
        description: 'Steel beams for floors 11-12 delivered and ready for installation.',
        type: 'general',
        author: 'David Lee',
      },
    ],
    teamMembers: [
      { id: 'tm1', name: 'Sarah Johnson', role: 'Project Manager' },
      { id: 'tm2', name: 'David Lee', role: 'Site Supervisor' },
      { id: 'tm3', name: 'Mike Wilson', role: 'Foreman' },
    ],
    documents: [
      { id: 'd1', name: 'Building Plans.pdf', type: 'PDF', size: '12.5 MB', uploadDate: '2024-01-10' },
      { id: 'd2', name: 'Safety Report.pdf', type: 'PDF', size: '2.3 MB', uploadDate: '2024-06-01' },
    ],
  },
  {
    id: '2',
    name: 'Riverside Residential Tower',
    description: 'Luxury 20-story residential building with river views',
    status: 'active',
    progress: 45,
    startDate: '2024-03-01',
    expectedCompletion: '2025-09-15',
    budget: 3200000,
    spent: 1440000,
    location: '456 Riverside Drive',
    projectManager: 'Michael Chen',
    milestones: [
      {
        id: 'm4',
        name: 'Foundation Complete',
        description: 'Foundation and underground parking completed',
        status: 'completed',
        progress: 100,
        dueDate: '2024-05-15',
        completedDate: '2024-05-10',
        tasks: [],
      },
      {
        id: 'm5',
        name: 'Lower Floors (1-10)',
        description: 'Complete construction of first 10 floors',
        status: 'in-progress',
        progress: 60,
        dueDate: '2024-10-30',
        tasks: [],
      },
    ],
    recentUpdates: [
      {
        id: 'u3',
        date: '2024-06-12',
        title: 'Floor 7 Completed',
        description: 'Floor 7 construction completed and passed inspection.',
        type: 'progress',
        author: 'Michael Chen',
      },
    ],
    teamMembers: [
      { id: 'tm4', name: 'Michael Chen', role: 'Project Manager' },
      { id: 'tm5', name: 'Emma Davis', role: 'Site Supervisor' },
    ],
    documents: [],
  },
  {
    id: '3',
    name: 'Shopping Mall Renovation',
    description: 'Complete interior and exterior renovation of Westfield Mall',
    status: 'active',
    progress: 82,
    startDate: '2023-11-01',
    expectedCompletion: '2024-08-30',
    budget: 1800000,
    spent: 1476000,
    location: '789 Commerce Boulevard',
    projectManager: 'Jennifer Martinez',
    milestones: [
      {
        id: 'm6',
        name: 'Exterior Renovation',
        description: 'Complete exterior facade and parking lot',
        status: 'completed',
        progress: 100,
        dueDate: '2024-02-28',
        completedDate: '2024-02-25',
        tasks: [],
      },
      {
        id: 'm7',
        name: 'Interior Renovation',
        description: 'Complete interior spaces and common areas',
        status: 'in-progress',
        progress: 90,
        dueDate: '2024-07-15',
        tasks: [],
      },
    ],
    recentUpdates: [
      {
        id: 'u4',
        date: '2024-06-14',
        title: 'Food Court 90% Complete',
        description: 'Food court renovation nearly complete, final touches in progress.',
        type: 'progress',
        author: 'Jennifer Martinez',
      },
    ],
    teamMembers: [
      { id: 'tm6', name: 'Jennifer Martinez', role: 'Project Manager' },
      { id: 'tm7', name: 'Robert Taylor', role: 'Site Supervisor' },
    ],
    documents: [],
  },
  {
    id: '4',
    name: 'Industrial Warehouse',
    description: '50,000 sq ft warehouse facility with office space',
    status: 'active',
    progress: 35,
    startDate: '2024-04-10',
    expectedCompletion: '2024-12-20',
    budget: 1200000,
    spent: 420000,
    location: '321 Industrial Park Road',
    projectManager: 'Thomas Anderson',
    milestones: [
      {
        id: 'm8',
        name: 'Site Preparation',
        description: 'Complete site clearing and preparation',
        status: 'completed',
        progress: 100,
        dueDate: '2024-05-01',
        completedDate: '2024-04-28',
        tasks: [],
      },
      {
        id: 'm9',
        name: 'Foundation & Structure',
        description: 'Build foundation and main structure',
        status: 'in-progress',
        progress: 50,
        dueDate: '2024-08-15',
        tasks: [],
      },
    ],
    recentUpdates: [
      {
        id: 'u5',
        date: '2024-06-11',
        title: 'Foundation Work Progressing',
        description: 'Foundation work is 50% complete, on schedule.',
        type: 'progress',
        author: 'Thomas Anderson',
      },
    ],
    teamMembers: [
      { id: 'tm8', name: 'Thomas Anderson', role: 'Project Manager' },
    ],
    documents: [],
  },
  {
    id: '5',
    name: 'Hospital Wing Expansion',
    description: 'New 3-story wing addition to City General Hospital',
    status: 'active',
    progress: 55,
    startDate: '2024-02-20',
    expectedCompletion: '2025-01-15',
    budget: 4500000,
    spent: 2475000,
    location: '100 Medical Center Drive',
    projectManager: 'Patricia Williams',
    milestones: [
      {
        id: 'm10',
        name: 'Site Prep & Foundation',
        description: 'Complete site preparation and foundation',
        status: 'completed',
        progress: 100,
        dueDate: '2024-04-30',
        completedDate: '2024-04-25',
        tasks: [],
      },
      {
        id: 'm11',
        name: 'Structure & Envelope',
        description: 'Complete building structure and envelope',
        status: 'in-progress',
        progress: 65,
        dueDate: '2024-09-30',
        tasks: [],
      },
    ],
    recentUpdates: [
      {
        id: 'u6',
        date: '2024-06-13',
        title: 'Second Floor Structure Complete',
        description: 'Second floor structure completed, beginning third floor.',
        type: 'progress',
        author: 'Patricia Williams',
      },
    ],
    teamMembers: [
      { id: 'tm9', name: 'Patricia Williams', role: 'Project Manager' },
      { id: 'tm10', name: 'James Brown', role: 'Site Supervisor' },
    ],
    documents: [],
  },
  {
    id: '6',
    name: 'Highway Bridge Repair',
    description: 'Major repair and reinforcement of I-95 bridge',
    status: 'on-hold',
    progress: 25,
    startDate: '2024-01-05',
    expectedCompletion: '2024-11-30',
    budget: 2800000,
    spent: 700000,
    location: 'I-95 Mile Marker 42',
    projectManager: 'Robert Kim',
    milestones: [
      {
        id: 'm12',
        name: 'Initial Assessment',
        description: 'Complete structural assessment',
        status: 'completed',
        progress: 100,
        dueDate: '2024-02-15',
        completedDate: '2024-02-10',
        tasks: [],
      },
      {
        id: 'm13',
        name: 'Repair Work',
        description: 'Execute repair and reinforcement work',
        status: 'pending',
        progress: 25,
        dueDate: '2024-10-15',
        tasks: [],
      },
    ],
    recentUpdates: [
      {
        id: 'u7',
        date: '2024-05-20',
        title: 'Project On Hold',
        description: 'Project temporarily on hold pending additional permits.',
        type: 'issue',
        author: 'Robert Kim',
      },
    ],
    teamMembers: [
      { id: 'tm11', name: 'Robert Kim', role: 'Project Manager' },
    ],
    documents: [],
  },
  {
    id: '7',
    name: 'Luxury Hotel Construction',
    description: '5-star hotel with 200 rooms and conference facilities',
    status: 'completed',
    progress: 100,
    startDate: '2022-06-01',
    expectedCompletion: '2024-05-30',
    budget: 5500000,
    spent: 5280000,
    location: '555 Luxury Avenue',
    projectManager: 'Amanda White',
    milestones: [
      {
        id: 'm14',
        name: 'Foundation',
        status: 'completed',
        progress: 100,
        dueDate: '2022-09-30',
        completedDate: '2022-09-25',
        description: '',
        tasks: [],
      },
      {
        id: 'm15',
        name: 'Structure',
        status: 'completed',
        progress: 100,
        dueDate: '2023-06-30',
        completedDate: '2023-06-20',
        description: '',
        tasks: [],
      },
      {
        id: 'm16',
        name: 'Interior & Finishing',
        status: 'completed',
        progress: 100,
        dueDate: '2024-04-30',
        completedDate: '2024-04-25',
        description: '',
        tasks: [],
      },
    ],
    recentUpdates: [
      {
        id: 'u8',
        date: '2024-05-01',
        title: 'Project Completed',
        description: 'Hotel construction completed successfully and handed over to client.',
        type: 'milestone',
        author: 'Amanda White',
      },
    ],
    teamMembers: [
      { id: 'tm12', name: 'Amanda White', role: 'Project Manager' },
    ],
    documents: [],
  },
  {
    id: '8',
    name: 'School Building Addition',
    description: 'New wing addition to Lincoln High School',
    status: 'completed',
    progress: 100,
    startDate: '2023-08-15',
    expectedCompletion: '2024-05-20',
    budget: 950000,
    spent: 912000,
    location: '200 Education Street',
    projectManager: 'Daniel Garcia',
    milestones: [
      {
        id: 'm17',
        name: 'Construction Complete',
        status: 'completed',
        progress: 100,
        dueDate: '2024-05-20',
        completedDate: '2024-05-15',
        description: '',
        tasks: [],
      },
    ],
    recentUpdates: [
      {
        id: 'u9',
        date: '2024-05-15',
        title: 'Project Handover',
        description: 'School addition completed and handed over to school district.',
        type: 'milestone',
        author: 'Daniel Garcia',
      },
    ],
    teamMembers: [
      { id: 'tm13', name: 'Daniel Garcia', role: 'Project Manager' },
    ],
    documents: [],
  },
];

