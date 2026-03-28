import { useEffect, useRef } from 'react';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import Constants from 'expo-constants';
import { apiService } from '@/services/api';

const isExpoGo = Constants.appOwnership === 'expo';

if (!isExpoGo) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

const POLL_INTERVAL = 30_000;

export function useNotifications(isAuthenticated: boolean) {
  const lastSeenId = useRef<number>(0);
  const initialized = useRef(false);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      initialized.current = false;
      lastSeenId.current = 0;
      return;
    }

    requestPermissions();
    poll();
    timer.current = setInterval(poll, POLL_INTERVAL);

    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [isAuthenticated]);

  async function requestPermissions() {
    if (Platform.OS === 'web' || isExpoGo) return;
    const { status } = await Notifications.requestPermissionsAsync();
    if (status !== 'granted') return;
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Task Management',
        importance: Notifications.AndroidImportance.HIGH,
      });
    }
  }

  async function poll() {
    try {
      const res = await apiService.get<{ id: number; title: string; message: string; read: boolean }[]>(
        '/task-management/notifications'
      );
      if (!res.success || !Array.isArray(res.data)) return;

      const maxId = res.data.length > 0 ? Math.max(...res.data.map((n) => n.id)) : 0;

      if (!initialized.current) {
        // First poll: set baseline, don't fire anything
        lastSeenId.current = maxId;
        initialized.current = true;
        return;
      }

      const newUnread = res.data.filter((n) => !n.read && n.id > lastSeenId.current);
      if (newUnread.length === 0) return;

      lastSeenId.current = Math.max(...newUnread.map((n) => n.id));

      for (const n of newUnread) {
        if (!isExpoGo) {
          await Notifications.scheduleNotificationAsync({
            content: { title: n.title, body: n.message, sound: true },
            trigger: null,
          });
        }
      }
    } catch {
      // silently ignore
    }
  }
}
