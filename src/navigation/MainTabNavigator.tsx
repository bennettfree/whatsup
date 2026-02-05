import React, { useEffect, useRef } from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from './types';
import * as Haptics from 'expo-haptics';
import { Icon, iconColors, type IconName } from '@/components/Icon';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { useProfileStore } from '@/stores';
import { mockUser } from '@/utils/mockData';
import { Animated } from 'react-native';

// Feature screens
import { HomeScreen } from '@/features/feed';
import { ExploreScreen } from '@/features/search';
import { MapScreen, SavedScreen } from '@/features/places';
import { ProfileScreen } from '@/features/profile';

const Tab = createBottomTabNavigator<MainTabParamList>();

// Map tab names to icon names
const tabIcons: Record<keyof MainTabParamList, IconName> = {
  Map: 'map',
  Explore: 'search',
  Home: 'message-circle',
  Saved: 'heart',
  Profile: 'user',
};

// Tab order for determining slide direction
const tabOrder: (keyof MainTabParamList)[] = ['Map', 'Explore', 'Home', 'Saved', 'Profile'];

// Get slide direction based on tab order
const getSlideDirection = (from: keyof MainTabParamList, to: keyof MainTabParamList): 'left' | 'right' => {
  const fromIndex = tabOrder.indexOf(from);
  const toIndex = tabOrder.indexOf(to);
  return toIndex > fromIndex ? 'left' : 'right';
};

// Animated Tab Icon Component with smooth scale and opacity transitions
const AnimatedTabIcon = ({ iconName, focused, size = 24 }: { iconName: IconName; focused: boolean; size?: number }) => {
  const scale = useRef(new Animated.Value(focused ? 1 : 0.95)).current;
  const opacity = useRef(new Animated.Value(focused ? 1 : 0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1.1 : 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacity, {
        toValue: focused ? 1 : 0.7,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);

  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <Icon
        name={iconName}
        size={size}
        color={focused ? iconColors.active : iconColors.default}
      />
    </Animated.View>
  );
};

// Reactive Profile Tab Icon Component - This will update when store changes!
const ProfileTabIcon = ({ focused }: { focused: boolean }) => {
  const { profileImageUri } = useProfileStore();
  const displayImage = profileImageUri || mockUser.avatarUrl;
  const scale = useRef(new Animated.Value(focused ? 1 : 0.95)).current;
  const opacity = useRef(new Animated.Value(focused ? 1 : 0.7)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(scale, {
        toValue: focused ? 1.1 : 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacity, {
        toValue: focused ? 1 : 0.7,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  }, [focused]);
  
  return (
    <Animated.View style={{ transform: [{ scale }], opacity }}>
      <ProfileAvatar
        uri={displayImage}
        size={24}
        editable={false}
      />
    </Animated.View>
  );
};

export const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenListeners={{
        tabPress: () => {
          // Haptic feedback on tab press for tactile response
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        },
      }}
      screenOptions={({ route }) => ({
        headerShown: false,
        
        // Smooth slide transitions between screens
        animation: 'shift',
        
        // Lazy loading for better initial load performance
        lazy: true,
        
        tabBarIcon: ({ focused }) => {
          // Show profile photo for Profile tab, animated icons for others
          if (route.name === 'Profile') {
            return <ProfileTabIcon focused={focused} />;
          }
          return (
            <AnimatedTabIcon 
              iconName={tabIcons[route.name]} 
              focused={focused}
            />
          );
        },
        tabBarActiveTintColor: iconColors.active,
        tabBarInactiveTintColor: iconColors.default,
        tabBarStyle: {
          backgroundColor: '#ffffff',
          borderTopColor: '#f3f4f6',
          borderTopWidth: 1,
          paddingBottom: 8,
          paddingTop: 8,
          height: 65,
          elevation: 0,
          shadowOpacity: 0,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: -2,
        },
        tabBarShowLabel: false,
        
        // Tab bar item styling for better touch targets
        tabBarItemStyle: {
          paddingVertical: 4,
        },
      })}
    >
      <Tab.Screen 
        name="Map" 
        component={MapScreen}
        options={{
          tabBarAccessibilityLabel: 'Map',
        }}
      />
      <Tab.Screen 
        name="Explore" 
        component={ExploreScreen}
        options={{
          tabBarAccessibilityLabel: 'Explore',
        }}
      />
      <Tab.Screen 
        name="Home" 
        component={HomeScreen}
        options={{
          tabBarAccessibilityLabel: 'Messages',
        }}
      />
      <Tab.Screen 
        name="Saved" 
        component={SavedScreen}
        options={{
          tabBarAccessibilityLabel: 'Saved',
        }}
      />
      <Tab.Screen 
        name="Profile" 
        component={ProfileScreen}
        options={{
          tabBarAccessibilityLabel: 'Profile',
        }}
      />
    </Tab.Navigator>
  );
};
