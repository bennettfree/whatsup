import { create } from 'zustand';

type ColorScheme = 'light' | 'dark' | 'system';

interface AppState {
  colorScheme: ColorScheme;
  isOnboarded: boolean;
  lastLocation: {
    latitude: number;
    longitude: number;
  } | null;

  // Actions
  setColorScheme: (scheme: ColorScheme) => void;
  setOnboarded: (onboarded: boolean) => void;
  setLastLocation: (location: { latitude: number; longitude: number } | null) => void;
}

export const useAppStore = create<AppState>((set) => ({
  colorScheme: 'system',
  isOnboarded: false,
  lastLocation: null,

  setColorScheme: (colorScheme) => set({ colorScheme }),
  setOnboarded: (isOnboarded) => set({ isOnboarded }),
  setLastLocation: (lastLocation) => set({ lastLocation }),
}));



