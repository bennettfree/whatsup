import type { NativeStackScreenProps } from '@react-navigation/native-stack';
import type { BottomTabScreenProps } from '@react-navigation/bottom-tabs';
import type { CompositeScreenProps, NavigatorScreenParams } from '@react-navigation/native';

// ============================================
// Root Stack (contains auth + main app)
// ============================================

export type RootStackParamList = {
  Auth: undefined;
  Main: NavigatorScreenParams<MainTabParamList>;
  PlaceDetail: { placeId: string };
  EventDetail: { eventId: string };
  MomentDetail: { momentId: string };
  UserProfile: { userId: string };
  Search: { initialQuery?: string };
  Settings: undefined;
};

// ============================================
// Main Tab Navigator
// ============================================

export type MainTabParamList = {
  Home: undefined;
  Explore: undefined;
  Map: undefined;
  Saved: undefined;
  Profile: undefined;
};

// ============================================
// Auth Stack
// ============================================

export type AuthStackParamList = {
  Welcome: undefined;
  Login: undefined;
  Register: undefined;
  ForgotPassword: undefined;
};

// ============================================
// Screen Props Types
// ============================================

// Root stack screens
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

// Main tab screens
export type MainTabScreenProps<T extends keyof MainTabParamList> =
  CompositeScreenProps<
    BottomTabScreenProps<MainTabParamList, T>,
    NativeStackScreenProps<RootStackParamList>
  >;

// Auth stack screens
export type AuthStackScreenProps<T extends keyof AuthStackParamList> =
  NativeStackScreenProps<AuthStackParamList, T>;

// ============================================
// Navigation Helpers
// ============================================

declare global {
  namespace ReactNavigation {
    interface RootParamList extends RootStackParamList {}
  }
}



