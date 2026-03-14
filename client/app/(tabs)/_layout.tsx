import { Tabs } from 'expo-router';
import React from 'react';
import { Home, Briefcase, User, MessageCircle, Receipt } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { HapticTab } from '@/components/haptic-tab';
import { Colors } from '@/constants/theme';
import { useAuth } from '@/contexts/AuthContext';

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { displayBillingModule } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: '#FFFFFF',
          borderTopColor: '#E5E7EB',
          borderTopWidth: 1,
          height: 60 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 8),
          paddingTop: 8,
        },
        tabBarLabelStyle: {
          fontSize: 12,
          fontWeight: '600',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => (
            <Home size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          tabBarIcon: ({ color, size }) => (
            <Briefcase size={size || 24} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="billings"
        options={
          displayBillingModule
            ? {
                title: 'Billings',
                href: '/(tabs)/billings',
                tabBarIcon: ({ color, size }) => (
                  <Receipt size={size || 24} color={color} />
                ),
              }
            : {
                title: 'Billings',
                href: null,
                tabBarItemStyle: { display: 'none', width: 0, minWidth: 0, overflow: 'hidden' },
              }
        }
      />
      {/* <Tabs.Screen
        name="chat"
        options={{
          title: 'Chat',
          tabBarIcon: ({ color, size }) => (
            <MessageCircle size={size || 24} color={color} />
          ),
        }}
      /> */}
      <Tabs.Screen
        name="about"
        options={{
          title: 'About',
          tabBarIcon: ({ color, size }) => (
            <User size={size || 24} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
