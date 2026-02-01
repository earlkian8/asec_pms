// const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'https://asec-pms-3dfex.ondigitalocean.app/api';
export const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://192.168.254.107:8000/api';
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

      let data;
      try {
        data = await response.json();
      } catch (parseError) {
        // If response is not JSON, return a generic error
        return {
          success: false,
          message: response.statusText || 'An error occurred',
        };
      }

      if (!response.ok) {
        // Extract error message from response
        let errorMessage = data.message || 'An error occurred';
        
        // If there are validation errors, format them into a readable message
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
            errorMessage = errorMessages[0]; // Use first error message
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
      if (responseType !== 'json') {
        throw error;
      }
      
      // Handle network errors
      let errorMessage = 'Network error occurred';
      if (error instanceof TypeError && error.message.includes('fetch')) {
        errorMessage = 'Unable to connect to server. Please check your internet connection.';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }
      
      return {
        success: false,
        message: errorMessage,
      };
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

  // Billing methods
  async getBillings(params?: Record<string, any>): Promise<ApiResponse<any>> {
    const queryString = params ? new URLSearchParams(params).toString() : '';
    const result = await this.get(`/client/billings${queryString ? `?${queryString}` : ''}`, { responseType: 'json' });
    return result as ApiResponse<any>;
  }

  async getBilling(id: number): Promise<ApiResponse<any>> {
    const result = await this.get(`/client/billings/${id}`, { responseType: 'json' });
    return result as ApiResponse<any>;
  }

  async initiatePayment(billingId: number, data: { amount?: number; payment_method_type?: 'card' }): Promise<ApiResponse<any>> {
    return this.post(`/client/billings/${billingId}/pay`, data);
  }

  async createPaymentMethod(
    billingId: number,
    cardData: {
      cardNumber: string;
      expMonth: number;
      expYear: number;
      cvc: string;
      cardholderName: string;
      name: string;
      phone: string;
    }
  ): Promise<ApiResponse<any>> {
    return this.post(`/client/billings/${billingId}/payment-method`, {
      card_number: cardData.cardNumber,
      exp_month: cardData.expMonth,
      exp_year: cardData.expYear,
      cvc: cardData.cvc,
      cardholder_name: cardData.cardholderName,
      name: cardData.name,
      phone: cardData.phone,
    });
  }

  /**
   * Confirm Payment Intent (DEPRECATED - Not needed for PayMongo)
   * 
   * @deprecated This method is deprecated. PayMongo does not require a separate confirmation step.
   * When attaching a payment method, the payment is automatically confirmed if successful.
   * The attachment response already contains the final status and next_action.
   * This method is kept for backward compatibility but should not be used in new code.
   */
  async confirmPaymentIntent(
    billingId: number,
    paymentIntentId: string,
    returnUrl: string
  ): Promise<ApiResponse<any>> {
    return this.post(`/client/billings/${billingId}/payment-intent/confirm`, {
      payment_intent_id: paymentIntentId,
      return_url: returnUrl,
    });
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
}

export const apiService = new ApiService();

