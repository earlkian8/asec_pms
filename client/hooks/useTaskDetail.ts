import { useEffect, useState } from 'react';
import { apiService } from '@/services/api';

export interface TaskProgressUpdateFile {
  path: string;
  type: string;
  name: string;
  size: number;
  url: string | null;
}

export interface TaskProgressUpdate {
  id: string;
  description: string;
  author: string;
  date: string;
  file?: TaskProgressUpdateFile | null;
}

export interface TaskIssue {
  id: string;
  title: string;
  description: string;
  priority: string;
  status: string;
  reportedBy: string;
  assignedTo: string;
  dueDate: string | null;
  resolvedAt: string | null;
  createdAt: string;
}

export interface TaskRequestUpdate {
  id: string;
  subject: string;
  message: string;
  author: string;
  date: string;
}

export interface TaskDetailPayload {
  task: {
    id: string;
    name: string;
    description: string;
    status: 'completed' | 'in-progress' | 'pending';
    assignedTo: string;
    dueDate: string;
  };
  milestone: {
    id: string;
    name: string;
  };
  project: {
    id: string;
    name: string;
  };
  progressUpdates: TaskProgressUpdate[];
  issues: TaskIssue[];
  requestUpdates: TaskRequestUpdate[];
}

export function useTaskDetail(taskId: string | undefined) {
  const [data, setData] = useState<TaskDetailPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTask = async () => {
    if (!taskId) {
      setLoading(false);
      setError('Task ID is required');
      setData(null);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiService.get<TaskDetailPayload>(`/client/tasks/${taskId}`);

      if (typeof response === 'object' && 'success' in response) {
        if (response.success && response.data) {
          setData(response.data);
        } else {
          setError(response.message || 'Failed to fetch task details');
          setData(null);
        }
      } else {
        setError('Invalid response from server');
        setData(null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTask();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [taskId]);

  const refresh = async () => {
    await fetchTask();
  };

  return { data, loading, error, refresh };
}

