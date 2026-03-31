import React from 'react';
import { TouchableOpacity, StyleSheet, ViewStyle } from 'react-native';
import Animated, {
  FadeIn,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { AppColors } from '@/utils/colors';

interface AnimatedCardProps {
  children: React.ReactNode;
  onPress?: () => void;
  style?: ViewStyle;
  delay?: number;
  index?: number;
  disabled?: boolean;
}

const AnimatedTouchable = Animated.createAnimatedComponent(TouchableOpacity);

export default function AnimatedCard({
  children,
  onPress,
  style,
  delay = 0,
  index = 0,
  disabled = false,
}: AnimatedCardProps) {
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ scale: scale.value }],
      opacity: opacity.value,
    };
  });

  const handlePressIn = () => {
    if (disabled || !onPress) return;
    scale.value = withSpring(0.97, { damping: 15 });
    opacity.value = withTiming(0.8, { duration: 100 });
  };

  const handlePressOut = () => {
    if (disabled || !onPress) return;
    scale.value = withSpring(1, { damping: 15 });
    opacity.value = withTiming(1, { duration: 100 });
  };

  const handlePress = () => {
    if (disabled || !onPress) return;
    onPress();
  };

  const enteringAnimation = FadeIn.duration(250).delay(delay + index * 50);

  if (onPress) {
    return (
      <AnimatedTouchable
        entering={enteringAnimation}
        style={[
          styles.card,
          { backgroundColor: AppColors.card, borderColor: AppColors.border },
          style,
          animatedStyle,
        ]}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        disabled={disabled}>
        {children}
      </AnimatedTouchable>
    );
  }

  return (
    <Animated.View
      entering={enteringAnimation}
      style={[
        styles.card,
        { backgroundColor: AppColors.card, borderColor: AppColors.border },
        style,
      ]}>
      {children}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
  },
});

