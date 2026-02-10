import React from 'react';
import { Feather } from '@expo/vector-icons';

// Icon names that we use in the app - mapped to Feather icons
export type IconName =
  // Navigation
  | 'home'
  | 'search'
  | 'map'
  | 'heart'
  | 'user'
  // Actions
  | 'plus'
  | 'x'
  | 'check'
  | 'chevron-left'
  | 'chevron-right'
  | 'chevron-down'
  | 'more-horizontal'
  | 'more-vertical'
  | 'menu'
  | 'settings'
  | 'edit'
  | 'trash'
  | 'share'
  | 'send'
  | 'external-link'
  // Content
  | 'image'
  | 'camera'
  | 'grid'
  | 'bookmark'
  | 'star'
  | 'map-pin'
  | 'navigation'
  | 'compass'
  // Social
  | 'message-circle'
  | 'bell'
  | 'users'
  | 'user-plus'
  // Media
  | 'play'
  | 'pause'
  | 'volume-2'
  | 'music'
  | 'mic'
  // Misc
  | 'calendar'
  | 'clock'
  | 'filter'
  | 'sliders'
  | 'refresh-cw'
  | 'info'
  | 'alert-circle'
  | 'eye'
  | 'eye-off'
  | 'lock'
  | 'unlock'
  | 'mail'
  | 'phone'
  | 'globe'
  | 'link'
  | 'tag'
  | 'hash'
  | 'at-sign'
  | 'dollar-sign'
  | 'credit-card'
  | 'award'
  | 'zap'
  | 'coffee'
  | 'sun'
  | 'moon';

interface IconProps {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
}

// Brand colors - Premium blue theme
export const iconColors = {
  default: '#9CA3AF',     // Gray-400 - inactive/subtle
  active: '#00447C',      // Deep blue - active/selected (primary brand)
  primary: '#00447C',     // Deep blue - primary brand color
  secondary: '#007EE5',   // Light blue - secondary brand color
  muted: '#D1D5DB',       // Gray-300 - very subtle
  white: '#FFFFFF',
  black: '#000000',
  gradient: {
    start: '#00447C',     // Deep blue
    end: '#FFFFFF',       // White
  },
};

export const Icon = ({
  name,
  size = 24,
  color = iconColors.default,
  strokeWidth = 1.5,
}: IconProps) => {
  return (
    <Feather
      name={name}
      size={size}
      color={color}
      style={{ 
        // Feather icons use stroke, this helps with consistent weight
      }}
    />
  );
};

// Pre-configured icon variants for common use cases
export const TabIcon = ({ name, focused }: { name: IconName; focused: boolean }) => (
  <Icon
    name={name}
    size={24}
    color={focused ? iconColors.active : iconColors.default}
  />
);

export const HeaderIcon = ({ name, onPress }: { name: IconName; onPress?: () => void }) => (
  <Icon name={name} size={24} color={iconColors.active} />
);

export const ActionIcon = ({ name, active = false }: { name: IconName; active?: boolean }) => (
  <Icon
    name={name}
    size={22}
    color={active ? iconColors.primary : iconColors.active}
  />
);



