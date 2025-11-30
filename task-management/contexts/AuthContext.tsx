import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter } from 'expo-router';
import { apiService } from '@/services/api';
import { User } from '@/types';

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
        name: string;
        email: string;
      }>('/task-management/me');

      if (response.success && response.data) {
        setUser({
          id: response.data.id,
          name: response.data.name,
          email: response.data.email,
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
        user: {
          id: number;
          name: string;
          email: string;
        };
        token: string;
      }>('/task-management/login', { email, password });

      if (response.success && response.data) {
        // Store token
        apiService.setToken(response.data.token);

        // Set user
        setUser({
          id: response.data.user.id,
          name: response.data.user.name,
          email: response.data.user.email,
        });

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
      await apiService.post('/task-management/logout');
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      // Clear local state regardless of API call result
      setUser(null);
      apiService.setToken(null);
      router.replace('/login');
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

