import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ArrowLeft } from 'lucide-react-native';
import { AppColors } from '@/utils/colors';

interface HeaderProps {
  title: string;
  showBackButton?: boolean;
  onBackPress?: () => void;
  rightAction?: React.ReactNode;
}

export default function Header({
  title,
  showBackButton = false,
  onBackPress,
  rightAction,
}: HeaderProps) {
  const insets = useSafeAreaInsets();

  return (
    <View
      style={[
        styles.header,
        {
          paddingTop: insets.top + 8,
          backgroundColor: AppColors.card,
          borderBottomColor: AppColors.border,
        },
      ]}>
      <View style={styles.headerContent}>
        {showBackButton ? (
          <TouchableOpacity
            style={styles.backButton}
            onPress={onBackPress}
            activeOpacity={0.7}>
            <ArrowLeft size={24} color={AppColors.text} />
          </TouchableOpacity>
        ) : (
          <View style={styles.backButton} />
        )}

        <View style={styles.titleContainer}>
          <Text style={[styles.headerTitle, { color: AppColors.text }]} numberOfLines={1}>
            {title}
          </Text>
        </View>

        {rightAction ? (
          <View style={styles.rightActionContainer}>{rightAction}</View>
        ) : (
          <View style={styles.backButton} />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    borderBottomWidth: 1,
    paddingBottom: 12,
    paddingHorizontal: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 44,
  },
  backButton: {
    width: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: -8,
  },
  titleContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: '600',
    textAlign: 'center',
    letterSpacing: -0.3,
  },
  rightActionContainer: {
    minWidth: 44,
    height: 44,
    justifyContent: 'center',
    alignItems: 'flex-end',
    marginRight: -8,
  },
});
