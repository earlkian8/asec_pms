import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { AuthProvider } from '@/contexts/AuthContext';
import { DialogProvider } from '@/contexts/DialogContext';
import { AuthGuard } from '@/components/AuthGuard';

export default function RootLayout() {
  return (
    <AuthProvider>
      <DialogProvider>
        <AuthGuard>
          <Stack>
            <Stack.Screen name="login" options={{ headerShown: false }} />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
            <Stack.Screen
              name="task-detail"
              options={{ headerShown: false, presentation: 'card' }}
            />
            <Stack.Screen
              name="project-detail"
              options={{ headerShown: false, presentation: 'card' }}
            />
            <Stack.Screen
              name="milestone-tasks"
              options={{ headerShown: false, presentation: 'card' }}
            />
            <Stack.Screen
              name="help-center"
              options={{ headerShown: false, presentation: 'card' }}
            />
          </Stack>
          <StatusBar style="dark" />
        </AuthGuard>
      </DialogProvider>
    </AuthProvider>
  );
}