import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiService } from '@/services/api';
import { useAuth } from './AuthContext';

interface Notification {
  id: string;
  type: 'update' | 'milestone' | 'issue' | 'general' | 'status_change';
  title: string;
  message: string;
  date: string;
  projectId?: string;
  read: boolean;
}

interface AppContextType {
  favorites: Set<string>;
  notifications: Notification[];
  isLoadingNotifications: boolean;
  toggleFavorite: (projectId: string) => void;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;
  clearAllNotifications: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  unreadCount: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const { isAuthenticated } = useAuth();

  // Fetch notifications from API
  const fetchNotifications = useCallback(async () => {
    if (!isAuthenticated) {
      setNotifications([]);
      return;
    }

    try {
      setIsLoadingNotifications(true);
      const response = await apiService.get<Notification[]>('/client/notifications');

      console.log('Notifications API Response:', response);

      if (response.success && response.data) {
        console.log('Setting notifications:', response.data.length);
        setNotifications(response.data);
      } else {
        console.log('No notifications data or unsuccessful response');
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error fetching notifications:', error);
      setNotifications([]);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [isAuthenticated]);

  // Fetch notifications when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      fetchNotifications();
      // Set up polling to refresh notifications every 30 seconds
      const interval = setInterval(() => {
        fetchNotifications();
      }, 30000);

      return () => clearInterval(interval);
    } else {
      setNotifications([]);
    }
  }, [isAuthenticated, fetchNotifications]);

  const toggleFavorite = (projectId: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(projectId)) {
        newFavorites.delete(projectId);
      } else {
        newFavorites.add(projectId);
      }
      return newFavorites;
    });
  };

  const markNotificationAsRead = async (id: string) => {
    try {
      const response = await apiService.put(`/client/notifications/${id}/read`);
      
      if (response.success) {
        // Update local state optimistically
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, read: true } : n))
        );
      }
    } catch (error) {
      console.error('Error marking notification as read:', error);
      // Still update optimistically
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    }
  };

  const markAllNotificationsAsRead = async () => {
    try {
      const response = await apiService.put('/client/notifications/read-all');
      
      if (response.success) {
        // Update local state
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch (error) {
      console.error('Error marking all notifications as read:', error);
    }
  };

  const clearAllNotifications = async () => {
    try {
      const response = await apiService.delete('/client/notifications');
      
      if (response.success) {
        setNotifications([]);
      }
    } catch (error) {
      console.error('Error clearing notifications:', error);
    }
  };

  const refreshNotifications = fetchNotifications;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        favorites,
        notifications,
        isLoadingNotifications,
        toggleFavorite,
        markNotificationAsRead,
        markAllNotificationsAsRead,
        clearAllNotifications,
        refreshNotifications,
        unreadCount,
      }}>
      {children}
    </AppContext.Provider>
  );
}

export function useApp() {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
}

