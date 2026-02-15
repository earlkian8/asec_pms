export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://172.30.94.31:8000/api';
// const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://asec-pms-3dfex.ondigitalocean.app.app/api';
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
    this.loadToken();
  }

  private async loadToken() {
    try {
      // Use AsyncStorage if available, otherwise use in-memory storage
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      const token = await AsyncStorage.getItem('auth_token');
      if (token) this.setToken(token);
    } catch (error) {
      // AsyncStorage not available, continue without persistence
      console.log('AsyncStorage not available, using in-memory token storage');
    }
  }

  setToken(token: string | null) {
    this.token = token;
    // Save to AsyncStorage if available
    try {
      const AsyncStorage = require('@react-native-async-storage/async-storage').default;
      if (token) {
        AsyncStorage.setItem('auth_token', token);
      } else {
        AsyncStorage.removeItem('auth_token');
      }
    } catch (error) {
      // AsyncStorage not available, continue without persistence
    }
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

  async post<T>(endpoint: string, body?: any, isFormData?: boolean): Promise<ApiResponse<T>> {
    if (isFormData && body instanceof FormData) {
      // For file uploads, don't stringify and don't set Content-Type (browser/RN will set it with boundary)
      const headers: HeadersInit = {
        'Accept': 'application/json',
      };
      
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        method: 'POST',
        headers,
        body: body,
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        return {
          success: false,
          message: 'Invalid response from server',
        };
      }

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
    }
    
    return this.request<T>(endpoint, {
      method: 'POST',
      body: JSON.stringify(body),
    });
  }

  async put<T>(endpoint: string, body?: any, isFormData?: boolean): Promise<ApiResponse<T>> {
    if (isFormData && body instanceof FormData) {
      // For file uploads, don't stringify and don't set Content-Type (browser/RN will set it with boundary)
      const headers: HeadersInit = {
        'Accept': 'application/json',
      };
      
      if (this.token) {
        headers['Authorization'] = `Bearer ${this.token}`;
      }

      const url = `${this.baseURL}${endpoint}`;
      const response = await fetch(url, {
        method: 'PUT',
        headers,
        body: body,
      });

      let data;
      try {
        data = await response.json();
      } catch (e) {
        return {
          success: false,
          message: 'Invalid response from server',
        };
      }

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
    }
    
    return this.request<T>(endpoint, {
      method: 'PUT',
      body: JSON.stringify(body),
    });
  }

  async delete<T>(endpoint: string): Promise<ApiResponse<T>> {
    return this.request<T>(endpoint, { method: 'DELETE' });
  }
}

export const apiService = new ApiService();

