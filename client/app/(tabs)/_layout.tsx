import { Tabs } from 'expo-router';
import React from 'react';
import { Home, Briefcase, User, Receipt } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { View, Platform } from 'react-native';
import { HapticTab } from '@/components/haptic-tab';
import { useAuth } from '@/contexts/AuthContext';

// ── Design tokens (shared across all tab screens) ─────────────────────────────
export const DS = {
  // Palette — warm chalk whites + ink blacks
  ink:        '#0F0F0E',   // near-black text
  inkMid:     '#4A4845',   // secondary text
  inkLight:   '#9A9691',   // tertiary/placeholder
  chalk:      '#FAFAF8',   // page background
  surface:    '#FFFFFF',   // card background
  hairline:   '#E8E5DF',   // borders
  hairlineMd: '#D4D0C8',   // stronger borders
  accent:     '#0F0F0E',   // CTA / active
  accentWarm: '#C17D3C',   // amber accent (budget, warnings)
  green:      '#2D7D52',   // success
  red:        '#C0392B',   // error/unpaid
  blue:       '#1D4ED8',   // primary blue (progress)
  // Typography scale
  t10: 10, t11: 11, t12: 12, t13: 13, t14: 14, t15: 15, t16: 16,
  t18: 18, t20: 20, t22: 22, t24: 24, t28: 28, t32: 32,
  // Radius
  r4: 4, r6: 6, r8: 8, r10: 10, r12: 12, r16: 16,
  // Shadows
  shadowSm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 2,
  },
  shadowMd: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 10,
    elevation: 4,
  },
};

export default function TabLayout() {
  const insets = useSafeAreaInsets();
  const { displayBillingModule } = useAuth();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: DS.ink,
        tabBarInactiveTintColor: DS.inkLight,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: {
          backgroundColor: DS.surface,
          borderTopColor: DS.hairline,
          borderTopWidth: 1,
          height: 56 + insets.bottom,
          paddingBottom: Math.max(insets.bottom, 6),
          paddingTop: 6,
          ...DS.shadowMd,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          letterSpacing: 0.3,
          fontFamily: 'Inter',
          marginTop: 2,
        },
        tabBarIconStyle: {
          marginBottom: 0,
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color, focused }) => (
            <View style={{ alignItems: 'center' }}>
              <Home size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="projects"
        options={{
          title: 'Projects',
          tabBarIcon: ({ color, focused }) => (
            <Briefcase size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
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
                tabBarIcon: ({ color, focused }) => (
                  <Receipt size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
                ),
              }
            : {
                title: 'Billings',
                href: null,
                tabBarItemStyle: { display: 'none', width: 0, minWidth: 0, overflow: 'hidden' },
              }
        }
      />
      <Tabs.Screen
        name="about"
        options={{
          title: 'About',
          tabBarIcon: ({ color, focused }) => (
            <User size={22} color={color} strokeWidth={focused ? 2.5 : 1.8} />
          ),
        }}
      />
    </Tabs>
  );
}