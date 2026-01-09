import React from 'react';
import { View, ScrollView, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, iconColors } from '@/components/Icon';
import { ProfileHeader } from '../components/ProfileHeader';
import { mockUser, mockPlaces, formatNumber } from '@/utils/mockData';
import { Image } from 'expo-image';
import type { MainTabScreenProps } from '@/navigation/types';

type Review = {
  id: string;
  placeName: string;
  rating: number;
  date: string;
  category?: string;
  text: string;
  photos?: string[];
};

type Moment = {
  id: string;
  mediaUri: string;
  mediaType: 'photo' | 'video';
  caption?: string;
};

const mockReviews: Review[] = [
  {
    id: '1',
    placeName: mockPlaces[0].name,
    rating: mockPlaces[0].rating,
    date: '2 days ago',
    category: 'Restaurant',
    text: 'Cozy spot with handmade pasta and an easy, unhurried vibe. Perfect for a slow dinner.',
    photos: mockPlaces[0].imageUrls,
  },
  {
    id: '2',
    placeName: mockPlaces[1].name,
    rating: mockPlaces[1].rating,
    date: 'Last weekend',
    category: 'Nightlife',
    text: 'Rooftop views, good music, and not too crowded early in the night.',
    photos: mockPlaces[1].imageUrls,
  },
  {
    id: '3',
    placeName: mockPlaces[2].name,
    rating: mockPlaces[2].rating,
    date: 'This month',
    category: 'Cafe',
    text: 'Calm coffee spot with plenty of light and just enough noise to feel alive.',
    photos: mockPlaces[2].imageUrls,
  },
];

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
  },
  {
    id: 'm3',
    mediaUri:
      'https://cdn.pixabay.com/photo/2017/06/01/08/24/woman-2362804_1280.jpg',
    mediaType: 'photo',
    caption: 'Rooftop sunset before the music hit.',
  },
  {
    id: 'm4',
    mediaUri:
      'https://cdn.pixabay.com/photo/2017/08/01/11/38/paddle-2564598_1280.jpg',
    mediaType: 'photo',
    caption: 'First coffee, no rush, soft light.',
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
  const [activeFeed, setActiveFeed] = React.useState<'reviews' | 'moments'>(
    'reviews'
  );

  const plansSaved = mockUser.savedCount ?? 0;
  const eventsJoined = 3;
  const friendsCount = formatNumber(mockUser.followersCount);

  const handleEditProfile = () => {
    console.log('Edit profile');
  };

  const handleSettings = () => {
    console.log('Settings');
  };

  const handleOpenMoment = (moment: Moment) => {
    navigation.navigate('MomentDetail', { momentId: moment.id });
  };

  const renderReviewCard = (review: Review) => {
    return (
      // Touchable wrapper gives soft press feedback without changing behavior
      <TouchableOpacity
        key={review.id}
        activeOpacity={0.96}
        className="mx-4 mb-4"
      >
        <View className="rounded-2xl bg-white border border-gray-100 px-4 py-4">
          <Text className="text-sm font-semibold text-gray-900 mb-1">
            {review.placeName}
          </Text>

          {/* Compact, calm metadata row for rating, date, and category */}
          <View className="flex-row items-center mt-1 mb-3">
            <View className="flex-row items-center">
              <Icon name="star" size={12} color={iconColors.active} />
              <Text className="ml-1 text-xs text-gray-700">
                {review.rating.toFixed(1)}
              </Text>
            </View>
            <View className="mx-2 w-1 h-1 rounded-full bg-gray-300" />
            <Text className="text-xs text-gray-500">{review.date}</Text>
            {review.category ? (
              <>
                <View className="mx-2 w-1 h-1 rounded-full bg-gray-300" />
                <Text className="text-xs text-gray-500">{review.category}</Text>
              </>
            ) : null}
          </View>

          <Text
            className="text-sm text-gray-700 mb-3"
            numberOfLines={3}
          >
            {review.text}
          </Text>

          {review.photos && review.photos.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 2 }}
            >
              {review.photos.map((uri) => (
                <View key={uri} className="mr-2">
                  <Image
                    source={{ uri }}
                    className="w-16 h-16 rounded-lg bg-gray-200"
                    contentFit="cover"
                  />
                </View>
              ))}
            </ScrollView>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderMomentCard = (moment: Moment) => {
    return (
      <TouchableOpacity
        key={moment.id}
        activeOpacity={0.9}
        className="w-1/3 p-1"
        onPress={() => handleOpenMoment(moment)}
      >
        <View className="rounded-xl bg-gray-200 overflow-hidden">
          <Image
            source={{ uri: moment.mediaUri }}
            style={{ width: '100%', aspectRatio: 1 }}
            contentFit="cover"
          />
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      {/* App Header */}
      <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100 bg-white">
        <View className="w-6" />
        <Text className="text-base font-semibold text-gray-900">
          {isOwnProfile ? 'You' : 'Profile'}
        </Text>
        <TouchableOpacity onPress={handleSettings}>
          <Icon name="settings" size={20} color={iconColors.active} />
        </TouchableOpacity>
      </View>

      <ScrollView
        className="flex-1 bg-gray-50"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 24 }}
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
                  Plans Saved
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
                className="w-full py-2.5 rounded-full bg-gray-900 items-center"
                activeOpacity={0.9}
              >
                <Text className="text-sm font-semibold text-white">
                  Edit profile
                </Text>
              </TouchableOpacity>
            ) : (
              <View className="flex-row gap-2">
                <TouchableOpacity
                  className="flex-1 py-2.5 rounded-full bg-gray-900 items-center"
                  activeOpacity={0.9}
                >
                  <Text className="text-sm font-semibold text-white">
                    Follow
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  className="flex-1 py-2.5 rounded-full bg-gray-100 items-center"
                  activeOpacity={0.9}
                >
                  <Text className="text-sm font-semibold text-gray-900">
                    Message
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Divider */}
          <View className="px-4 mt-2 mb-4">
            <View className="h-px bg-gray-200" />
          </View>
        </View>

        {/* Content type toggle and public activity */}
        <View className="px-4 mb-2">
          <View className="flex-row">
            <TouchableOpacity
              activeOpacity={0.9}
              className={`flex-1 items-center pb-2 border-b-2 ${
                activeFeed === 'reviews'
                  ? 'border-gray-900'
                  : 'border-transparent'
              }`}
              onPress={() => setActiveFeed('reviews')}
            >
              <Text
                className={`text-sm ${
                  activeFeed === 'reviews'
                    ? 'font-semibold text-gray-900'
                    : 'text-gray-500'
                }`}
              >
                Reviews
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              activeOpacity={0.9}
              className={`flex-1 items-center pb-2 border-b-2 ${
                activeFeed === 'moments'
                  ? 'border-gray-900'
                  : 'border-transparent'
              }`}
              onPress={() => setActiveFeed('moments')}
            >
              <Text
                className={`text-sm ${
                  activeFeed === 'moments'
                    ? 'font-semibold text-gray-900'
                    : 'text-gray-500'
                }`}
              >
                Moments
              </Text>
            </TouchableOpacity>
          </View>
          <Text className="mt-2 text-xs text-gray-500">
            {activeFeed === 'reviews'
              ? 'Your recent spots and how they felt.'
              : 'Little snapshots that show what your nights out actually feel like.'}
          </Text>
        </View>

        {/* Public activity feeds */}
        <View className="bg-gray-50 pt-2">
          {activeFeed === 'reviews' ? (
            mockReviews.length === 0 ? (
              <View className="items-center justify-center mt-16 px-8">
                <Text className="text-sm text-gray-500 text-center mb-2">
                  You haven’t reviewed any spots yet.
                </Text>
                <TouchableOpacity
                  className="mt-2 px-4 py-2 rounded-full bg-gray-900"
                  activeOpacity={0.9}
                >
                  <Text className="text-xs font-semibold text-white">
                    Explore places nearby
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              mockReviews.map(renderReviewCard)
            )
          ) : mockMoments.length === 0 ? (
            <View className="items-center justify-center mt-16 px-8">
              <Text className="text-sm text-gray-500 text-center">
                No moments yet. When you’re out, save a few small scenes that
                feel like you.
              </Text>
            </View>
          ) : (
            <View className="flex-row flex-wrap px-2">
              {mockMoments.map(renderMomentCard)}
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};
