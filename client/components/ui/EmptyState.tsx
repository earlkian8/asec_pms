import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { LucideIcon } from 'lucide-react-native';
import { AppColors } from '@/constants/colors';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  iconSize?: number;
  iconColor?: string;
}

export default function EmptyState({
  icon: Icon,
  title,
  subtitle,
  iconSize = 48,
  iconColor,
}: EmptyStateProps) {
  return (
    <View style={styles.container}>
      <Icon size={iconSize} color={iconColor || AppColors.textSecondary} />
      <Text style={[styles.title, { color: AppColors.text }]}>{title}</Text>
      {subtitle && (
        <Text style={[styles.subtitle, { color: AppColors.textSecondary }]}>
          {subtitle}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 12,
  },
  subtitle: {
    fontSize: 13,
    fontWeight: '400',
    marginTop: 6,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});
