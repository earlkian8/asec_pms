import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { AppColors } from '@/constants/colors';

interface ProgressBarProps {
  progress: number; // 0-100
  height?: number;
  colors?: [string, string];
  showLabel?: boolean;
  labelColor?: string;
  style?: ViewStyle;
}

export default function ProgressBar({
  progress,
  height = 10,
  colors = ['#3B82F6', '#2563EB'],
  showLabel = false,
  labelColor,
  style,
}: ProgressBarProps) {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  return (
    <View style={style}>
      {showLabel && (
        <View style={styles.labelContainer}>
          <Text style={[styles.label, { color: labelColor || AppColors.textSecondary }]}>
            Progress
          </Text>
          <Text style={[styles.percent, { color: labelColor || AppColors.text }]}>
            {Math.round(clampedProgress)}%
          </Text>
        </View>
      )}
      <View
        style={[
          styles.bar,
          { height, backgroundColor: AppColors.border },
        ]}>
        <LinearGradient
          colors={colors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[
            styles.fill,
            { width: `${clampedProgress}%` },
          ]}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  labelContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  label: {
    fontSize: 13,
    fontWeight: '500',
  },
  percent: {
    fontSize: 13,
    fontWeight: '700',
  },
  bar: {
    borderRadius: 5,
    overflow: 'hidden',
  },
  fill: {
    height: '100%',
    borderRadius: 5,
  },
});
