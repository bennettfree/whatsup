import React from 'react';
import { View, Text } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';
import { useTheme } from '@/contexts/ThemeContext';

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

interface StarIconProps {
  fillPercentage: number; // 0-100
  size: number;
  color: string;
}

const StarIcon = ({ fillPercentage, size, color }: StarIconProps) => {
  return (
    <View style={{ width: size, height: size, position: 'relative' }}>
      {/* Outline star (background) */}
      <FontAwesome
        name="star-o"
        size={size}
        color={color}
        style={{ position: 'absolute', top: 0, left: 0 }}
      />
      
      {/* Filled star with vertical clip from bottom */}
      <View
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: size,
          height: size,
          overflow: 'hidden',
        }}
      >
        <View
          style={{
            position: 'absolute',
            bottom: 0,
            left: 0,
            width: size,
            height: `${fillPercentage}%`,
            overflow: 'hidden',
          }}
        >
          <FontAwesome
            name="star"
            size={size}
            color={color}
            style={{ position: 'absolute', bottom: 0, left: 0 }}
          />
        </View>
      </View>
    </View>
  );
};

export const Rating = ({
  value,
  maxValue = 5,
  showValue = true,
  size = 'md',
  reviewCount,
}: RatingProps) => {
  const { colors } = useTheme();
  const config = sizeConfig[size];
  
  // Calculate fill percentage for each star
  const getStarFill = (starIndex: number): number => {
    const starValue = value - starIndex;
    if (starValue >= 1) return 100;
    if (starValue <= 0) return 0;
    return starValue * 100;
  };

  return (
    <View className={`flex-row items-center ${config.gap}`}>
      {/* Render all stars with appropriate fill */}
      {Array(maxValue)
        .fill(null)
        .map((_, i) => (
          <StarIcon
            key={`star-${i}`}
            fillPercentage={getStarFill(i)}
            size={config.star}
            color={colors.primary}
          />
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



