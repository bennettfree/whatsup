import React from 'react';
import { View, Text } from 'react-native';
import { Image } from 'expo-image';

type AvatarSize = 'xs' | 'sm' | 'md' | 'lg' | 'xl';

interface AvatarProps {
  uri?: string;
  name?: string;
  size?: AvatarSize;
  className?: string;
}

const sizeStyles: Record<AvatarSize, { container: string; text: string; dimension: number }> = {
  xs: { container: 'w-6 h-6', text: 'text-xs', dimension: 24 },
  sm: { container: 'w-8 h-8', text: 'text-sm', dimension: 32 },
  md: { container: 'w-10 h-10', text: 'text-base', dimension: 40 },
  lg: { container: 'w-14 h-14', text: 'text-lg', dimension: 56 },
  xl: { container: 'w-20 h-20', text: 'text-2xl', dimension: 80 },
};

const getInitials = (name?: string): string => {
  if (!name) return '?';
  const parts = name.split(' ');
  if (parts.length >= 2) {
    return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

const getColorFromName = (name?: string): string => {
  const colors = [
    'bg-primary-500',
    'bg-accent-500',
    'bg-blue-500',
    'bg-purple-500',
    'bg-pink-500',
    'bg-orange-500',
    'bg-teal-500',
  ];
  if (!name) return colors[0];
  const index = name.charCodeAt(0) % colors.length;
  return colors[index];
};

export const Avatar = ({ uri, name, size = 'md', className = '' }: AvatarProps) => {
  const config = sizeStyles[size];

  if (uri) {
    return (
      <Image
        source={{ uri }}
        style={{ width: config.dimension, height: config.dimension }}
        className={`rounded-full bg-gray-200 ${className}`}
        contentFit="cover"
        transition={200}
      />
    );
  }

  return (
    <View
      className={`
        ${config.container} 
        ${getColorFromName(name)} 
        rounded-full 
        items-center 
        justify-center
        ${className}
      `}
    >
      <Text className={`font-bold text-white ${config.text}`}>{getInitials(name)}</Text>
    </View>
  );
};



