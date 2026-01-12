export const colors = {
  // Primary brand - warm coral/red
  primary: {
    50: '#fdf4f3',
    100: '#fce8e6',
    200: '#fad4d1',
    300: '#f5b3ad',
    400: '#ed857c',
    500: '#e25c50',
    600: '#cf4033',
    700: '#ad3228',
    800: '#8f2d25',
    900: '#772b25',
    950: '#40130f',
  },
  // Accent - fresh green for ratings/success
  accent: {
    50: '#f0fdf4',
    100: '#dcfce7',
    200: '#bbf7d0',
    300: '#86efac',
    400: '#4ade80',
    500: '#22c55e',
    600: '#16a34a',
    700: '#15803d',
    800: '#166534',
    900: '#14532d',
    950: '#052e16',
  },
  // Neutral grays
  gray: {
    50: '#f9fafb',
    100: '#f3f4f6',
    200: '#e5e7eb',
    300: '#d1d5db',
    400: '#9ca3af',
    500: '#6b7280',
    600: '#4b5563',
    700: '#374151',
    800: '#1f2937',
    900: '#111827',
    950: '#030712',
  },
  // Semantic colors
  success: '#22c55e',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#3b82f6',
  // Base
  white: '#ffffff',
  black: '#000000',
} as const;

export type ColorKey = keyof typeof colors;



