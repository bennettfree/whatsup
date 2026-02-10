import React, { useState, useCallback } from 'react';
import { View, Text, FlatList, TouchableOpacity, Dimensions, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import * as Haptics from 'expo-haptics';
import { Icon, iconColors } from '@/components/Icon';
import { mockPlaces } from '@/utils/mockData';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CARD_WIDTH = (SCREEN_WIDTH - 48) / 2;

type SavedTab = 'all' | 'places' | 'events';

export const SavedScreen = () => {
  const [activeTab, setActiveTab] = useState<SavedTab>('all');
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    // TODO: Implement refresh functionality
    setTimeout(() => setRefreshing(false), 1000);
  };

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
            onPress={() => {
              setActiveTab(tab.key);
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }}
            className="px-4 py-2 rounded-full"
            style={{
              backgroundColor: activeTab === tab.key ? '#00447C' : '#F3F4F6',
              shadowColor: activeTab === tab.key ? '#00447C' : 'transparent',
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: activeTab === tab.key ? 0.25 : 0,
              shadowRadius: 3,
              elevation: activeTab === tab.key ? 2 : 0,
            }}
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

      {/* Saved Items Grid - Virtualized with FlatList */}
      <FlatList
        data={mockPlaces}
        keyExtractor={(item) => item.id}
        numColumns={2}
        columnWrapperStyle={{ justifyContent: 'space-between', paddingHorizontal: 16 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 20, paddingTop: 8 }}
        renderItem={({ item: place }) => (
          <TouchableOpacity
            className="mb-4"
            style={{ width: CARD_WIDTH }}
            activeOpacity={0.9}
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
            }}
          >
            <View className="relative">
              <Image
                source={{ uri: place.imageUrls[0] }}
                style={{ width: CARD_WIDTH, height: CARD_WIDTH, borderRadius: 12 }}
                contentFit="cover"
                priority="high"
                transition={200}
              />
              <TouchableOpacity 
                className="absolute top-2 right-2 bg-white/90 p-1.5 rounded-full"
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => {});
                }}
              >
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
        )}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#000000"
            colors={['#000000']}
            progressBackgroundColor="#ffffff"
          />
        }
        // Performance optimizations
        removeClippedSubviews={true}
        maxToRenderPerBatch={6}
        windowSize={5}
        initialNumToRender={10}
        getItemLayout={(data, index) => ({
          length: CARD_WIDTH + 16, // card height + margin
          offset: (CARD_WIDTH + 16) * Math.floor(index / 2),
          index,
        })}
      />
    </SafeAreaView>
  );
};
