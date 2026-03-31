import AsyncStorage from '@react-native-async-storage/async-storage';

export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://asec-pms-3dfex.ondigitalocean.app/api';
// export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://10.246.193.31:8000/api';

const TOKEN_KEY = 'auth_token';

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
    this.loadToken();
  }

  private async loadToken() {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      if (token) this.token = token;
    } catch {
      // AsyncStorage unavailable — continue without persisted token
    }
  }

  setToken(token: string | null) {
    this.token = token;
    try {
      if (token) {
        AsyncStorage.setItem(TOKEN_KEY, token);
      } else {
        AsyncStorage.removeItem(TOKEN_KEY);
      }
    } catch {
      // Silently fail — token is still held in memory for this session
    }
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
    const headers: Record<string, string> = {
      'Accept': responseType === 'json' ? 'application/json' : '*/*',
      ...(responseType === 'json' && { 'Content-Type': 'application/json' }),
      ...(fetchOptions.headers as Record<string, string>),
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
          const errorText = await response.text();
          let errorMessage = 'Failed to download file';
          try {
            const errorData = JSON.parse(errorText);
            errorMessage = errorData.message || errorMessage;
          } catch {
            errorMessage = response.statusText || errorMessage;
          }
          throw new Error(errorMessage);
        }
        return await response.blob();
      }

      if (responseType === 'text') {
        return await response.text();
      }

      let data;
      try {
        data = await response.json();
      } catch {
        return {
          success: false,
          message: response.statusText || 'An error occurred',
        };
      }

      if (!response.ok) {
        let errorMessage = data.message || 'An error occurred';
        if (data.errors && typeof data.errors === 'object') {
          const errorMessages: string[] = [];
          Object.keys(data.errors).forEach(key => {
            if (Array.isArray(data.errors[key])) {
              errorMessages.push(...data.errors[key]);
            } else if (typeof data.errors[key] === 'string') {
              errorMessages.push(data.errors[key]);
            }
          });
          if (errorMessages.length > 0) {
            errorMessage = errorMessages[0];
          }
        }
        return {
          success: false,
          message: errorMessage,
          errors: data.errors,
        };
      }

      return {
        success: true,
        ...data,
      };
    } catch (error) {
      if (responseType !== 'json') throw error;

      let errorMessage = 'Network error occurred';
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Unable to connect to server. Please check your internet connection.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      return { success: false, message: errorMessage };
    }
  }

  async get<T>(endpoint: string, options?: { responseType?: 'json' | 'blob' | 'text' }): Promise<ApiResponse<T> | Blob | string> {
    return this.request<T>(endpoint, { method: 'GET', ...options });
  }

  async post<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const result = await this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
      responseType: 'json',
    });
    return result as ApiResponse<T>;
  }

  async put<T>(endpoint: string, body?: any): Promise<ApiResponse<T>> {
    const result = await this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
      responseType: 'json',
    });
    return result as ApiResponse<T>;
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    const result = await this.request<T>(endpoint, {
      method: 'DELETE',
      responseType: 'json',
    });
    return result as ApiResponse<T>;
  }

  async getBillings(params?: Record<string, any>): Promise<ApiResponse<any>> {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    const result = await this.get(`/client/billings${queryString ? `?${queryString}` : ''}`, { responseType: 'json' });
    return result as ApiResponse<any>;
  }

  async getBilling(id: number): Promise<ApiResponse<any>> {
    const result = await this.get(`/client/billings/${id}`, { responseType: 'json' });
    return result as ApiResponse<any>;
  }

  async initiatePayment(billingId: number, data: { amount?: number }): Promise<ApiResponse<any>> {
    return this.post(`/client/billings/${billingId}/pay`, data);
  }

  async checkPaymentStatus(billingId: number): Promise<ApiResponse<any>> {
    const result = await this.get(`/client/billings/${billingId}/payment-status`, { responseType: 'json' });
    return result as ApiResponse<any>;
  }

  async getBillingTransactions(params?: Record<string, any>): Promise<ApiResponse<any>> {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    const result = await this.get(`/client/billings/transactions${queryString ? `?${queryString}` : ''}`, { responseType: 'json' });
    return result as ApiResponse<any>;
  }

  async registerPushToken(token: string | null): Promise<ApiResponse<any>> {
    return this.post('/client/push-token', { push_token: token });
  }
}

export const apiService = new ApiService();