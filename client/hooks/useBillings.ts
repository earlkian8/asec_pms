import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';

export interface Billing {
  id: number;
  billing_code: string;
  billing_type: 'fixed_price' | 'milestone';
  billing_amount: number;
  billing_date: string;
  due_date: string | null;
  status: 'unpaid' | 'partial' | 'paid';
  description: string | null;
  project: {
    id: number;
    project_code: string;
    project_name: string;
  };
  milestone: {
    id: number;
    name: string;
  } | null;
  total_paid: number;
  remaining_amount: number;
  payment_percentage: number;
  payments: Payment[];
}

export interface Payment {
  id: number;
  payment_code: string;
  payment_amount: number;
  payment_date: string;
  payment_method: string;
  payment_status: 'pending' | 'paid' | 'failed' | 'cancelled';
  reference_number: string | null;
  notes: string | null;
  paid_by_client: boolean;
  paymongo_payment_intent_id: string | null;
  paymongo_source_id: string | null;
  created_at: string;
}

export interface UseBillingsOptions {
  status?: string | null;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useBillings(options: UseBillingsOptions = {}) {
  const [billings, setBillings] = useState<Billing[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any>(null);

  const fetchBillings = useCallback(async () => {
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
        ? `/client/billings?${queryString}`
        : '/client/billings';
      
      const response = await apiService.get<{ data: any }>(endpoint);
      
      if (typeof response === 'object' && 'success' in response) {
        if (response.success && response.data) {
          setBillings(response.data.data || []);
          setPagination(response.data);
        } else {
          setError(response.message || 'Failed to fetch billings');
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [options.status, options.search, options.sortBy, options.sortOrder]);

  useEffect(() => {
    fetchBillings();
  }, [fetchBillings]);

  const refresh = useCallback(() => {
    return fetchBillings();
  }, [fetchBillings]);

  return {
    billings,
    loading,
    error,
    refresh,
    pagination,
  };
}

