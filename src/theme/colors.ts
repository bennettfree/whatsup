/**
 * App Color System - Premium Blue Theme
 * 
 * Primary: Deep Blue (#00447C)
 * Secondary: Light Blue (#007EE5)
 * Gradients: Blue to White for modern, clean aesthetics
 */

export const colors = {
  // Brand colors
  primary: {
    DEFAULT: '#00447C',
    light: '#007EE5',
    dark: '#003366',
    50: '#E6F0F9',
    100: '#CCE1F3',
    200: '#99C3E7',
    300: '#66A5DB',
    400: '#3387CF',
    500: '#007EE5',
    600: '#00447C',
    700: '#003366',
    800: '#002850',
    900: '#001D3A',
  },
  
  // Gradients
  gradients: {
    primary: ['#00447C', '#007EE5'],
    primaryToWhite: ['#00447C', '#FFFFFF'],
    lightToWhite: ['#007EE5', '#FFFFFF'],
    subtle: ['#E6F0F9', '#FFFFFF'],
  },
  
  // Semantic colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#007EE5',
  
  // Neutrals
  gray: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
    500: '#6B7280',
    600: '#4B5563',
    700: '#374151',
    800: '#1F2937',
    900: '#111827',
  },
  
  white: '#FFFFFF',
  black: '#000000',
};

// Gradient helpers for React Native
export const createLinearGradient = (type: keyof typeof colors.gradients) => ({
  colors: colors.gradients[type],
  start: { x: 0, y: 0 },
  end: { x: 1, y: 1 },
});
