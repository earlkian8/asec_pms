import React, { createContext, useContext, useState, useEffect } from 'react';

interface Notification {
  id: string;
  type: 'update' | 'milestone' | 'issue' | 'general';
  title: string;
  message: string;
  date: string;
  projectId?: string;
  read: boolean;
}

interface AppContextType {
  favorites: Set<string>;
  notifications: Notification[];
  toggleFavorite: (projectId: string) => void;
  addNotification: (notification: Omit<Notification, 'id' | 'read'>) => void;
  markNotificationAsRead: (id: string) => void;
  clearAllNotifications: () => void;
  unreadCount: number;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [notifications, setNotifications] = useState<Notification[]>([]);

  // Note: For persistence, install @react-native-async-storage/async-storage
  // and uncomment the storage functions below

  const toggleFavorite = (projectId: string) => {
    setFavorites((prev) => {
      const newFavorites = new Set(prev);
      if (newFavorites.has(projectId)) {
        newFavorites.delete(projectId);
      } else {
        newFavorites.add(projectId);
      }
      // saveFavorites(newFavorites); // Uncomment when AsyncStorage is added
      return newFavorites;
    });
  };

  const addNotification = (notification: Omit<Notification, 'id' | 'read'>) => {
    const newNotification: Notification = {
      ...notification,
      id: Date.now().toString(),
      read: false,
    };
    setNotifications((prev) => {
      const updated = [newNotification, ...prev];
      // saveNotifications(updated); // Uncomment when AsyncStorage is added
      return updated;
    });
  };

  const markNotificationAsRead = (id: string) => {
    setNotifications((prev) => {
      const updated = prev.map((n) => (n.id === id ? { ...n, read: true } : n));
      // saveNotifications(updated); // Uncomment when AsyncStorage is added
      return updated;
    });
  };

  const clearAllNotifications = () => {
    setNotifications([]);
    // saveNotifications([]); // Uncomment when AsyncStorage is added
  };

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <AppContext.Provider
      value={{
        favorites,
        notifications,
        toggleFavorite,
        addNotification,
        markNotificationAsRead,
        clearAllNotifications,
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

