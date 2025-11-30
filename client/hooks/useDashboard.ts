import { useState, useEffect } from 'react';
import { apiService } from '@/services/api';

export interface DashboardStatistics {
  totalProjects: number;
  activeProjects: number;
  completedProjects: number;
  totalBudget: number;
  totalSpent: number;
  onTimeProjects: number;
  overdueProjects: number;
}

export interface DashboardProject {
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
}

export function useDashboard() {
  const [statistics, setStatistics] = useState<DashboardStatistics | null>(null);
  const [projects, setProjects] = useState<DashboardProject[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchStatistics = async () => {
    try {
      const response = await apiService.get<DashboardStatistics>('/client/dashboard/statistics');
      if (response.success && response.data) {
        setStatistics(response.data);
      } else {
        setError(response.message || 'Failed to fetch statistics');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const fetchProjects = async (status?: string) => {
    try {
      const endpoint = status && status !== 'all' 
        ? `/client/dashboard/projects?status=${status}`
        : '/client/dashboard/projects';
      const response = await apiService.get<DashboardProject[]>(endpoint);
      if (response.success && response.data) {
        setProjects(response.data);
      } else {
        setError(response.message || 'Failed to fetch projects');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    }
  };

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    await Promise.all([fetchStatistics(), fetchProjects()]);
    setLoading(false);
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const refresh = async () => {
    await fetchAll();
  };

  return {
    statistics,
    projects,
    loading,
    error,
    refresh,
    fetchProjects,
  };
}

