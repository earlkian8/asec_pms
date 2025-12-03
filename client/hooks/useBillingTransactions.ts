import { useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import { Payment } from './useBillings';

export interface UseBillingTransactionsOptions {
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export function useBillingTransactions(options: UseBillingTransactionsOptions = {}) {
  const [transactions, setTransactions] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<any>(null);

  const fetchTransactions = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    try {
      const params = new URLSearchParams();
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
        ? `/client/billings/transactions?${queryString}`
        : '/client/billings/transactions';
      
      const response = await apiService.get<{ data: any }>(endpoint);
      
      if (typeof response === 'object' && 'success' in response) {
        if (response.success && response.data) {
          // Handle paginated response - data can be either an array or paginated object
          const transactionsData = Array.isArray(response.data) 
            ? response.data 
            : (response.data.data || []);
          setTransactions(transactionsData);
          setPagination(Array.isArray(response.data) ? null : response.data);
        } else {
          setError(response.message || 'Failed to fetch transactions');
          setTransactions([]);
        }
      } else {
        setError('Invalid response format');
        setTransactions([]);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  }, [options.search, options.sortBy, options.sortOrder]);

  useEffect(() => {
    fetchTransactions();
  }, [fetchTransactions]);

  const refresh = useCallback(() => {
    return fetchTransactions();
  }, [fetchTransactions]);

  return {
    transactions,
    loading,
    error,
    refresh,
    pagination,
  };
}

