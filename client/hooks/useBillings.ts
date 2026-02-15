import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import type { Billing, BillingPayment } from '@/types/api';

export type { Billing } from '@/types/api';
export type Payment = BillingPayment;

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

