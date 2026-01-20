import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';

type TagVariant = 'default' | 'primary' | 'success' | 'warning' | 'category';

interface TagProps {
  label: string;
  variant?: TagVariant;
  onPress?: () => void;
  size?: 'sm' | 'md';
}

const variantStyles: Record<TagVariant, { bg: string; text: string }> = {
  default: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-700 dark:text-gray-200' },
  primary: { bg: 'bg-primary-100', text: 'text-primary-700' },
  success: { bg: 'bg-accent-100', text: 'text-accent-700' },
  warning: { bg: 'bg-amber-100', text: 'text-amber-700' },
  category: { bg: 'bg-blue-100', text: 'text-blue-700' },
};

const sizeStyles = {
  sm: { container: 'px-2 py-0.5', text: 'text-xs' },
  md: { container: 'px-3 py-1', text: 'text-sm' },
};

export const Tag = ({ label, variant = 'default', onPress, size = 'md' }: TagProps) => {
  const styles = variantStyles[variant];
  const sizes = sizeStyles[size];
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      onPress={onPress}
      activeOpacity={0.7}
      className={`rounded-full ${styles.bg} ${sizes.container}`}
    >
      <Text className={`font-medium ${styles.text} ${sizes.text}`}>{label}</Text>
    </Wrapper>
  );
};

interface TagListProps {
  tags: string[];
  variant?: TagVariant;
  maxVisible?: number;
  size?: 'sm' | 'md';
}

export const TagList = ({ tags, variant = 'default', maxVisible = 3, size = 'md' }: TagListProps) => {
  const visibleTags = tags.slice(0, maxVisible);
  const remaining = tags.length - maxVisible;

  return (
    <View className="flex-row flex-wrap gap-1">
      {visibleTags.map((tag) => (
        <Tag key={tag} label={tag} variant={variant} size={size} />
      ))}
      {remaining > 0 && <Tag label={`+${remaining}`} variant="default" size={size} />}
    </View>
  );
};



