import React from 'react';
import { View, Text } from 'react-native';

interface PriceLevelProps {
  level: 1 | 2 | 3 | 4;
  size?: 'sm' | 'md' | 'lg';
}

const sizeStyles = {
  sm: 'text-xs',
  md: 'text-sm',
  lg: 'text-base',
};

export const PriceLevel = ({ level, size = 'md' }: PriceLevelProps) => {
  return (
    <View className="flex-row">
      {[1, 2, 3, 4].map((i) => (
        <Text
          key={i}
          className={`
            ${sizeStyles[size]}
            ${i <= level ? 'text-accent-600 font-semibold' : 'text-gray-300'}
          `}
        >
          $
        </Text>
      ))}
    </View>
  );
};



