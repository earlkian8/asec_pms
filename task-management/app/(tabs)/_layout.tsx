import { Tabs } from 'expo-router';
import React from 'react';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Home, CheckSquare, Clock, User } from 'lucide-react-native';
import { D } from '@/utils/colors';

export default function TabLayout() {
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor:   D.ink,
        tabBarInactiveTintColor: D.inkLight,
        headerShown: false,
        tabBarStyle: {
          backgroundColor:  D.surface,
          borderTopWidth:   1,
          borderTopColor:   D.hairline,
          height:           56 + insets.bottom,
          paddingBottom:    Math.max(insets.bottom, 8),
          paddingTop:       8,
        },
        tabBarLabelStyle: {
          fontSize:   10,
          fontWeight: '600',
          letterSpacing: 0.3,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, size }) => <Home size={size ?? 22} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="tasks"
        options={{
          title: 'Tasks',
          tabBarIcon: ({ color, size }) => <CheckSquare size={size ?? 22} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarIcon: ({ color, size }) => <Clock size={size ?? 22} color={color} strokeWidth={1.8} />,
        }}
      />
      <Tabs.Screen
        name="about"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color, size }) => <User size={size ?? 22} color={color} strokeWidth={1.8} />,
        }}
      />
    </Tabs>
  );
}