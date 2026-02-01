import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { AppColors } from '@/constants/colors';

interface LoadingStateProps {
  message?: string;
  size?: 'small' | 'large';
}

export default function LoadingState({
  message,
  size = 'large',
}: LoadingStateProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator size={size} color={AppColors.primary} />
      {message && (
        <Text style={[styles.message, { color: AppColors.textSecondary }]}>
          {message}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 64,
  },
  message: {
    fontSize: 14,
    fontWeight: '500',
    marginTop: 12,
  },
});
