import React from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, { FadeInUp } from 'react-native-reanimated';

interface AnimatedViewProps {
  children: React.ReactNode;
  style?: ViewStyle;
  delay?: number;
  index?: number;
}

export default function AnimatedView({
  children,
  style,
  delay = 0,
  index = 0,
}: AnimatedViewProps) {
  const baseDelay = delay + index * 50;

  return (
    <Animated.View
      entering={FadeInUp.duration(400).delay(baseDelay).springify()}
      style={style}>
      {children}
    </Animated.View>
  );
}

