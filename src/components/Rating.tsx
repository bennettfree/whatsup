import React from 'react';
import { View, Text } from 'react-native';

interface RatingProps {
  value: number; // 0-5
  maxValue?: number;
  showValue?: boolean;
  size?: 'sm' | 'md' | 'lg';
  reviewCount?: number;
}

const sizeConfig = {
  sm: { star: 12, text: 'text-xs', gap: 'gap-0.5' },
  md: { star: 16, text: 'text-sm', gap: 'gap-1' },
  lg: { star: 20, text: 'text-base', gap: 'gap-1' },
};

export const Rating = ({
  value,
  maxValue = 5,
  showValue = true,
  size = 'md',
  reviewCount,
}: RatingProps) => {
  const config = sizeConfig[size];
  const fullStars = Math.floor(value);
  const hasHalfStar = value % 1 >= 0.5;
  const emptyStars = maxValue - fullStars - (hasHalfStar ? 1 : 0);

  return (
    <View className={`flex-row items-center ${config.gap}`}>
      {/* Full stars */}
      {Array(fullStars)
        .fill(null)
        .map((_, i) => (
          <Text key={`full-${i}`} style={{ fontSize: config.star }}>
            ⭐
          </Text>
        ))}

      {/* Half star */}
      {hasHalfStar && (
        <Text style={{ fontSize: config.star }}>⭐</Text>
      )}

      {/* Empty stars */}
      {Array(emptyStars)
        .fill(null)
        .map((_, i) => (
          <Text key={`empty-${i}`} style={{ fontSize: config.star, opacity: 0.3 }}>
            ⭐
          </Text>
        ))}

      {/* Numeric value */}
      {showValue && (
        <Text className={`ml-1 font-semibold text-gray-700 dark:text-gray-300 ${config.text}`}>
          {value.toFixed(1)}
        </Text>
      )}

      {/* Review count */}
      {reviewCount !== undefined && (
        <Text className={`text-gray-400 ${config.text}`}>
          ({reviewCount.toLocaleString()})
        </Text>
      )}
    </View>
  );
};



