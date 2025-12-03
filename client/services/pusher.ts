// Polyfills for React Native
import 'react-native-get-random-values';
import { Platform } from 'react-native';

// Only import Pusher if available (web or after proper setup)
let Pusher: any = null;
try {
  if (Platform.OS === 'web') {
    Pusher = require('pusher-js');
  } else {
    // For React Native, pusher-js needs additional setup
    // You may need to use @pusher/pusher-websocket-react-native instead
    Pusher = require('pusher-js');
  }
} catch (error) {
  console.warn('Pusher not available:', error);
}

import { apiService } from './api';

let pusherInstance: any = null;

export const initializePusher = (token: string) => {
  if (!Pusher) {
    console.warn('Pusher library not available');
    return null;
  }

  if (pusherInstance) {
    pusherInstance.disconnect();
  }

  const PUSHER_KEY = process.env.EXPO_PUBLIC_PUSHER_APP_KEY || '';
  const PUSHER_CLUSTER = process.env.EXPO_PUBLIC_PUSHER_APP_CLUSTER || '';

  if (!PUSHER_KEY || !PUSHER_CLUSTER) {
    console.warn('Pusher credentials not configured');
    return null;
  }

  try {
    pusherInstance = new Pusher(PUSHER_KEY, {
      cluster: PUSHER_CLUSTER,
      authEndpoint: `${process.env.EXPO_PUBLIC_API_URL}/api/broadcasting/auth`,
      auth: {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
      },
      enabledTransports: ['ws', 'wss'],
      forceTLS: true,
    });

    return pusherInstance;
  } catch (error) {
    console.error('Error initializing Pusher:', error);
    return null;
  }
};

export const getPusher = () => {
  if (!pusherInstance) {
    console.warn('Pusher not initialized. Call initializePusher first.');
    return null;
  }
  return pusherInstance;
};

export const disconnectPusher = () => {
  if (pusherInstance) {
    try {
      pusherInstance.disconnect();
    } catch (error) {
      console.error('Error disconnecting Pusher:', error);
    }
    pusherInstance = null;
  }
};