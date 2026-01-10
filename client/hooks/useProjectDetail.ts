import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';

export interface ProjectDetailMilestone {
  id: string;
  name: string;
  description: string;
  status: 'completed' | 'in-progress' | 'pending';
  progress: number;
  dueDate: string;
  completedDate?: string;
  tasks: ProjectDetailTask[];
}

export interface ProjectDetailTask {
  id: string;
  name: string;
  description: string;
  status: 'completed' | 'in-progress' | 'pending';
  assignedTo: string;
  dueDate: string;
}

export interface ProgressUpdateFile {
  id: string;
  name: string;
  type: string;
  size: number;
  uploadDate: string;
  url: string;
}

export interface ProgressUpdate {
  id: string;
  title: string;
  description: string;
  type: 'request' | 'progress';
  author: string;
  date: string;
  file?: ProgressUpdateFile | null; // Optional - files are not displayed in client app
  taskId?: string;
  taskName?: string;
  milestoneId?: string;
  milestoneName?: string;
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
}

export interface ProjectIssue {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  reportedBy: string;
  assignedTo: string;
  dueDate: string | null;
  resolvedAt: string | null;
  milestoneId: string | null;
  milestoneName: string | null;
  taskId: string | null;
  taskName: string | null;
  createdAt: string;
}

export interface MaterialAllocation {
  id: string;
  itemName: string;
  itemCode: string;
  unit: string;
  quantityAllocated: number;
  quantityReceived: number;
  quantityRemaining: number;
  status: string;
  unitPrice: number;
  totalCost: number;
  allocatedBy: string;
  allocatedAt: string | null;
  notes: string;
}

export interface LaborCost {
  id: string;
  assignableName: string;
  workDate: string | null;
  hoursWorked: number;
  hourlyRate: number;
  totalCost: number;
  description: string;
  notes: string;
}

export interface MiscellaneousExpense {
  id: string;
  expenseType: string;
  expenseName: string;
  expenseDate: string | null;
  amount: number;
  description: string;
  notes: string;
  createdBy: string;
  createdAt: string;
}

export interface BudgetBreakdown {
  materialCosts: number;
  laborCosts: number;
  miscellaneousExpenses: number;
  total: number;
}

export interface ProjectDetail {
  id: string;
  name: string;
  description: string;
  status: 'active' | 'on-hold' | 'completed' | 'pending';
  progress: number;
  startDate: string;
  expectedCompletion: string;
  budget: number;
  spent: number;
  budgetBreakdown: BudgetBreakdown;
  location: string;
  projectManager: string;
  milestones: ProjectDetailMilestone[];
  recentUpdates: ProgressUpdate[];
  issues: ProjectIssue[];
  materialAllocations: MaterialAllocation[];
  laborCosts: LaborCost[];
  miscellaneousExpenses: MiscellaneousExpense[];
  teamMembers: TeamMember[];
}

export function useProjectDetail(projectId: string | undefined) {
  const [project, setProject] = useState<ProjectDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProject = async () => {
    if (!projectId) {
      setLoading(false);
      setError('Project ID is required');
      setProject(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.get<ProjectDetail>(`/client/projects/${projectId}`);

      if (typeof response === 'object' && 'success' in response) {
        if (response.success && response.data) {
          setProject(response.data);
        } else {
          setError(response.message || 'Failed to fetch project details');
          setProject(null);
        }
      } else {
        setError('Invalid response from server');
        setProject(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setProject(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProject();
  }, [projectId]);

  const refresh = async () => {
    await fetchProject();
  };

  return {
    project,
    loading,
    error,
    refresh,
  };
}

