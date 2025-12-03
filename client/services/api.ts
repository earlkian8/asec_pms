const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.254.108:8000/api';

interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
}

class ApiService {
  private baseURL: string;
  private token: string | null = null;

  constructor() {
    this.baseURL = API_BASE_URL;
    // Load token from storage if available
    // In a real app, you'd use AsyncStorage here
    this.loadToken();
  }

  private async loadToken() {
    // TODO: Load from AsyncStorage when available
    // const token = await AsyncStorage.getItem('auth_token');
    // if (token) this.setToken(token);
  }

  setToken(token: string | null) {
    this.token = token;
    // TODO: Save to AsyncStorage when available
    // if (token) {
    //   AsyncStorage.setItem('auth_token', token);
    // } else {
    //   AsyncStorage.removeItem('auth_token');
    // }
  }

  getToken(): string | null {
    return this.token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit & { responseType?: 'json' | 'blob' | 'text' } = {}
  ): Promise<ApiResponse<T> | Blob | string> {
    const { responseType = 'json', ...fetchOptions } = options;
    const url = `${this.baseURL}${endpoint}`;
    const headers: HeadersInit = {
      'Accept': responseType === 'json' ? 'application/json' : '*/*',
      ...(responseType === 'json' && { 'Content-Type': 'application/json' }),
      ...fetchOptions.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      if (responseType === 'blob') {
        if (!response.ok) {
          // Try to get error message from response
          const errorText = await response.text();
          let errorMessage = 'Failed to download file';
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorMessage;
          } catch {
            // If not JSON, use status text
            errorMessage = response.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }
        return await response.blob();
      }

      if (responseType === 'text') {
        return await response.text();
      }

      const data = await response.json();

      if (!response.ok) {
        return {
          success: false,
          message: data.message || 'An error occurred',
          errors: data.errors,
        };
      }

      return {
        success: true,
        ...data,
      };
    } catch (error) {
      if (responseType !== 'json') {
        throw error;
      }
      return {
        success: false,
        message: error instanceof Error ? error.message : 'Network error occurred',
      };
    }
  }

  async get<T>(endpoint: string, options?: { responseType?: 'json' | 'blob' | 'text' }): Promise<ApiResponse<T> | Blob | string> {
    return this.request<T>(endpoint, { method: 'GET', ...options });
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }

  // Billing methods
  async getBillings(params?: Record<string, any>): Promise<ApiResponse<any>> {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    return this.get(`/client/billings${queryString ? `?${queryString}` : ''}`);
  }

  async getBilling(id: number): Promise<ApiResponse<any>> {
    return this.get(`/client/billings/${id}`);
  }

  async initiatePayment(billingId: number, data: { amount?: number; payment_method_type?: string }): Promise<ApiResponse<any>> {
    return this.post(`/client/billings/${billingId}/pay`, data);
  }

  async checkPaymentStatus(billingId: number): Promise<ApiResponse<any>> {
    return this.get(`/client/billings/${billingId}/payment-status`);
  }

  async getBillingTransactions(params?: Record<string, any>): Promise<ApiResponse<any>> {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    return this.get(`/client/billings/transactions${queryString ? `?${queryString}` : ''}`);
  }
}

export const apiService = new ApiService();

