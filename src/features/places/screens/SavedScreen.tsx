import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Icon, iconColors } from '@/components/Icon';
import { mockPlaces } from '@/utils/mockData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

type SavedTab = 'all' | 'places' | 'events';

export const SavedScreen = () => {
  const [activeTab, setActiveTab] = useState<SavedTab>('all');

  const tabs: { key: SavedTab; label: string }[] = [
    { key: 'all', label: 'All' },
    { key: 'places', label: 'Places' },
    { key: 'events', label: 'Events' },
  ];

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
        <Text className="text-2xl font-bold text-gray-900">Saved</Text>
        <TouchableOpacity>
          <Icon name="plus" size={24} color={iconColors.active} />
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View className="flex-row px-4 py-3 gap-2">
        {tabs.map((tab) => (
          <TouchableOpacity
            key={tab.key}
            onPress={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-full ${
              activeTab === tab.key ? 'bg-gray-900' : 'bg-gray-100'
            }`}
          >
            <Text
              className={`font-medium ${
                activeTab === tab.key ? 'text-white' : 'text-gray-700'
              }`}
            >
              {tab.label}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Saved Items Grid */}
      <ScrollView
        className="flex-1 px-4"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20 }}
      >
        <View className="flex-row flex-wrap justify-between">
          {mockPlaces.map((place) => (
            <TouchableOpacity
              key={place.id}
              className="mb-4"
              style={{ width: CARD_WIDTH }}
            >
              <View className="relative">
                <Image
                  source={{ uri: place.imageUrls[0] }}
                  style={{ width: CARD_WIDTH, height: CARD_WIDTH, borderRadius: 12 }}
                  contentFit="cover"
                />
                <TouchableOpacity className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full">
                  <Icon name="bookmark" size={16} color={iconColors.active} />
                </TouchableOpacity>
              </View>
              <View className="mt-2">
                <Text className="font-semibold text-gray-900" numberOfLines={1}>
                  {place.name}
                </Text>
                <View className="flex-row items-center mt-1">
                  <Icon name="map-pin" size={12} color={iconColors.default} />
                  <Text className="text-sm text-gray-500 ml-1">{place.location.city}</Text>
                  <Text className="mx-1 text-gray-300">•</Text>
                  <Icon name="star" size={12} color="#FBBF24" />
                  <Text className="text-sm text-gray-500 ml-1">{place.rating}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}

          {mockPlaces.map((place) => (
            <TouchableOpacity
              key={`${place.id}-2`}
              className="mb-4"
              style={{ width: CARD_WIDTH }}
            >
              <View className="relative">
                <Image
                  source={{ uri: place.imageUrls[0] }}
                  style={{ width: CARD_WIDTH, height: CARD_WIDTH, borderRadius: 12 }}
                  contentFit="cover"
                />
                <TouchableOpacity className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full">
                  <Icon name="bookmark" size={16} color={iconColors.active} />
                </TouchableOpacity>
              </View>
              <View className="mt-2">
                <Text className="font-semibold text-gray-900" numberOfLines={1}>
                  {place.name}
                </Text>
                <View className="flex-row items-center mt-1">
                  <Icon name="map-pin" size={12} color={iconColors.default} />
                  <Text className="text-sm text-gray-500 ml-1">{place.location.city}</Text>
                  <Text className="mx-1 text-gray-300">•</Text>
                  <Icon name="star" size={12} color="#FBBF24" />
                  <Text className="text-sm text-gray-500 ml-1">{place.rating}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
