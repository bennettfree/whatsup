/**
 * Theme Context - Dark Mode System
 * 
 * Premium dark mode using brand blue colors (not pure black)
 * Persists user preference across app sessions
 */

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

type ThemeMode = 'light' | 'dark';

interface ThemeContextType {
  theme: ThemeMode;
  isDark: boolean;
  toggleTheme: () => void;
  setTheme: (mode: ThemeMode) => void;
  colors: typeof lightColors;
}

// Light mode colors
const lightColors = {
  // Backgrounds
  background: '#FFFFFF',
  backgroundSecondary: '#F9FAFB',
  backgroundTertiary: '#F3F4F6',
  
  // Surfaces
  surface: '#FFFFFF',
  surfaceElevated: '#FFFFFF',
  
  // Text
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',
  textInverse: '#FFFFFF',
  
  // Brand
  primary: '#00447C',
  primaryLight: '#007EE5',
  primaryDark: '#003366',
  
  // Borders
  border: '#E5E7EB',
  borderLight: '#F3F4F6',
  
  // States
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#007EE5',
  
  // Interactive
  hover: '#F3F4F6',
  active: '#E5E7EB',
  
  // Shadows
  shadow: '#000000',
};

// Dark mode colors - Premium dark blue theme
const darkColors = {
  // Backgrounds - Dark blues instead of pure black
  background: '#001529',        // Very dark blue (almost black)
  backgroundSecondary: '#002140', // Dark blue
  backgroundTertiary: '#003366', // Medium dark blue
  
  // Surfaces - Elevated surfaces are lighter
  surface: '#002140',
  surfaceElevated: '#003366',
  
  // Text - High contrast white/grays
  text: '#FFFFFF',
  textSecondary: '#CCE1F3',
  textTertiary: '#99C3E7',
  textInverse: '#001529',
  
  // Brand - Lighter blues for dark mode
  primary: '#007EE5',          // Light blue (was deep blue in light mode)
  primaryLight: '#3399FF',     // Even lighter
  primaryDark: '#0066CC',      // Slightly darker
  
  // Borders - Subtle blue tints
  border: '#004080',
  borderLight: '#003366',
  
  // States
  success: '#34D399',
  warning: '#FBBF24',
  error: '#F87171',
  info: '#60A5FA',
  
  // Interactive
  hover: '#003366',
  active: '#004080',
  
  // Shadows
  shadow: '#000000',
};

const THEME_STORAGE_KEY = '@whatsup_theme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider = ({ children }: { children: ReactNode }) => {
  const [theme, setThemeState] = useState<ThemeMode>('light');

  // Load saved theme on mount
  useEffect(() => {
    loadTheme();
  }, []);

  const loadTheme = async () => {
    try {
      const saved = await AsyncStorage.getItem(THEME_STORAGE_KEY);
      if (saved === 'dark' || saved === 'light') {
        setThemeState(saved);
      }
    } catch (error) {
      console.log('Failed to load theme preference');
    }
  };

  const setTheme = async (mode: ThemeMode) => {
    try {
      setThemeState(mode);
      await AsyncStorage.setItem(THEME_STORAGE_KEY, mode);
    } catch (error) {
      console.log('Failed to save theme preference');
    }
  };

  const toggleTheme = () => {
    const newTheme = theme === 'light' ? 'dark' : 'light';
    setTheme(newTheme);
  };

  const colors = theme === 'dark' ? darkColors : lightColors;
  const isDark = theme === 'dark';

  return (
    <ThemeContext.Provider value={{ theme, isDark, toggleTheme, setTheme, colors }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return context;
};

// Helper hook for quick color access
export const useColors = () => {
  const { colors } = useTheme();
  return colors;
};
