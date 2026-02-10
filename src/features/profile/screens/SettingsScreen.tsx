import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Switch, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Icon, iconColors } from '@/components/Icon';
import { useTheme } from '@/contexts/ThemeContext';
import type { MainTabScreenProps } from '@/navigation/types';

type SettingsSectionItem = {
  id: string;
  label: string;
  icon: string;
  type: 'toggle' | 'nav' | 'action' | 'info';
  value?: boolean;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
  destructive?: boolean;
  showChevron?: boolean;
};

type SettingsSection = {
  title?: string;
  items: SettingsSectionItem[];
};

export const SettingsScreen = ({ navigation }: MainTabScreenProps<'Profile'>) => {
  // Theme
  const { isDark, toggleTheme, colors } = useTheme();
  
  // Settings state
  const [pushNotifications, setPushNotifications] = useState(true);
  const [locationServices, setLocationServices] = useState(true);

  const handleToggle = (setter: (v: boolean) => void) => (value: boolean) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setter(value);
  };

  const handleNavPress = (action: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    Alert.alert(action, 'Coming soon');
  };

  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Logout', style: 'destructive', onPress: () => console.log('Logout') },
      ]
    );
  };

  const handleClearCache = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
    Alert.alert(
      'Clear Cache',
      'This will clear cached images and data. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Clear', style: 'destructive', onPress: () => console.log('Cache cleared') },
      ]
    );
  };

  const sections: SettingsSection[] = [
    {
      title: 'Preferences',
      items: [
        {
          id: 'notifications',
          label: 'Notifications',
          icon: 'bell',
          type: 'toggle',
          value: pushNotifications,
          onToggle: handleToggle(setPushNotifications),
        },
        {
          id: 'location',
          label: 'Location',
          icon: 'map-pin',
          type: 'toggle',
          value: locationServices,
          onToggle: handleToggle(setLocationServices),
        },
        {
          id: 'theme',
          label: 'Dark Mode',
          icon: 'moon',
          type: 'toggle',
          value: isDark,
          onToggle: () => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
            toggleTheme();
          },
        },
        {
          id: 'units',
          label: 'Units',
          icon: 'maximize-2',
          type: 'nav',
          showChevron: true,
          onPress: () => handleNavPress('Distance Units'),
        },
      ],
    },
    {
      title: 'Privacy',
      items: [
        {
          id: 'privacy',
          label: 'Privacy',
          icon: 'lock',
          type: 'nav',
          showChevron: true,
          onPress: () => handleNavPress('Privacy Settings'),
        },
        {
          id: 'blocked',
          label: 'Blocked',
          icon: 'slash',
          type: 'nav',
          showChevron: true,
          onPress: () => handleNavPress('Blocked Users'),
        },
      ],
    },
    {
      title: 'Data',
      items: [
        {
          id: 'cache',
          label: 'Clear Cache',
          icon: 'trash-2',
          type: 'action',
          destructive: true,
          onPress: handleClearCache,
        },
      ],
    },
    {
      title: 'About',
      items: [
        {
          id: 'version',
          label: 'Version',
          icon: 'info',
          type: 'info',
          showChevron: false,
        },
        {
          id: 'terms',
          label: 'Terms',
          icon: 'file-text',
          type: 'nav',
          showChevron: true,
          onPress: () => handleNavPress('Terms of Service'),
        },
        {
          id: 'privacy-policy',
          label: 'Privacy Policy',
          icon: 'shield',
          type: 'nav',
          showChevron: true,
          onPress: () => handleNavPress('Privacy Policy'),
        },
        {
          id: 'support',
          label: 'Support',
          icon: 'help-circle',
          type: 'nav',
          showChevron: true,
          onPress: () => handleNavPress('Support'),
        },
      ],
    },
    {
      items: [
        {
          id: 'logout',
          label: 'Logout',
          icon: 'log-out',
          type: 'action',
          destructive: true,
          onPress: handleLogout,
        },
      ],
    },
  ];

  const renderCustomToggle = (value: boolean, onToggle?: (v: boolean) => void) => (
    <TouchableOpacity
      activeOpacity={0.8}
      onPress={() => {
        onToggle?.(!value);
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
      }}
      className="relative"
      style={{
        width: 56,
        height: 32,
        borderRadius: 16,
        backgroundColor: value ? colors.primary : (isDark ? colors.border : '#E5E7EB'),
        justifyContent: 'center',
        paddingHorizontal: 2,
      }}
    >
      <View
        className="rounded-full"
        style={{
          width: 28,
          height: 28,
          marginLeft: value ? 24 : 0,
          backgroundColor: colors.textInverse,
          shadowColor: isDark ? '#000' : '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.15,
          shadowRadius: 3,
          elevation: 3,
        }}
      />
    </TouchableOpacity>
  );

  const renderItem = (item: SettingsSectionItem) => {
    if (item.type === 'toggle') {
      return (
        <View
          key={item.id}
          className="flex-row items-center justify-between px-6 py-6"
          style={{ backgroundColor: colors.surface }}
        >
          <View className="flex-row items-center flex-1">
            <Icon name={item.icon as any} size={24} color={colors.primary} />
            <Text className="text-lg ml-4" style={{ color: colors.text }}>{item.label}</Text>
          </View>
          {renderCustomToggle(item.value || false, item.onToggle)}
        </View>
      );
    }

    if (item.type === 'info') {
      return (
        <View
          key={item.id}
          className="flex-row items-center justify-between px-6 py-6"
          style={{ backgroundColor: colors.surface }}
        >
          <View className="flex-row items-center flex-1">
            <Icon name={item.icon as any} size={24} color={colors.primary} />
            <Text className="text-lg ml-4" style={{ color: colors.text }}>{item.label}</Text>
          </View>
          <Text className="text-base" style={{ color: colors.textTertiary }}>1.0.0</Text>
        </View>
      );
    }

    return (
      <TouchableOpacity
        key={item.id}
        className="flex-row items-center justify-between px-6 py-6"
        style={{ backgroundColor: colors.surface }}
        onPress={item.onPress}
        activeOpacity={0.7}
      >
        <View className="flex-row items-center flex-1">
          <Icon 
            name={item.icon as any} 
            size={24} 
            color={item.destructive ? '#EF4444' : colors.primary} 
          />
          <Text className="text-lg ml-4" style={{ color: item.destructive ? '#EF4444' : colors.text }}>
            {item.label}
          </Text>
        </View>
        {item.showChevron && (
          <Icon name="chevron-right" size={22} color={colors.primary} />
        )}
      </TouchableOpacity>
    );
  };

  const renderSection = (section: SettingsSection, index: number) => (
    <View key={index} className="mb-2">
      {section.title && (
        <Text className="text-sm font-semibold uppercase tracking-wider px-6 py-4" style={{ color: colors.textTertiary }}>
          {section.title}
        </Text>
      )}
      <View style={{ backgroundColor: colors.surface }}>
        {section.items.map((item, idx) => (
          <View key={item.id}>
            {renderItem(item)}
            {idx < section.items.length - 1 && (
              <View className="h-[0.5px] ml-[64px]" style={{ backgroundColor: colors.border }} />
            )}
          </View>
        ))}
      </View>
    </View>
  );

  return (
    <SafeAreaView className="flex-1" style={{ backgroundColor: colors.backgroundSecondary }} edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3" style={{ backgroundColor: colors.backgroundSecondary }}>
        <TouchableOpacity 
          onPress={() => {
            navigation.goBack();
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
          }}
          className="w-10 h-10 items-center justify-center rounded-full -ml-2"
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Icon name="chevron-left" size={28} color={colors.primary} />
        </TouchableOpacity>
        <Text className="text-lg font-semibold" style={{ color: colors.text }}>Settings</Text>
        <View className="w-6" />
      </View>

      {/* Settings Content */}
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingTop: 12, paddingBottom: 24 }}
      >
        {sections.map((section, index) => renderSection(section, index))}
      </ScrollView>
    </SafeAreaView>
  );
};
