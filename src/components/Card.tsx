import React from 'react';
import { View, Text, TouchableOpacity, type ViewProps } from 'react-native';
import { Image } from 'expo-image';

interface CardProps extends ViewProps {
  onPress?: () => void;
  children: React.ReactNode;
}

export const Card = ({ onPress, children, className = '', ...props }: CardProps) => {
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.9}
      className={`
        bg-white dark:bg-gray-800 
        rounded-2xl 
        overflow-hidden
        shadow-md
        ${className}
      `}
      {...props}
    >
      {children}
    </Wrapper>
  );
};

// Sub-components for composition
interface CardImageProps {
  uri: string;
  height?: number;
  aspectRatio?: number;
}

export const CardImage = ({ uri, height = 200, aspectRatio }: CardImageProps) => (
  <Image
    source={{ uri }}
    style={aspectRatio ? { aspectRatio } : { height }}
    className="w-full bg-gray-200"
    contentFit="cover"
    transition={200}
  />
);

interface CardContentProps {
  children: React.ReactNode;
  className?: string;
}

export const CardContent = ({ children, className = '' }: CardContentProps) => (
  <View className={`p-4 ${className}`}>{children}</View>
);

interface CardTitleProps {
  children: string;
  numberOfLines?: number;
}

export const CardTitle = ({ children, numberOfLines = 2 }: CardTitleProps) => (
  <Text
    className="text-lg font-bold text-gray-900 dark:text-white"
    numberOfLines={numberOfLines}
  >
    {children}
  </Text>
);

interface CardDescriptionProps {
  children: string;
  numberOfLines?: number;
}

export const CardDescription = ({ children, numberOfLines = 2 }: CardDescriptionProps) => (
  <Text
    className="mt-1 text-sm text-gray-500 dark:text-gray-400"
    numberOfLines={numberOfLines}
  >
    {children}
  </Text>
);

interface CardFooterProps {
  children: React.ReactNode;
}

export const CardFooter = ({ children }: CardFooterProps) => (
  <View className="flex-row items-center justify-between px-4 py-3 border-t border-gray-100 dark:border-gray-700">
    {children}
  </View>
);



