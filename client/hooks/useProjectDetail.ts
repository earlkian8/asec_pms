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
  type: 'progress';
  author: string;
  date: string;
  file?: ProgressUpdateFile | null; // Optional - files are not displayed in client app
}

export interface TeamMember {
  id: string;
  name: string;
  role: string;
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
  location: string;
  projectManager: string;
  milestones: ProjectDetailMilestone[];
  recentUpdates: ProgressUpdate[];
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

