import React, { useRef } from 'react';
import { View, ScrollView, Text, TouchableOpacity, Pressable, Animated, Dimensions } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, iconColors } from '@/components/Icon';
import { ProfileHeader } from '../components/ProfileHeader';
import { mockUser, mockPlaces, formatNumber } from '@/utils/mockData';
import { Image } from 'expo-image';
import type { MainTabScreenProps } from '@/navigation/types';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

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
  mediaUris?: string[]; // For carousel posts with multiple images
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
  const [activeFeed, setActiveFeed] = React.useState<'reviews' | 'moments'>('reviews');
  const translateX = useRef(new Animated.Value(0)).current;
  const dragOffset = useRef(new Animated.Value(0)).current;
  const currentIndex = useRef(0); // 0 = reviews, 1 = moments
  
  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationX: dragOffset } }],
    { useNativeDriver: true }
  );

  const handleSwipe = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.END) {
      const { translationX, velocityX } = nativeEvent;
      
      // Calculate which page to snap to based on drag distance and velocity
      let targetIndex = currentIndex.current;
      
      // Threshold: 30% of screen width or fast velocity
      const threshold = SCREEN_WIDTH * 0.3;
      
      if (translationX < -threshold || velocityX < -500) {
        // Dragged left - go to moments (if not already there)
        targetIndex = Math.min(1, currentIndex.current + 1);
      } else if (translationX > threshold || velocityX > 500) {
        // Dragged right - go to reviews (if not already there)
        targetIndex = Math.max(0, currentIndex.current - 1);
      }
      
      // Snap to the target page
      currentIndex.current = targetIndex;
      const targetFeed = targetIndex === 0 ? 'reviews' : 'moments';
      setActiveFeed(targetFeed);
      
      // Animate to final position
      Animated.parallel([
        Animated.spring(translateX, {
          toValue: -targetIndex * SCREEN_WIDTH,
          useNativeDriver: true,
          tension: 65,
          friction: 10,
          velocity: velocityX / SCREEN_WIDTH,
        }),
        Animated.spring(dragOffset, {
          toValue: 0,
          useNativeDriver: true,
          tension: 65,
          friction: 10,
        }),
      ]).start();
    } else if (nativeEvent.state === State.BEGAN) {
      // Reset drag offset when starting new gesture
      dragOffset.setValue(0);
    }
  };

  const switchToFeed = (feed: 'reviews' | 'moments') => {
    const targetIndex = feed === 'reviews' ? 0 : 1;
    currentIndex.current = targetIndex;
    setActiveFeed(feed);
    
    Animated.parallel([
      Animated.spring(translateX, {
        toValue: -targetIndex * SCREEN_WIDTH,
        useNativeDriver: true,
        tension: 65,
        friction: 10,
      }),
      Animated.timing(dragOffset, {
        toValue: 0,
        duration: 0,
        useNativeDriver: true,
      }),
    ]).start();
  };

  // Combine base position and drag offset for smooth tracking
  const combinedTranslateX = Animated.add(translateX, dragOffset);
  
  // Calculate slider position for the underline indicator (0 to 1)
  const slidePosition = combinedTranslateX.interpolate({
    inputRange: [-SCREEN_WIDTH, 0],
    outputRange: [1, 0],
    extrapolate: 'clamp',
  });

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
    const isCarousel = moment.mediaUris && moment.mediaUris.length > 1;
    
    return (
      <TouchableOpacity
        key={moment.id}
        activeOpacity={0.9}
        className="w-1/3 p-1"
        onPress={() => handleOpenMoment(moment)}
      >
        <View className="rounded-xl bg-gray-200 overflow-hidden relative">
          <Image
            source={{ uri: moment.mediaUri }}
            style={{ width: '100%', aspectRatio: 1 }}
            contentFit="cover"
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

        {/* Content type toggle with animated underline */}
        <View style={{ backgroundColor: '#F9FAFB', paddingTop: 8, paddingBottom: 8 }}>
          <View style={{ 
            flexDirection: 'row', 
            position: 'relative',
            paddingHorizontal: 16,
          }}>
            <Pressable
              style={{
                flex: 1,
                alignItems: 'center',
                paddingBottom: 10,
              }}
              onPress={() => switchToFeed('reviews')}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: activeFeed === 'reviews' ? '600' : '500',
                  color: activeFeed === 'reviews' ? '#111827' : '#9CA3AF',
                  letterSpacing: 0.2,
                }}
              >
                Reviews
              </Text>
            </Pressable>
            
            <Pressable
              style={{
                flex: 1,
                alignItems: 'center',
                paddingBottom: 10,
              }}
              onPress={() => switchToFeed('moments')}
            >
              <Text
                style={{
                  fontSize: 15,
                  fontWeight: activeFeed === 'moments' ? '600' : '500',
                  color: activeFeed === 'moments' ? '#111827' : '#9CA3AF',
                  letterSpacing: 0.2,
                }}
              >
                Moments
              </Text>
            </Pressable>
            
            {/* Animated underline indicator - perfectly centered under text */}
            <Animated.View
              style={{
                position: 'absolute',
                bottom: 0,
                height: 3,
                width: 60,
                backgroundColor: '#111827',
                borderRadius: 1.5,
                left: 16 + (SCREEN_WIDTH - 32) / 4 - 30, // Center under Reviews button
                transform: [{
                  translateX: slidePosition.interpolate({
                    inputRange: [0, 1],
                    outputRange: [0, (SCREEN_WIDTH - 32) / 2], // Move to center of Moments button
                  }),
                }],
              }}
            />
            
            {/* Full width bottom border */}
            <View style={{ 
              position: 'absolute',
              bottom: 0,
              left: 0,
              right: 0,
              height: 1,
              backgroundColor: '#E5E7EB',
            }} />
          </View>
        </View>

        {/* Swipeable Public activity feeds */}
        <PanGestureHandler
          onGestureEvent={handleGestureEvent}
          onHandlerStateChange={handleSwipe}
          activeOffsetX={[-30, 30]}
          failOffsetY={[-20, 20]}
          minPointers={1}
          maxPointers={1}
        >
          <Animated.View style={{ flex: 1, backgroundColor: '#F9FAFB' }}>
            <Animated.View
              style={{
                flexDirection: 'row',
                width: SCREEN_WIDTH * 2,
                paddingTop: 8,
                transform: [{ translateX: combinedTranslateX }],
              }}
            >
              {/* Reviews Feed */}
              <View style={{ width: SCREEN_WIDTH }}>
                {mockReviews.length === 0 ? (
                  <View className="items-center justify-center mt-16 px-8">
                    <Text className="text-sm text-gray-500 text-center mb-2">
                      You haven't reviewed any spots yet.
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
                  <View>
                    {mockReviews.map(renderReviewCard)}
                  </View>
                )}
              </View>

              {/* Moments Feed */}
              <View style={{ width: SCREEN_WIDTH }}>
                {mockMoments.length === 0 ? (
                  <View className="items-center justify-center mt-16 px-8">
                    <Text className="text-sm text-gray-500 text-center">
                      No moments yet. When you're out, save a few small scenes that
                      feel like you.
                    </Text>
                  </View>
                ) : (
                  <View className="flex-row flex-wrap px-2">
                    {mockMoments.map(renderMomentCard)}
                  </View>
                )}
              </View>
            </Animated.View>
          </Animated.View>
        </PanGestureHandler>
      </ScrollView>
    </SafeAreaView>
  );
};
