import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  getProjectStatusColors,
  getBillingStatusColors,
  getPaymentStatusColors,
  getMilestoneStatusColors,
  getIssuePriorityColors,
  getIssueStatusColors,
  getMaterialStatusColors,
} from '@/utils/statusHelpers';

type StatusBadgeType =
  | 'project'
  | 'billing'
  | 'payment'
  | 'milestone'
  | 'issue-priority'
  | 'issue-status'
  | 'material';

interface StatusBadgeProps {
  status: string;
  type: StatusBadgeType;
  size?: 'small' | 'medium' | 'large';
  showDot?: boolean;
  showIcon?: boolean;
}

export default function StatusBadge({
  status,
  type,
  size = 'medium',
  showDot = false,
  showIcon = false,
}: StatusBadgeProps) {
  let colors: { bg: string; text: string; dot?: string; icon?: string };

  switch (type) {
    case 'project':
      colors = getProjectStatusColors(status);
      break;
    case 'billing':
      colors = getBillingStatusColors(status);
      break;
    case 'payment':
      colors = getPaymentStatusColors(status);
      break;
    case 'milestone':
      colors = getMilestoneStatusColors(status);
      break;
    case 'issue-priority':
      colors = getIssuePriorityColors(status);
      break;
    case 'issue-status':
      colors = getIssueStatusColors(status);
      break;
    case 'material':
      colors = getMaterialStatusColors(status);
      break;
    default:
      colors = { bg: '#E5E7EB', text: '#6B7280' };
  }

  const sizeStyles = {
    small: { paddingHorizontal: 8, paddingVertical: 4, fontSize: 9 },
    medium: { paddingHorizontal: 10, paddingVertical: 6, fontSize: 10 },
    large: { paddingHorizontal: 12, paddingVertical: 8, fontSize: 11 },
  };

  const currentSize = sizeStyles[size];

  return (
    <View style={[styles.badge, { backgroundColor: colors.bg }, { paddingHorizontal: currentSize.paddingHorizontal, paddingVertical: currentSize.paddingVertical }]}>
      {showDot && colors.dot && (
        <View
          style={[styles.dot, { backgroundColor: colors.dot }]}
        />
      )}
      {showIcon && colors.icon && type === 'milestone' && (
        <Ionicons
          name={colors.icon as any}
          size={14}
          color={colors.text}
          style={styles.icon}
        />
      )}
      <Text
        style={[
          styles.text,
          { color: colors.text, fontSize: currentSize.fontSize },
        ]}>
        {status.replace('-', ' ').toUpperCase()}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    gap: 6,
    alignSelf: 'flex-start',
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  icon: {
    marginRight: -2,
  },
  text: {
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});
