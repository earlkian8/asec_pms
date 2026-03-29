import React from 'react';
import { View, ViewStyle } from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';

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
      entering={FadeIn.duration(250).delay(baseDelay)}
      style={style}>
      {children}
    </Animated.View>
  );
}

