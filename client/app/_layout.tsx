import { DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, useRouter, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useRef } from 'react';
import { View, ActivityIndicator } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import 'react-native-reanimated';

import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { AppProvider } from '@/contexts/AppContext';
import { DialogProvider } from '@/contexts/DialogContext';

export const unstable_settings = {
  anchor: '(tabs)',
};

function RootLayoutNav() {
  const { isAuthenticated, isLoading } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  // Track whether the very first auth check has completed.
  // After that, isLoading changes (e.g. during login()) must NOT
  // trigger a full remount of the screen stack.
  const initialCheckDone = useRef(false);
  if (!isLoading) {
    initialCheckDone.current = true;
  }

  useEffect(() => {
    // Don't redirect until the initial auth check is done
    if (!initialCheckDone.current) return;

    const inAuthGroup = segments[0] === '(tabs)';
    const isChangePasswordPage = segments[0] === 'change-password';
    const isLoginPage = segments[0] === 'login';

    if (isChangePasswordPage && !isAuthenticated) {
      router.replace('/login');
      return;
    }

    if (!isAuthenticated && inAuthGroup) {
      router.replace('/login');
    } else if (isAuthenticated && isLoginPage) {
      // Login screen handles its own redirect after success
    }
  }, [isAuthenticated, isLoading, segments]);

  // Only show the full-screen spinner on the very first load,
  // not on subsequent isLoading toggles (e.g. during login/logout).
  if (!initialCheckDone.current) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#FAFAF9' }}>
        <ActivityIndicator size="large" color="#1A1A1A" />
      </View>
    );
  }

  return (
    <Stack>
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="change-password" options={{ headerShown: false }} />
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen name="project/[id]" options={{ headerShown: false }} />
      <Stack.Screen name="billing-detail" options={{ headerShown: false }} />
      <Stack.Screen name="help-center" options={{ headerShown: false }} />
      <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <ThemeProvider value={DefaultTheme}>
        <AuthProvider>
          <AppProvider>
            <DialogProvider>
              <RootLayoutNav />
              <StatusBar style="auto" />
            </DialogProvider>
          </AppProvider>
        </AuthProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}