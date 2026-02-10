import React, { useState, useRef } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Pressable, Dimensions, Animated, RefreshControl } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Haptics from 'expo-haptics';
import { Image } from 'expo-image';
import { PanGestureHandler, State } from 'react-native-gesture-handler';

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
  const [refreshing, setRefreshing] = useState(false);
  const translateX = useRef(new Animated.Value(0)).current;
  const dragOffset = useRef(new Animated.Value(0)).current;
  const currentIndex = useRef(0); // 0 = explore, 1 = friends

  const onRefresh = () => {
    setRefreshing(true);
    // TODO: Implement refresh functionality
    setTimeout(() => setRefreshing(false), 1000);
  };
  
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
        // Dragged left - go to friends (if not already there)
        targetIndex = Math.min(1, currentIndex.current + 1);
      } else if (translationX > threshold || velocityX > 500) {
        // Dragged right - go to explore (if not already there)
        targetIndex = Math.max(0, currentIndex.current - 1);
      }
      
      // Snap to the target page
      currentIndex.current = targetIndex;
      const targetFeed = targetIndex === 0 ? 'explore' : 'friends';
      setActiveFeed(targetFeed);
      
      // Animate to final position with haptic feedback
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
      ]).start(({ finished }) => {
        if (finished) {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
        }
      });
    } else if (nativeEvent.state === State.BEGAN) {
      // Reset drag offset when starting new gesture
      dragOffset.setValue(0);
    }
  };

  const switchToFeed = (feed: 'explore' | 'friends') => {
    const targetIndex = feed === 'explore' ? 0 : 1;
    currentIndex.current = targetIndex;
    setActiveFeed(feed);
    
    // Haptic feedback on tab switch
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    
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

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Feed toggle (Explore / Friends) - Modernized underline style */}
      <View style={{ backgroundColor: '#FFFFFF', paddingTop: 12, paddingBottom: 8 }}>
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
            onPress={() => switchToFeed('explore')}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: activeFeed === 'explore' ? '600' : '500',
                color: activeFeed === 'explore' ? '#00447C' : '#9CA3AF',
                letterSpacing: 0.2,
              }}
            >
              Explore
            </Text>
          </Pressable>
          
          <Pressable
            style={{
              flex: 1,
              alignItems: 'center',
              paddingBottom: 10,
            }}
            onPress={() => switchToFeed('friends')}
          >
            <Text
              style={{
                fontSize: 15,
                fontWeight: activeFeed === 'friends' ? '600' : '500',
                color: activeFeed === 'friends' ? '#00447C' : '#9CA3AF',
                letterSpacing: 0.2,
              }}
            >
              Friends
            </Text>
          </Pressable>
          
          {/* Animated underline indicator - perfectly centered under text */}
          <Animated.View
            style={{
              position: 'absolute',
              bottom: 0,
              height: 3,
              width: 60,
              backgroundColor: '#00447C',
              borderRadius: 1.5,
              left: 16 + (SCREEN_WIDTH - 32) / 4 - 30, // Center under Explore button
              transform: [{
                translateX: slidePosition.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0, (SCREEN_WIDTH - 32) / 2], // Move to center of Friends button
                }),
              }],
              shadowColor: '#00447C',
              shadowOffset: { width: 0, height: 1 },
              shadowOpacity: 0.3,
              shadowRadius: 2,
              elevation: 2,
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

      {/* Swipeable Content */}
      <PanGestureHandler
        onGestureEvent={handleGestureEvent}
        onHandlerStateChange={handleSwipe}
        activeOffsetX={[-30, 30]}
        failOffsetY={[-20, 20]}
        minPointers={1}
        maxPointers={1}
      >
        <Animated.View style={{ flex: 1 }}>
          <Animated.View
            style={{
              flexDirection: 'row',
              width: SCREEN_WIDTH * 2,
              height: '100%',
              transform: [{ translateX: combinedTranslateX }],
            }}
          >
            {/* Explore Grid */}
            <View style={{ width: SCREEN_WIDTH, height: '100%' }}>
              <ScrollView 
                className="flex-1" 
                showsVerticalScrollIndicator={false}
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
                  <Image 
                    source={{ uri: img }} 
                    style={{ flex: 1 }} 
                    contentFit="cover"
                    priority="high"
                    transition={200}
                  />
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
                    <Image 
                    source={{ uri: img }} 
                    style={{ flex: 1 }} 
                    contentFit="cover"
                    priority="high"
                    transition={200}
                  />
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
                    <Image 
                    source={{ uri: img }} 
                    style={{ flex: 1 }} 
                    contentFit="cover"
                    priority="high"
                    transition={200}
                  />
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
            </View>

            {/* Friends page */}
            <View style={{ width: SCREEN_WIDTH, height: '100%' }}>
              <ScrollView 
                className="flex-1 bg-gray-50" 
                showsVerticalScrollIndicator={false}
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
                <View className="p-4">
                  <Text className="text-sm text-gray-500 text-center">
                    Friends feed coming soon
                  </Text>
                </View>
              </ScrollView>
            </View>
          </Animated.View>
        </Animated.View>
      </PanGestureHandler>
    </SafeAreaView>
  );
};
