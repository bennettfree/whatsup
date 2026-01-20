import React from 'react';
import {
  View,
  ScrollView,
  Text,
  TouchableOpacity,
  Dimensions,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { mockUser } from '@/utils/mockData';
import type { RootStackScreenProps } from '@/navigation/types';
import { Icon, iconColors } from '@/components/Icon';

type Props = RootStackScreenProps<'MomentDetail'>;

type MomentDetail = {
  id: string;
  mediaUri: string;
  mediaType: 'photo' | 'video';
  mediaUris?: string[];
  caption?: string;
  timestamp: string;
  placeName?: string;
  eventName?: string;
};

const mockMomentDetails: MomentDetail[] = [
  {
    id: 'm1',
    mediaUri:
      'https://cdn.pixabay.com/photo/2016/12/22/07/15/chess-1924642_1280.jpg',
    mediaType: 'photo',
    caption: 'Final move at a late-night chess tournament.',
    timestamp: 'Last weekend',
    eventName: 'Local Chess Open',
  },
  {
    id: 'm2',
    mediaUri:
      'https://cdn.pixabay.com/photo/2024/04/13/21/58/spaghetti-and-meatballs-8694542_1280.jpg',
    mediaUris: [
      'https://cdn.pixabay.com/photo/2024/04/13/21/58/spaghetti-and-meatballs-8694542_1280.jpg',
      'https://cdn.pixabay.com/photo/2019/02/21/19/00/restaurant-4011989_1280.jpg',
    ],
    mediaType: 'photo',
    caption: 'Slow pasta night with friends.',
    timestamp: '2 weeks ago',
    placeName: 'Neighborhood Trattoria',
  },
  {
    id: 'm3',
    mediaUri:
      'https://cdn.pixabay.com/photo/2017/06/01/08/24/woman-2362804_1280.jpg',
    mediaUris: [
      'https://cdn.pixabay.com/photo/2017/06/01/08/24/woman-2362804_1280.jpg',
      'https://cdn.pixabay.com/photo/2020/11/12/17/14/concert-5736160_1280.jpg',
    ],
    mediaType: 'photo',
    caption: 'Rooftop sunset before the music hit.',
    timestamp: 'This month',
    eventName: 'Saturday Rooftop Session',
  },
  {
    id: 'm4',
    mediaUri:
      'https://cdn.pixabay.com/photo/2017/08/01/11/38/paddle-2564598_1280.jpg',
    mediaUris: [
      'https://cdn.pixabay.com/photo/2017/08/01/11/38/paddle-2564598_1280.jpg',
      'https://cdn.pixabay.com/photo/2018/08/14/15/22/surf-3605835_1280.jpg',
    ],
    mediaType: 'photo',
    caption: 'Paddling out before the first set rolls in.',
    timestamp: 'This morning',
    eventName: 'Sunrise Paddle Session',
  },
  {
    id: 'm5',
    mediaUri:
      'https://cdn.pixabay.com/photo/2019/04/06/03/34/girl-4106595_1280.jpg',
    mediaType: 'photo',
    caption: 'Calm coffee, favorite book, no rush.',
    timestamp: 'Earlier today',
    placeName: 'Corner Coffee Shop',
  },
];

const MomentDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { momentId } = route.params;

  const moment =
    mockMomentDetails.find((m) => m.id === momentId) ?? mockMomentDetails[0];

  const screenWidth = Dimensions.get('window').width;
  const scrollX = React.useRef(new Animated.Value(0)).current;
  const indicatorOpacity = React.useRef(new Animated.Value(1)).current;
  const hideIndicatorsTimeout = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  const mediaSources =
    moment.mediaUris && moment.mediaUris.length > 0
      ? moment.mediaUris
      : [moment.mediaUri];

  const showIndicatorsNow = () => {
    Animated.timing(indicatorOpacity, {
      toValue: 1,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  const scheduleHideIndicators = () => {
    if (hideIndicatorsTimeout.current) {
      clearTimeout(hideIndicatorsTimeout.current);
    }
    hideIndicatorsTimeout.current = setTimeout(() => {
      Animated.timing(indicatorOpacity, {
        toValue: 0,
        duration: 120,
        useNativeDriver: true,
      }).start();
    }, 1000);
  };

  React.useEffect(() => {
    showIndicatorsNow();
    scheduleHideIndicators();
    return () => {
      if (hideIndicatorsTimeout.current) {
        clearTimeout(hideIndicatorsTimeout.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleViewPlace = () => {
    if (!moment.placeName) return;
    navigation.navigate('PlaceDetail', { placeId: 'mock-place' });
  };

  const handleViewEvent = () => {
    if (!moment.eventName) return;
    navigation.navigate('EventDetail', { eventId: 'mock-event' });
  };

  const handleSave = () => {
    // Placeholder for future save behavior
    console.log('Save moment', moment.id);
  };

  const handleAddToPlans = () => {
    // Placeholder for future add-to-plans behavior
    console.log('Add moment to plans', moment.id);
  };

  return (
    <SafeAreaView className="flex-1 bg-gray-50" edges={['top']}>
      <ScrollView
        className="flex-1"
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 32 }}
      >
        {/* Thin identity + back bar */}
        <View className="bg-white px-4 pt-3 pb-2 border-b border-gray-100 flex-row items-center">
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
            className="mr-3"
          >
            <Icon name="chevron-left" size={20} color={iconColors.default} />
          </TouchableOpacity>
          <ProfileAvatar
            uri={mockUser.avatarUrl}
            size={28}
            editable={false}
          />
          <Text className="ml-2 text-sm font-semibold text-gray-900">
            @{mockUser.username}
          </Text>
        </View>

        {/* Media first (only carousel when multiple images) */}
        <View className="bg-black relative">
          {mediaSources.length > 1 ? (
            <>
              <Animated.ScrollView
                horizontal
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                onScrollBeginDrag={() => {
                  showIndicatorsNow();
                  if (hideIndicatorsTimeout.current) {
                    clearTimeout(hideIndicatorsTimeout.current);
                  }
                }}
                onMomentumScrollEnd={() => {
                  scheduleHideIndicators();
                }}
                onScroll={(event) => {
                  const offsetX = event.nativeEvent.contentOffset.x;
                  scrollX.setValue(offsetX);
                }}
                scrollEventThrottle={16}
              >
                {mediaSources.map((uri) => (
                  <View key={uri} style={{ width: screenWidth }}>
                    <Image
                      source={{ uri }}
                      style={{ width: '100%', aspectRatio: 3 / 4 }}
                      contentFit="cover"
                    />
                  </View>
                ))}
              </Animated.ScrollView>

              {/* Temporary carousel indicators */}
              <Animated.View
                className="absolute bottom-3 left-0 right-0 flex-row justify-center"
                style={{ opacity: indicatorOpacity }}
              >
                {mediaSources.map((_, index) => {
                  const inputRange = [
                    (index - 1) * screenWidth,
                    index * screenWidth,
                    (index + 1) * screenWidth,
                  ];
                  const dotWidth = scrollX.interpolate({
                    inputRange,
                    outputRange: [6, 16, 6],
                    extrapolate: 'clamp',
                  });
                  const dotOpacity = scrollX.interpolate({
                    inputRange,
                    outputRange: [0.4, 1, 0.4],
                    extrapolate: 'clamp',
                  });

                  return (
                    <Animated.View
                      key={index}
                      className="mx-1 h-1.5 rounded-full bg-white"
                      style={{ width: dotWidth, opacity: dotOpacity }}
                    />
                  );
                })}
              </Animated.View>
            </>
          ) : (
            <Image
              source={{ uri: mediaSources[0] }}
              style={{ width: '100%', aspectRatio: 3 / 4 }}
              contentFit="cover"
            />
          )}
        </View>

        {/* Detail card */}
        <View className="px-4 mt-3">
          <View className="rounded-2xl bg-white border border-gray-100 px-4 py-4">
            {/* Caption */}
            {moment.caption ? (
              <Text className="text-sm text-gray-700 mb-3">
                {moment.caption}
              </Text>
            ) : null}

            {/* Event / place banner with right-aligned action icons */}
            {(moment.eventName || moment.placeName) && (
              <View className="mb-1 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2">
                <View className="flex-row items-center justify-between">
                  <View>
                    {moment.eventName ? (
                      <Text className="text-sm font-semibold text-gray-900">
                        {moment.eventName}
                      </Text>
                    ) : null}
                    <Text className="text-xs text-gray-500 mt-0.5">
                      {moment.timestamp}
                    </Text>
                  </View>
                  <View className="flex-row items-center">
                    {(moment.eventName || moment.placeName) && (
                      <TouchableOpacity
                        activeOpacity={0.8}
                        onPress={
                          moment.eventName ? handleViewEvent : handleViewPlace
                        }
                        className="ml-2"
                      >
                        <View className="p-1.5 rounded-full bg-gray-100 border border-gray-200">
                          <Icon
                            name="eye"
                            size={14}
                            color={iconColors.active}
                          />
                        </View>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleSave}
                      className="ml-2"
                    >
                      <View className="p-1.5 rounded-full bg-gray-100 border border-gray-200">
                        <Icon
                          name="save"
                          size={14}
                          color={iconColors.active}
                        />
                      </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                      activeOpacity={0.8}
                      onPress={handleAddToPlans}
                      className="ml-2"
                    >
                      <View className="p-1.5 rounded-full bg-gray-100 border border-gray-200">
                        <Icon
                          name="plus"
                          size={14}
                          color={iconColors.active}
                        />
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default MomentDetailScreen;

