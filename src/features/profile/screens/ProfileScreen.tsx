import React, { useState, useCallback } from 'react';
import { View, ScrollView, FlatList, Text, TouchableOpacity, RefreshControl, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Icon, iconColors } from '@/components/Icon';
import { ProfileHeader } from '../components/ProfileHeader';
import { mockUser, formatNumber } from '@/utils/mockData';
import { Image } from 'expo-image';
import type { MainTabScreenProps } from '@/navigation/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const MOMENT_SIZE = SCREEN_WIDTH / 3;

type Moment = {
  id: string;
  mediaUri: string;
  mediaType: 'photo' | 'video';
  caption?: string;
  mediaUris?: string[]; // For carousel posts with multiple images
};

const mockMoments: Moment[] = [
  {
    id: 'm1',
    mediaUri:
      'https://cdn.pixabay.com/photo/2016/12/22/07/15/chess-1924642_1280.jpg',
    mediaType: 'photo',
    caption: 'Final move at a late-night chess tournament.',
  },
  {
    id: 'm2',
    mediaUri:
      'https://cdn.pixabay.com/photo/2024/04/13/21/58/spaghetti-and-meatballs-8694542_1280.jpg',
    mediaType: 'photo',
    caption: 'Slow pasta night with friends.',
    mediaUris: [
      'https://cdn.pixabay.com/photo/2024/04/13/21/58/spaghetti-and-meatballs-8694542_1280.jpg',
      'https://cdn.pixabay.com/photo/2019/02/21/19/00/restaurant-4011989_1280.jpg',
    ],
  },
  {
    id: 'm3',
    mediaUri:
      'https://cdn.pixabay.com/photo/2017/06/01/08/24/woman-2362804_1280.jpg',
    mediaType: 'photo',
    caption: 'Rooftop sunset before the music hit.',
    mediaUris: [
      'https://cdn.pixabay.com/photo/2017/06/01/08/24/woman-2362804_1280.jpg',
      'https://cdn.pixabay.com/photo/2020/11/12/17/14/concert-5736160_1280.jpg',
    ],
  },
  {
    id: 'm4',
    mediaUri:
      'https://cdn.pixabay.com/photo/2017/08/01/11/38/paddle-2564598_1280.jpg',
    mediaType: 'photo',
    caption: 'Paddling out before the first set rolls in.',
    mediaUris: [
      'https://cdn.pixabay.com/photo/2017/08/01/11/38/paddle-2564598_1280.jpg',
      'https://cdn.pixabay.com/photo/2018/08/14/15/22/surf-3605835_1280.jpg',
    ],
  },
  {
    id: 'm5',
    mediaUri:
      'https://cdn.pixabay.com/photo/2019/04/06/03/34/girl-4106595_1280.jpg',
    mediaType: 'photo',
    caption: 'Slow morning coffee before the day really starts.',
  },
];

type Props = MainTabScreenProps<'Profile'>;

