import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { useRouter } from 'expo-router';
import { apiService } from '@/services/api';
import { initializePusher, disconnectPusher } from '@/services/pusher';
import { registerForPushNotificationsAsync } from '@/hooks/useNotifications';

interface User {
  id: number;
  client_code: string;
  name: string;
  email: string;
  contact_person: string | null;
  company: string;
  phone_number: string | null;
  is_active: boolean;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  displayBillingModule: boolean;
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  checkAuth: (silent?: boolean) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [displayBillingModule, setDisplayBillingModule] = useState(true);
  const router = useRouter();

  const checkAuth = useCallback(async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const response = await apiService.get<{
        id: number;
        client_code: string;
        name: string;
        email: string;
        contact_person: string | null;
        company: string;
        phone_number: string | null;
        is_active: boolean;
      }>('/client/me');

      if (response.success && response.data) {
        setUser({
          id: response.data.id,
          client_code: response.data.client_code,
          name: response.data.name,
          email: response.data.email,
          contact_person: response.data.contact_person,
          company: response.data.company,
          phone_number: response.data.phone_number,
          is_active: response.data.is_active,
        });
        const config = (response as { config?: { display_billing_module?: boolean } }).config;
        setDisplayBillingModule(config?.display_billing_module ?? true);
        const token = apiService.getToken();
        if (token) {
          initializePusher(token);
          registerForPushNotificationsAsync().then((pushToken) => {
            if (pushToken) apiService.registerPushToken(pushToken).catch(() => {});
          });
        }
      } else {
        setUser(null);
        setDisplayBillingModule(true);
        apiService.setToken(null);
      }
    } catch (error) {
      setUser(null);
      setDisplayBillingModule(true);
      apiService.setToken(null);
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', (nextState: AppStateStatus) => {
      if (nextState === 'active' && apiService.getToken()) {
        checkAuth(true);
      }
    });
    return () => subscription.remove();
  }, [checkAuth]);

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; message?: string; errors?: Record<string, string[]>; mustChangePassword?: boolean }> => {
    try {
      setIsLoading(true);
      const response = await apiService.post<{
        client: {
          id: number;
          client_code: string;
          name: string;
          email: string;
          contact_person: string | null;
          company: string;
          phone_number: string | null;
          is_active: boolean;
        };
        token: string;
        must_change_password?: boolean;
        config?: { display_billing_module?: boolean };
      }>('/client/login', { email, password });

      if (response.success && response.data) {
        apiService.setToken(response.data.token);

        setUser({
          id: response.data.client.id,
          client_code: response.data.client.client_code,
          name: response.data.client.name,
          email: response.data.client.email,
          contact_person: response.data.client.contact_person,
          company: response.data.client.company,
          phone_number: response.data.client.phone_number,
          is_active: response.data.client.is_active,
        });

        // Set billing module from login response directly — no checkAuth() call
        const config = (response as unknown as { config?: { display_billing_module?: boolean } }).config
          ?? response.data.config;
        setDisplayBillingModule(config?.display_billing_module ?? true);

        if (response.data.token) {
          initializePusher(response.data.token);
          registerForPushNotificationsAsync().then((pushToken) => {
            if (pushToken) apiService.registerPushToken(pushToken).catch(() => {});
          });
        }

        // Done — do NOT call checkAuth() here, it causes isLoading flicker & remount
        setIsLoading(false);

        return {
          success: true,
          mustChangePassword: response.data.must_change_password || false,
        };
      } else {
        return {
          success: false,
          message: response.message || 'Login failed. Please check your credentials.',
          errors: response.errors,
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An unexpected error occurred. Please try again.',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await apiService.post('/client/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      setUser(null);
      apiService.setToken(null);
      router.replace('/login');
      disconnectPusher();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        displayBillingModule,
        login,
        logout,
        checkAuth,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}