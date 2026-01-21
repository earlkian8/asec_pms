import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
  Dimensions,
  Platform,
} from 'react-native';
import { AlertCircle, X, CheckCircle2, Info, AlertTriangle } from 'lucide-react-native';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

interface ToastProps {
  visible: boolean;
  message: string;
  type?: ToastType;
  duration?: number;
  onDismiss: () => void;
}

const { width } = Dimensions.get('window');

export default function Toast({
  visible,
  message,
  type = 'error',
  duration = 4000,
  onDismiss,
}: ToastProps) {
  const translateY = useRef(new Animated.Value(-100)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      // Slide in and fade in
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 8,
        }),
        Animated.timing(opacity, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();

      // Auto dismiss after duration
      const timer = setTimeout(() => {
        handleDismiss();
      }, duration);

      return () => clearTimeout(timer);
    } else {
      handleDismiss();
    }
  }, [visible, duration]);

  const handleDismiss = () => {
    Animated.parallel([
      Animated.timing(translateY, {
        toValue: -100,
        duration: 250,
        useNativeDriver: true,
      }),
      Animated.timing(opacity, {
        toValue: 0,
        duration: 250,
        useNativeDriver: true,
      }),
    ]).start(() => {
      onDismiss();
    });
  };

  const getIcon = () => {
    const iconSize = 20;
    const iconColor = getColors().iconColor;
    switch (type) {
      case 'success':
        return <CheckCircle2 size={iconSize} color={iconColor} />;
      case 'warning':
        return <AlertTriangle size={iconSize} color={iconColor} />;
      case 'info':
        return <Info size={iconSize} color={iconColor} />;
      default:
        return <AlertCircle size={iconSize} color={iconColor} />;
    }
  };

  const getColors = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#D1FAE5',
          borderColor: '#10B981',
          iconColor: '#059669',
          textColor: '#065F46',
        };
      case 'warning':
        return {
          backgroundColor: '#FEF3C7',
          borderColor: '#F59E0B',
          iconColor: '#D97706',
          textColor: '#92400E',
        };
      case 'info':
        return {
          backgroundColor: '#DBEAFE',
          borderColor: '#3B82F6',
          iconColor: '#2563EB',
          textColor: '#1E40AF',
        };
      default:
        return {
          backgroundColor: '#FEE2E2',
          borderColor: '#EF4444',
          iconColor: '#DC2626',
          textColor: '#991B1B',
        };
    }
  };

  if (!visible) return null;

  const colors = getColors();

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ translateY }],
          opacity,
        },
      ]}>
      <View style={[styles.toast, { backgroundColor: colors.backgroundColor, borderColor: colors.borderColor }]}>
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            {getIcon()}
          </View>
          <Text style={[styles.message, { color: colors.textColor }]} numberOfLines={2}>
            {message}
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleDismiss}
          style={styles.closeButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <X size={16} color={colors.iconColor} />
        </TouchableOpacity>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    top: Platform.OS === 'ios' ? 50 : 20,
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 8,
  },
  iconContainer: {
    marginRight: 12,
  },
  message: {
    flex: 1,
    fontSize: 14,
    fontWeight: '500',
    lineHeight: 20,
  },
  closeButton: {
    padding: 4,
  },
});
