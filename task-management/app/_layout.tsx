import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { AuthProvider } from '@/contexts/AuthContext';
import { DialogProvider } from '@/contexts/DialogContext';
import { AuthGuard } from '@/components/AuthGuard';


export default function RootLayout() {
  const colorScheme = useColorScheme();

  return (
    <AuthProvider>
      <DialogProvider>
        <AuthGuard>
          <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
            <Stack>
              <Stack.Screen name="login" options={{ headerShown: false }} />
              <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
              <Stack.Screen 
                name="task-detail" 
                options={{ 
                  headerShown: false,
                  presentation: 'card',
                }} 
              />
              <Stack.Screen 
                name="help-center" 
                options={{ 
                  headerShown: false,
                  presentation: 'card',
                }} 
              />
            </Stack>
            <StatusBar style="auto" />
          </ThemeProvider>
        </AuthGuard>
      </DialogProvider>
    </AuthProvider>
  );
}
