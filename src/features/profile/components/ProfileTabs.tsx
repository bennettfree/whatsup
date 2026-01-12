import React from 'react';
import { View, TouchableOpacity } from 'react-native';
import { Icon, iconColors, type IconName } from '@/components/Icon';

export type ProfileTabType = 'grid' | 'saved' | 'tagged';

interface ProfileTabsProps {
  activeTab: ProfileTabType;
  onTabChange: (tab: ProfileTabType) => void;
}

const tabs: { key: ProfileTabType; icon: IconName }[] = [
  { key: 'grid', icon: 'grid' },
  { key: 'saved', icon: 'bookmark' },
  { key: 'tagged', icon: 'user' },
];

export const ProfileTabs = ({ activeTab, onTabChange }: ProfileTabsProps) => {
  return (
    <View className="flex-row bg-white border-b border-gray-200">
      {tabs.map((tab) => (
        <TouchableOpacity
          key={tab.key}
          onPress={() => onTabChange(tab.key)}
          className={`flex-1 py-3 items-center border-b-2 ${
            activeTab === tab.key ? 'border-gray-900' : 'border-transparent'
          }`}
        >
          <Icon
            name={tab.icon}
            size={22}
            color={activeTab === tab.key ? iconColors.active : iconColors.default}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};
