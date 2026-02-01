import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text } from 'react-native';
import type { RootStackParamList } from './types';
import { MainTabNavigator } from './MainTabNavigator';
import MomentDetailScreen from '@/features/profile/screens/MomentDetailScreen';
import PlaceDetailScreen from '@/features/places/screens/PlaceDetailScreen';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { mockUser } from '@/utils/mockData';

const Stack = createNativeStackNavigator<RootStackParamList>();

const EventDetailScreen = () => (
  <View className="flex-1 items-center justify-center bg-white">
    <Text className="text-xl font-bold">Event Details</Text>
  </View>
);

const SearchScreen = () => (
  <View className="flex-1 items-center justify-center bg-white">
    <Text className="text-xl font-bold">Search</Text>
  </View>
);

const UserProfileScreen = () => (
  <View className="flex-1 items-center justify-center bg-white">
    <Text className="text-xl font-bold">User Profile</Text>
  </View>
);

const SettingsScreen = () => (
  <View className="flex-1 items-center justify-center bg-white">
    <Text className="text-xl font-bold">Settings</Text>
  </View>
);

export const RootNavigator = () => {
  // TODO: Add authentication state check here
  const isAuthenticated = true; // Placeholder

  return (
    <NavigationContainer>
      <Stack.Navigator
        screenOptions={{
          headerShown: false,
          animation: 'slide_from_right',
        }}
      >
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainTabNavigator} />
            <Stack.Screen
              name="MomentDetail"
              component={MomentDetailScreen}
              options={{
                headerShown: false,
              }}
            />
            <Stack.Screen 
              name="PlaceDetail" 
              component={PlaceDetailScreen}
              options={{
                headerShown: true,
                headerTitle: '',
                headerTransparent: true,
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen 
              name="EventDetail" 
              component={EventDetailScreen}
              options={{
                headerShown: true,
                headerTitle: '',
                headerTransparent: true,
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen 
              name="Search" 
              component={SearchScreen}
              options={{
                animation: 'fade',
              }}
            />
            <Stack.Screen 
              name="UserProfile" 
              component={UserProfileScreen}
              options={{
                headerShown: true,
                headerTitle: '',
                headerBackTitle: 'Back',
              }}
            />
            <Stack.Screen 
              name="Settings" 
              component={SettingsScreen}
              options={{
                headerShown: true,
                headerTitle: 'Settings',
                headerBackTitle: 'Back',
              }}
            />
          </>
        ) : (
          <Stack.Screen name="Auth" component={MainTabNavigator} />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};



