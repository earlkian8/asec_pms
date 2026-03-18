export interface User {
  id: number;
  name: string;
  email: string;
  permissions?: string[];
}

export interface Task {
  id: number;
  title: string;
  description: string;
  assignedTo: number;
  assignedToName: string;
  dueDate: string;
  status: 'pending' | 'in_progress' | 'completed';
  projectName: string;
  projectId?: number;
  milestoneName: string;
  milestoneId?: number;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  createdAt: string;
  updatedAt: string;
}

export interface ProgressUpdate {
  id: number;
  project_task_id: number;
  description: string | null;
  file_path: string | null;
  file_url?: string | null; // URL to access the file
  original_name: string | null;
  file_type: string | null;
  file_size: number | null;
  created_by: number | null;
  created_by_name?: string; // For display purposes
  created_at: string;
  updated_at: string;
}

export interface Issue {
  id: number;
  project_id: number;
  project_milestone_id: number | null;
  project_task_id: number | null;
  title: string;
  description: string | null;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'in_progress' | 'resolved' | 'closed';
  reported_by: number | null;
  reported_by_name?: string; // For display purposes
  assigned_to: number | null;
  assigned_to_name?: string; // For display purposes
  due_date: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface RequestUpdate {
  id: number;
  subject: string | null;
  message: string | null;
  client_id: number | null;
  client_name?: string | null;
  created_at: string;
}

