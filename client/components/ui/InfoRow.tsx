import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AppColors } from '@/constants/colors';

interface InfoRowProps {
  icon: string;
  label: string;
  value: string;
  iconColor?: string;
  labelColor?: string;
  valueColor?: string;
  style?: ViewStyle;
}

export default function InfoRow({
  icon,
  label,
  value,
  iconColor,
  labelColor,
  valueColor,
  style,
}: InfoRowProps) {
  return (
    <View style={[styles.row, style]}>
      <Ionicons
        name={icon as any}
        size={16}
        color={iconColor || AppColors.textSecondary}
      />
      <Text style={[styles.label, { color: labelColor || AppColors.textSecondary }]}>
        {label}
      </Text>
      <Text style={[styles.value, { color: valueColor || AppColors.text }]}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    flex: 1,
  },
  value: {
    fontSize: 14,
    fontWeight: '600',
  },
});
