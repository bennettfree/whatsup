import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import type { MainTabParamList } from './types';
import { Icon, iconColors, type IconName } from '@/components/Icon';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { useProfileStore } from '@/stores';
import { mockUser } from '@/utils/mockData';

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

// Reactive Profile Tab Icon Component - This will update when store changes!
const ProfileTabIcon = () => {
  const { profileImageUri } = useProfileStore();
  const displayImage = profileImageUri || mockUser.avatarUrl;
  
  return (
    <ProfileAvatar
      uri={displayImage}
      size={24}
      editable={false}
    />
  );
};

export const MainTabNavigator = () => {
  return (
    <Tab.Navigator
      initialRouteName="Home"
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ focused }) => {
          // Show profile photo for Profile tab, icons for others
          if (route.name === 'Profile') {
            return <ProfileTabIcon />;
          }
          return (
            <Icon
              name={tabIcons[route.name]}
              size={24}
              color={focused ? iconColors.active : iconColors.default}
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
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '500',
          marginTop: -2,
        },
        tabBarShowLabel: false,
      })}
    >
      <Tab.Screen name="Map" component={MapScreen} />
      <Tab.Screen name="Explore" component={ExploreScreen} />
      <Tab.Screen name="Home" component={HomeScreen} />
      <Tab.Screen name="Saved" component={SavedScreen} />
      <Tab.Screen name="Profile" component={ProfileScreen} />
    </Tab.Navigator>
  );
};
