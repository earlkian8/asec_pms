import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { apiService } from '@/services/api';
import { initializePusher, disconnectPusher } from '@/services/pusher';

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
  login: (email: string, password: string) => Promise<{ success: boolean; message?: string }>;
  logout: () => Promise<void>;
  checkAuth: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      setIsLoading(true);
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
      } else {
        setUser(null);
        apiService.setToken(null);
      }
    } catch (error) {
      setUser(null);
      apiService.setToken(null);
    } finally {
      setIsLoading(false);
    }
  };

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; message?: string }> => {
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
      }>('/client/login', { email, password });

      if (response.success && response.data) {
        // Store token
        apiService.setToken(response.data.token);

        // Set user
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

        if (response.data.token) {
          apiService.setToken(response.data.token);
          initializePusher(response.data.token);
        }

        return { success: true };
      } else {
        return {
          success: false,
          message: response.message || 'Login failed. Please check your credentials.',
        };
      }
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : 'An error occurred during login',
      };
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      // Call logout API
      await apiService.post('/client/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state regardless of API call result
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

