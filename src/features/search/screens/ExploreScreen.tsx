import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Pressable, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const GRID_GAP = 2;
const SMALL_SIZE = (SCREEN_WIDTH - GRID_GAP * 2) / 3;
const LARGE_SIZE = SMALL_SIZE * 2 + GRID_GAP;

const exploreImages = [
  'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?w=400&h=800&fit=crop',
  'https://images.unsplash.com/photo-1559339352-11d035aa65de?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1533777857889-4be7c70b33f7?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1470337458703-46ad1756a187?w=400&h=800&fit=crop',
  'https://images.unsplash.com/photo-1466978913421-dad2ebd01d17?w=400&h=400&fit=crop',
  'https://images.unsplash.com/photo-1551218808-94e220e084d2?w=400&h=400&fit=crop',
];

export const ExploreScreen = () => {
  const [activeFeed, setActiveFeed] = useState<'explore' | 'friends'>('explore');

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Feed toggle (Friends / Explore) */}
      <View className="px-4 pt-3 pb-2 bg-white border-b border-gray-100">
        <View className="flex-row bg-gray-100 rounded-full p-1">
          <Pressable
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 6,
              borderRadius: 9999,
              backgroundColor: activeFeed === 'friends' ? '#FFFFFF' : 'transparent',
              ...(activeFeed === 'friends' && {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
              }),
            }}
            onPress={() => setActiveFeed('friends')}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: activeFeed === 'friends' ? '#111827' : '#6B7280',
              }}
            >
              Friends
            </Text>
          </Pressable>
          <Pressable
            style={{
              flex: 1,
              alignItems: 'center',
              paddingVertical: 6,
              borderRadius: 9999,
              backgroundColor: activeFeed === 'explore' ? '#FFFFFF' : 'transparent',
              ...(activeFeed === 'explore' && {
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
              }),
            }}
            onPress={() => setActiveFeed('explore')}
          >
            <Text
              style={{
                fontSize: 12,
                fontWeight: '600',
                color: activeFeed === 'explore' ? '#111827' : '#6B7280',
              }}
            >
              Explore
            </Text>
          </Pressable>
        </View>
        <Text className="mt-2 text-xs text-gray-500">
          {activeFeed === 'friends'
            ? 'See spots your friends are saving and talking about.'
            : 'Find new places, events, and scenes around you.'}
        </Text>
      </View>

      {/* Content */}
      {activeFeed === 'friends' ? (
        // Blank Friends page
        <View className="flex-1 bg-gray-50" />
      ) : (
        // Explore Grid
        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="flex-row flex-wrap">
            {/* Row 1: 3 small */}
            <View className="flex-row">
              {exploreImages.slice(0, 3).map((img, i) => (
                <TouchableOpacity
                  key={i}
                  style={{
                    width: SMALL_SIZE,
                    height: SMALL_SIZE,
                    marginRight: i < 2 ? GRID_GAP : 0,
                    marginBottom: GRID_GAP,
                  }}
                >
                  <Image source={{ uri: img }} style={{ flex: 1 }} contentFit="cover" />
                </TouchableOpacity>
              ))}
            </View>

            {/* Row 2: 1 large + 2 small stacked */}
            <View className="flex-row">
              <TouchableOpacity
                style={{
                  width: LARGE_SIZE,
                  height: LARGE_SIZE,
                  marginRight: GRID_GAP,
                  marginBottom: GRID_GAP,
                }}
              >
                <Image
                  source={{ uri: exploreImages[3] }}
                  style={{ flex: 1 }}
                  contentFit="cover"
                />
              </TouchableOpacity>
              <View>
                {exploreImages.slice(4, 6).map((img, i) => (
                  <TouchableOpacity
                    key={i}
                    style={{
                      width: SMALL_SIZE,
                      height: SMALL_SIZE,
                      marginBottom: GRID_GAP,
                    }}
                  >
                    <Image source={{ uri: img }} style={{ flex: 1 }} contentFit="cover" />
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Row 3: 2 small stacked + 1 large */}
            <View className="flex-row">
              <View>
                {exploreImages.slice(6, 8).map((img, i) => (
                  <TouchableOpacity
                    key={i}
                    style={{
                      width: SMALL_SIZE,
                      height: SMALL_SIZE,
                      marginRight: GRID_GAP,
                      marginBottom: GRID_GAP,
                    }}
                  >
                    <Image source={{ uri: img }} style={{ flex: 1 }} contentFit="cover" />
                  </TouchableOpacity>
                ))}
              </View>
              <TouchableOpacity
                style={{
                  width: LARGE_SIZE,
                  height: LARGE_SIZE,
                  marginBottom: GRID_GAP,
                }}
              >
                <Image
                  source={{ uri: exploreImages[8] }}
                  style={{ flex: 1 }}
                  contentFit="cover"
                />
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      )}
    </SafeAreaView>
  );
};