export const ProfileScreen: React.FC<Props> = ({ navigation }) => {

  const isOwnProfile = true; // Placeholder until auth/user context is wired
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = () => {
    setRefreshing(true);
    // TODO: Implement refresh functionality
    setTimeout(() => setRefreshing(false), 1000);
  };

  const plansSaved = '13.3K';
  const eventsJoined = 3;
  const friendsCount = '563';

  const handleEditProfile = () => {
    console.log('Edit profile');
  };

  const handleSettings = () => {
    navigation.navigate('Settings');
  };

  const handleOpenMoment = useCallback((moment: Moment) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    navigation.navigate('MomentDetail', { momentId: moment.id });
  }, [navigation]);

  const renderMomentCard = useCallback(({ item: moment }: { item: Moment }) => {
    const isCarousel = moment.mediaUris && moment.mediaUris.length > 1;
    
    return (
      <TouchableOpacity
        activeOpacity={0.9}
        style={{ width: MOMENT_SIZE }}
        onPress={() => handleOpenMoment(moment)}
      >
        <View className="bg-gray-200 overflow-hidden relative">
          <Image
            source={{ uri: moment.mediaUri }}
            style={{ width: MOMENT_SIZE, height: MOMENT_SIZE }}
            contentFit="cover"
            priority="high"
            transition={150}
          />
          {/* Carousel indicator - stacked layers effect */}
          {isCarousel && (
            <View 
              style={{
                position: 'absolute',
                top: 8,
                right: 8,
                flexDirection: 'row',
                alignItems: 'center',
              }}
            >
              {/* Stacked squares icon to represent multiple images */}
              <View style={{
                backgroundColor: 'rgba(0, 0, 0, 0.6)',
                borderRadius: 8,
                paddingHorizontal: 7,
                paddingVertical: 4,
                flexDirection: 'row',
                alignItems: 'center',
                gap: 3,
              }}>
                <View style={{
                  width: 3,
                  height: 3,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 1,
                }} />
                <View style={{
                  width: 3,
                  height: 3,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 1,
                }} />
                <View style={{
                  width: 3,
                  height: 3,
                  backgroundColor: '#FFFFFF',
                  borderRadius: 1,
                }} />
              </View>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  }, [handleOpenMoment]);

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* Header - settings icon aligned with profile picture */}
      <View className="relative py-3 bg-gray-50">
        <Text className="text-base font-semibold text-gray-900 text-center">
          {isOwnProfile ? 'You' : 'Profile'}
        </Text>
        {/* Settings button positioned to align with profile picture right edge */}
        <TouchableOpacity 
          onPress={handleSettings}
          className="absolute right-4 top-2.5 w-10 h-10 items-center justify-center rounded-full"
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          style={{
            transform: [{ translateX: 0 }],
          }}
        >
          <Icon name="settings" size={22} color={iconColors.active} />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 bg-gray-50"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#000000"
            colors={['#000000']}
            progressBackgroundColor="#ffffff"
          />
        }
      >
        {/* Top identity section (card + stats + actions) */}
        <View className="pt-4 pb-2">
          <ProfileHeader
            user={mockUser}
            isOwnProfile={isOwnProfile}
            interests={['Food lover', 'Live music', 'Hidden gems']}
          />

          {/* Stats row */}
          <View className="mt-4 px-4">
            <View className="flex-row justify-around">
              <View className="items-center">
                <Text className="text-lg font-semibold text-gray-900">
                  {plansSaved}
                </Text>
                <Text
                  className="text-xs text-gray-500 mt-0.5"
                  numberOfLines={1}
                >
                  Influence
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-lg font-semibold text-gray-900">
                  {eventsJoined}
                </Text>
                <Text
                  className="text-xs text-gray-500 mt-0.5"
                  numberOfLines={1}
                >
                  Events Joined
                </Text>
              </View>
              <View className="items-center">
                <Text className="text-lg font-semibold text-gray-900">
                  {friendsCount}
                </Text>
                <Text
                  className="text-xs text-gray-500 mt-0.5"
                  numberOfLines={1}
                >
                  Friends
                </Text>
              </View>
            </View>
          </View>

          {/* Actions */}
          <View className="mt-4 px-4 mb-2">
            {isOwnProfile ? (
              <TouchableOpacity
                onPress={handleEditProfile}
                className="w-full py-2.5 rounded-full items-center"
                activeOpacity={0.9}
                style={{
                  backgroundColor: '#00447C',
                  shadowColor: '#00447C',
                  shadowOffset: { width: 0, height: 2 },
                  shadowOpacity: 0.3,
                  shadowRadius: 4,
                  elevation: 3,
                }}
              >
                <Text className="text-sm font-semibold text-white">
                  Edit profile
                </Text>
              </TouchableOpacity>
            ) : (
              <View className="flex-row gap-2">
                <TouchableOpacity
                  className="flex-1 py-2.5 rounded-full items-center"
                  activeOpacity={0.9}
                  style={{
                    backgroundColor: '#00447C',
                    shadowColor: '#00447C',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.3,
                    shadowRadius: 4,
                    elevation: 3,
                  }}
                >
                  <Text className="text-sm font-semibold text-white">
                    Follow
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-2.5 rounded-full items-center"
                  activeOpacity={0.9}
                  style={{
                    backgroundColor: '#FFFFFF',
                    borderWidth: 1.5,
                    borderColor: '#00447C',
                  }}
                >
                  <Text className="text-sm font-semibold" style={{ color: '#00447C' }}>
                    Message
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Moments Section */}
        <View className="bg-gray-50 pt-2 pb-1">
          {mockMoments.length === 0 ? (
            <View className="items-center justify-center mt-12 px-8 pb-12">
              <View className="w-20 h-20 bg-gray-200 rounded-full items-center justify-center mb-4">
                <Icon name="camera" size={32} color={iconColors.muted} />
              </View>
              <Text className="text-base font-semibold text-gray-900 mb-2">
                No moments yet
              </Text>
              <Text className="text-sm text-gray-500 text-center">
                When you're out, save a few small scenes that feel like you.
              </Text>
            </View>
          ) : (
            <FlatList
              data={mockMoments}
              keyExtractor={(item) => item.id}
              numColumns={3}
              renderItem={renderMomentCard}
              scrollEnabled={false}
              showsVerticalScrollIndicator={false}
              removeClippedSubviews={true}
              maxToRenderPerBatch={9}
              windowSize={3}
              initialNumToRender={12}
            />
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
