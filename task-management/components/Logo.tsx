import React from 'react';
import { Image } from 'expo-image';

interface LogoProps {
  width?: number;
  height?: number;
}

export default function Logo({ width = 157, height = 40 }: LogoProps) {
  return (
    <Image
      source={require('@/assets/logo.svg')}
      style={{ width, height }}
      contentFit="contain"
    />
  );
}

