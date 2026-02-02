import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppColors } from '@/constants/colors';

interface StatBoxProps {
  title: string;
  value: string | number;
  Icon: React.ComponentType<{ size: number; color: string }>;
  color: string;
  gradient: readonly [string, string];
  style?: ViewStyle;
}

export default function StatBox({
  title,
  value,
  Icon,
  color,
  gradient,
  style,
}: StatBoxProps) {
  return (
    <View style={[styles.statBox, { backgroundColor: AppColors.card, borderColor: AppColors.border }, style]}>
      <LinearGradient
        colors={gradient as [string, string]}
        style={styles.iconContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}>
        <Icon size={24} color="#FFFFFF" />
      </LinearGradient>
      <View style={styles.content}>
        <Text style={[styles.value, { color: AppColors.text }]}>{value}</Text>
        <Text style={[styles.title, { color: AppColors.textSecondary }]}>
          {title}
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  statBox: {
    width: '100%',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  content: {
    flex: 1,
  },
  value: {
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  title: {
    fontSize: 12,
    fontWeight: '500',
  },
});
