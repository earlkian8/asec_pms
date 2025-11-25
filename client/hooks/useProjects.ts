import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import { Share, Alert } from 'react-native';

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
}

export interface UseProjectsOptions {
  status?: string | null;
  search?: string;
  sortBy?: 'name' | 'progress' | 'budget' | 'date' | 'status';
  sortOrder?: 'asc' | 'desc';
}

export function useProjects(options: UseProjectsOptions = {}) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
      if (options.status && options.status !== 'all') {
        params.append('status', options.status);
      }
      if (options.search) {
        params.append('search', options.search);
      }
      if (options.sortBy) {
        params.append('sort_by', options.sortBy);
      }
      if (options.sortOrder) {
        params.append('sort_order', options.sortOrder);
      }
      
      const queryString = params.toString();
      const endpoint = queryString 
        ? `/client/dashboard/projects?${queryString}`
        : '/client/dashboard/projects';
      
      const response = await apiService.get<Project[]>(endpoint);
      
      if (typeof response === 'object' && 'success' in response) {
        if (response.success && response.data) {
          setProjects(response.data);
        } else {
          setError(response.message || 'Failed to fetch projects');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [options.status, options.search, options.sortBy, options.sortOrder]);

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const refresh = useCallback(() => {
    return fetchProjects();
  }, [fetchProjects]);

  const exportProjects = useCallback(async (format: 'csv' | 'json' = 'csv') => {
    try {
      const response = await apiService.get(
        `/client/dashboard/projects/export?format=${format}`,
        { responseType: format === 'csv' ? 'text' : 'json' }
      );
      
      if (format === 'csv' && typeof response === 'string') {
        // Share CSV content using React Native Share API
        await Share.share({
          message: response,
          title: `Projects Export ${new Date().toISOString().split('T')[0]}.csv`,
        });
        return { success: true };
      }
      
      if (format === 'json' && typeof response === 'object' && 'data' in response) {
        // Share JSON data as formatted string
        const jsonString = JSON.stringify(response.data, null, 2);
        await Share.share({
          message: jsonString,
          title: `Projects Export ${new Date().toISOString().split('T')[0]}.json`,
        });
        return { success: true };
      }
      
      return response;
    } catch (err) {
      if (err instanceof Error && err.message.includes('User did not share')) {
        // User cancelled sharing - this is fine
        return { success: false, cancelled: true };
      }
      throw err;
    }
  }, []);

  return {
    projects,
    loading,
    error,
    refresh,
    exportProjects,
  };
}

