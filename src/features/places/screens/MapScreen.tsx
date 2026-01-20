import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Dimensions, ActivityIndicator, Alert, Linking, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Icon, iconColors } from '@/components/Icon';
import { mockPlaces, mockEvents, formatHours } from '@/utils/mockData';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { classifyQuery, mapVenueTypeToCategory, mapEventTypeToCategory, type ParsedQuery } from '@/utils/searchHelpers';
import { searchService, type SearchResult as UnifiedSearchResult } from '@/services/searchService';
import { useSavedStore } from '@/stores/useSavedStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type SearchResultItem = UnifiedSearchResult;

// Expanded category colors - all unique
const categoryColors: Record<string, string> = {
  bar: '#DC2626',
  club: '#DC2626',
  restaurant: '#F97316',
  cafe: '#A855F7',
  coffee: '#A855F7',
  event: '#EC4899',
  music: '#EC4899',
  museum: '#3B82F6',
  gallery: '#3B82F6',
  park: '#22C55E',
  hotel: '#8B5CF6',
  shopping: '#F59E0B',
  spa: '#14B8A6',
  gym: '#F43F5E',
  default: '#6B7280',
};

const getCategoryColor = (category: string): string => {
  return categoryColors[category] || categoryColors.default;
};

// Category Icon Component - shared between map markers, event chips, and legend buttons
const CategoryIcon = ({
  category,
  size = 16,
  color = '#FFFFFF',
}: {
  category: string;
  size?: number;
  color?: string;
}) => {
  switch (category) {
    case 'bar':
    case 'club':
      return <MaterialCommunityIcons name="glass-cocktail" size={size} color={color} />;
    case 'restaurant':
      return <MaterialCommunityIcons name="silverware-fork-knife" size={size} color={color} />;
    case 'cafe':
    case 'coffee':
      return <Feather name="coffee" size={size} color={color} />;
    case 'event':
    case 'music':
      return <Feather name="music" size={size} color={color} />;
    case 'museum':
    case 'gallery':
      return <MaterialCommunityIcons name="palette" size={size} color={color} />;
    case 'park':
      return <Feather name="sun" size={size} color={color} />;
    case 'hotel':
      return <MaterialCommunityIcons name="bed" size={size} color={color} />;
    case 'shopping':
      return <Feather name="shopping-bag" size={size} color={color} />;
    case 'spa':
      return <MaterialCommunityIcons name="spa" size={size} color={color} />;
    case 'gym':
      return <MaterialCommunityIcons name="dumbbell" size={size} color={color} />;
    default:
      return <Feather name="map-pin" size={size} color={color} />;
  }
};

// Geocoding function
const geocodeAddress = async (address: string): Promise<Region | null> => {
  try {
    const results = await Location.geocodeAsync(address);
    if (results.length > 0) {
      const { latitude, longitude } = results[0];
      return {
        latitude,
        longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
    }
    return null;
  } catch (error) {
    console.error('Geocoding error:', error);
    return null;
  }
};

// Get current time of day for AI context
const getTimeOfDay = (): 'morning' | 'afternoon' | 'evening' | 'night' => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
};

// Custom Marker Component for Places - Modern design with fade animation
const CustomMarker = ({
  place,
  onPress,
  isActive,
}: {
  place: SearchResultItem;
  onPress?: () => void;
  isActive?: boolean;
}) => {
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation on mount (Google Maps style)
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Marker
      coordinate={{
        latitude: place.location.latitude,
        longitude: place.location.longitude,
      }}
      onPress={onPress}
      opacity={1} // Marker itself stays opaque for hitbox
    >
      <Animated.View style={{ opacity }} className="items-center">
        <View
          className="rounded-full items-center justify-center"
          style={{
            backgroundColor: getCategoryColor(place.category || 'default'),
            width: isActive ? 40 : 36,
            height: isActive ? 40 : 36,
            borderWidth: isActive ? 3 : 2,
            borderColor: '#FFFFFF',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <CategoryIcon category={place.category || 'default'} size={isActive ? 20 : 18} color="#FFFFFF" />
        </View>
        <View
          className="w-0 h-0 -mt-0.5"
          style={{
            borderLeftWidth: 6,
            borderRightWidth: 6,
            borderTopWidth: 8,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: getCategoryColor(place.category || 'default'),
          }}
        />
      </Animated.View>
    </Marker>
  );
};

// Event Marker Component - Modern design with fade animation
const EventMarker = ({
  event,
  onPress,
  isActive,
}: {
  event: SearchResultItem;
  onPress?: () => void;
  isActive?: boolean;
}) => {
  const eventColor = getCategoryColor('event');
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade in animation on mount (Google Maps style)
    Animated.timing(opacity, {
      toValue: 1,
      duration: 300,
      useNativeDriver: true,
    }).start();
  }, []);

  return (
    <Marker
      coordinate={{
        latitude: event.location.latitude,
        longitude: event.location.longitude,
      }}
      onPress={onPress}
      opacity={1} // Marker itself stays opaque for hitbox
    >
      <Animated.View style={{ opacity }} className="items-center">
                    <View
          className="rounded-xl items-center justify-center"
          style={{
            backgroundColor: eventColor,
            width: isActive ? 40 : 36,
            height: isActive ? 40 : 36,
            borderWidth: 3,
            borderColor: '#FFFFFF',
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 4,
            elevation: 5,
          }}
        >
          <Feather name="calendar" size={isActive ? 22 : 20} color="#FFFFFF" />
                    </View>
        <View
          className="w-0 h-0 -mt-0.5"
          style={{
            borderLeftWidth: 6,
            borderRightWidth: 6,
            borderTopWidth: 8,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: eventColor,
          }}
        />
      </Animated.View>
    </Marker>
  );
};

// Date Filter Types
type DateFilter = 'today' | 'tomorrow' | 'weekend' | 'custom';

// What's Happening Bottom Sheet Component - Draggable
const WhatsHappeningSheet = ({
  region,
  visible,
  searchResults,
  activeResultId,
  selectedItem,
  userLocation,
  onBackFromSearch,
  onBackFromDetail,
  onResultPress,
  onSelectItem,
  onSheetPositionChange,
  shouldExpand,
  targetPosition,
  animationKey,
}: {
  region: Region;
  visible: boolean;
  searchResults?: SearchResultItem[];
  activeResultId?: string | null;
  selectedItem?: { type: 'place' | 'event'; data: any } | null;
  userLocation?: Location.LocationObject | null;
  onBackFromSearch?: () => void;
  onBackFromDetail?: () => void;
  onResultPress?: (item: SearchResultItem) => void;
  onSelectItem?: (type: 'place' | 'event', id: string, data: any) => void;
  onSheetPositionChange?: (translateY: Animated.Value) => void;
  shouldExpand?: boolean; // Expand when search results appear
  targetPosition?: 'hidden' | 'collapsed' | 'partial' | 'three-quarter' | 'expanded'; // External control
  animationKey?: number; // Force animation trigger
}) => {
  const [selectedDate, setSelectedDate] = useState<DateFilter>('today');
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  
  // Snap points for the bottom sheet
  const SNAP_HIDDEN = SCREEN_HEIGHT; // Completely off-screen
  const SNAP_COLLAPSED = SCREEN_HEIGHT - 80; // Just handle showing
  const SNAP_PARTIAL = SCREEN_HEIGHT - 220; // Default view
  const SNAP_THREE_QUARTER = SCREEN_HEIGHT * 0.25; // 75% expanded
  const SNAP_EXPANDED = 120; // Fully expanded - aligns with top of map UI
  
  const translateY = useRef(new Animated.Value(SNAP_COLLAPSED)).current;
  const dragOffset = useRef(new Animated.Value(0)).current;
  const slideX = useRef(new Animated.Value(0)).current;

  const selectedId: string = selectedItem?.data?.id ?? '';
  const isSaved = useSavedStore((s) => (selectedId ? s.isSaved(selectedId) : false));
  const toggleSave = useSavedStore((s) => s.toggleSave);
  const thumbsUp = useSavedStore((s) => s.thumbsUp);
  const thumbsDown = useSavedStore((s) => s.thumbsDown);
  const thumbsUpCount = useSavedStore((s) => (selectedId ? (s.thumbsUpCountById[selectedId] ?? 0) : 0));
  const myVote = useSavedStore((s) => (selectedId ? (s.myVoteById[selectedId] ?? 'none') : 'none'));
  const isInnerScrollActiveRef = useRef(false);

  // Notify parent of sheet position changes
  useEffect(() => {
    if (onSheetPositionChange) {
      onSheetPositionChange(translateY);
    }
  }, [translateY, onSheetPositionChange]);

  // Expand sheet when search results appear
  useEffect(() => {
    if (shouldExpand && (searchResults?.length ?? 0) > 0) {
      Animated.spring(translateY, {
        toValue: SNAP_THREE_QUARTER,
        useNativeDriver: true,
        tension: 40,
        friction: 12,
      }).start();
    }
  }, [shouldExpand, searchResults?.length, translateY, SNAP_THREE_QUARTER]);

  // Handle external position control
  useEffect(() => {
    if (targetPosition) {
      const positionMap = {
        hidden: SNAP_HIDDEN,
        collapsed: SNAP_COLLAPSED,
        partial: SNAP_PARTIAL,
        'three-quarter': SNAP_THREE_QUARTER,
        expanded: SNAP_EXPANDED,
      };
      Animated.spring(translateY, {
        toValue: positionMap[targetPosition],
        useNativeDriver: true,
        tension: 50,
        friction: 10,
      }).start();
    }
  }, [targetPosition, animationKey, translateY, SNAP_HIDDEN, SNAP_COLLAPSED, SNAP_PARTIAL, SNAP_THREE_QUARTER, SNAP_EXPANDED]);
  
  const handleGestureEvent = ({ nativeEvent }: any) => {
    // When the user is scrolling the inner detail content, don't let the sheet
    // pan handler "steal" the gesture and snap the sheet on release.
    if (isInnerScrollActiveRef.current) return;
    dragOffset.setValue(nativeEvent.translationY);
  };

  const handleGesture = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.END) {
      if (isInnerScrollActiveRef.current) {
        dragOffset.setValue(0);
        return;
      }
      const { translationY, velocityY } = nativeEvent;
      const currentY = (translateY as any).__getValue();
      const finalY = currentY + translationY;
      
      let targetSnap = SNAP_PARTIAL;
      
      // Determine target snap point based on position and velocity
      // Higher thresholds = less sensitive (Google Maps style)
      if (velocityY > 1200) {
        // Very fast downward swipe - hide completely
        targetSnap = SNAP_HIDDEN;
      } else if (velocityY > 800) {
        // Fast downward swipe - collapse to handle
        targetSnap = SNAP_COLLAPSED;
      } else if (velocityY < -1200) {
        // Very fast upward swipe - fully expand
        targetSnap = SNAP_EXPANDED;
      } else if (velocityY < -800) {
        // Fast upward swipe - 75% expand
        targetSnap = SNAP_THREE_QUARTER;
      } else {
        // Snap to nearest position
        const distances = [
          Math.abs(finalY - SNAP_EXPANDED),
          Math.abs(finalY - SNAP_THREE_QUARTER),
          Math.abs(finalY - SNAP_PARTIAL),
          Math.abs(finalY - SNAP_COLLAPSED),
          Math.abs(finalY - SNAP_HIDDEN),
        ];
        const minIndex = distances.indexOf(Math.min(...distances));
        targetSnap = [SNAP_EXPANDED, SNAP_THREE_QUARTER, SNAP_PARTIAL, SNAP_COLLAPSED, SNAP_HIDDEN][minIndex];
      }
      
      // Animate to target position with more friction (Google Maps feel)
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: targetSnap,
          useNativeDriver: true,
          tension: 40,
          friction: 12,
          velocity: velocityY / 1000,
        }),
        Animated.spring(dragOffset, {
          toValue: 0,
          useNativeDriver: true,
          tension: 40,
          friction: 12,
        }),
      ]).start(() => {
        // When collapsed/hidden, clear detail view (same as back button)
        if ((targetSnap === SNAP_COLLAPSED || targetSnap === SNAP_HIDDEN) && selectedItem) {
          onBackFromSearch?.();
        }
      });
    } else if (nativeEvent.state === State.BEGAN) {
      dragOffset.setValue(0);
    }
  };

  // Expose method to show sheet from parent
  useEffect(() => {
    // Store reference for external control if needed
    (translateY as any).showSheet = () => {
      Animated.spring(translateY, {
        toValue: SNAP_COLLAPSED,
        useNativeDriver: true,
        tension: 50,
        friction: 10,
      }).start();
    };
  }, [translateY, SNAP_COLLAPSED]);

  const combinedTranslateY = Animated.add(translateY, dragOffset);

  useEffect(() => {
    Animated.timing(slideX, {
      toValue: selectedItem ? -SCREEN_WIDTH : 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [selectedItem, slideX]);

  const filteredEvents = useMemo(() => [], [selectedDate, customDate]);
  const nearbyPlaces = useMemo(() => [], []);

  const formatEventDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatEventTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  const formatDistanceMeters = (distM?: number): string => {
    if (distM == null || !Number.isFinite(distM)) return '';
    if (distM < 1000) return `${Math.round(distM)} m`;
    return `${(distM / 1000).toFixed(1)} km`;
  };

  const formatPriceLevel = (level?: number): string => {
    if (level == null || !Number.isFinite(level)) return '';
    const clamped = Math.max(1, Math.min(4, Math.round(level)));
    return '$'.repeat(clamped);
  };

  // Don't return null - keep component mounted for animations
  // The sheet position is controlled by translateY instead

  // Render Detail View for Selected Item
  const renderDetailView = () => {
    if (!selectedItem) return null;

    const isPlace = selectedItem.type === 'place';
    const item = selectedItem.data as SearchResultItem;
    const distanceText = formatDistanceMeters(item.distanceMeters);
    const priceText = formatPriceLevel(item.priceLevel);

    const handleDirections = () => {
      const lat = item.location.latitude;
      const lng = item.location.longitude;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
      Linking.openURL(url);
    };

    const handleOpenUrl = () => {
      if (item.url) {
        Linking.openURL(item.url);
      } else {
        handleDirections();
      }
    };

    return (
      <View style={{ flex: 1 }}>
        {/* Header with Back Button */}
        <View className="px-4 py-3 border-b border-gray-100">
          <TouchableOpacity
            onPress={() => onBackFromDetail?.()} 
            className="flex-row items-center"
          >
            <Icon name="chevron-left" size={24} color={iconColors.active} />
            <Text className="text-base font-semibold text-gray-900 ml-2">Back</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={{ paddingBottom: 24 }}
          onScrollBeginDrag={() => {
            isInnerScrollActiveRef.current = true;
          }}
          onScrollEndDrag={() => {
            isInnerScrollActiveRef.current = false;
          }}
          onMomentumScrollBegin={() => {
            isInnerScrollActiveRef.current = true;
          }}
          onMomentumScrollEnd={() => {
            isInnerScrollActiveRef.current = false;
          }}
        >
          <View className="px-4 pt-4 pb-4">
            {/* Header Image */}
            {item.imageUrl ? (
              <View className="rounded-2xl overflow-hidden mb-4">
                <Image
                  source={{ uri: item.imageUrl }}
                  style={{ width: SCREEN_WIDTH - 32, height: 220 }}
                  contentFit="cover"
                />
              </View>
            ) : (
              <View className="rounded-2xl overflow-hidden mb-4 bg-gray-100" style={{ height: 220 }} />
            )}

            <Text className="text-2xl font-bold text-gray-900 mb-2 leading-tight">{item.title}</Text>

            {/* Category + Distance */}
            <View className="flex-row items-center flex-wrap mb-3">
              {!!item.category && (
                <View className="bg-gray-100 px-3 py-1 rounded-full mr-2 mb-2">
                  <Text className="text-xs font-semibold text-gray-700">{item.category}</Text>
                </View>
              )}
              {!!distanceText && (
                <View className="bg-gray-100 px-3 py-1 rounded-full mr-2 mb-2">
                  <Text className="text-xs font-semibold text-gray-700">{distanceText} away</Text>
                </View>
              )}
              {isPlace && !!priceText && (
                <View className="bg-gray-100 px-3 py-1 rounded-full mr-2 mb-2">
                  <Text className="text-xs font-semibold text-gray-700">{priceText}</Text>
                </View>
              )}
              {isPlace && typeof item.isOpenNow === 'boolean' && (
                <View
                  className={`px-3 py-1 rounded-full mr-2 mb-2 ${item.isOpenNow ? 'bg-green-100' : 'bg-red-100'}`}
                >
                  <Text className={`text-xs font-semibold ${item.isOpenNow ? 'text-green-700' : 'text-red-700'}`}>
                    {item.isOpenNow ? 'Open now' : 'Closed'}
                  </Text>
                </View>
              )}
              {!isPlace && item.isFree && (
                <View className="bg-green-100 px-3 py-1 rounded-full mr-2 mb-2">
                  <Text className="text-xs font-semibold text-green-700">FREE</Text>
                </View>
              )}
            </View>

            {!!item.reason && (
              <View className="mb-3">
                <View className="flex-row items-start bg-purple-50 px-3 py-2 rounded-xl">
                  <Icon name="zap" size={14} color="#A855F7" />
                  <Text className="text-sm text-purple-700 ml-2 flex-1">
                    {item.reason}
                  </Text>
                </View>
              </View>
            )}

            {/* Event core fields */}
            {item.type === 'event' && (
              <View className="mb-2">
                {!!item.venueName && (
                  <View className="flex-row items-center mb-2">
                    <Icon name="map-pin" size={14} color={iconColors.default} />
                    <Text className="text-base text-gray-900 ml-2">{item.venueName}</Text>
                  </View>
                )}
                {!!item.startDate && (
                  <View className="flex-row items-center mb-2">
                    <Icon name="calendar" size={14} color={iconColors.default} />
                    <Text className="text-base text-gray-900 ml-2">
                      {formatEventDate(item.startDate)}, {formatEventTime(item.startDate)}
                      {!!item.endDate ? ` – ${formatEventDate(item.endDate)}` : ''}
                    </Text>
                  </View>
                )}
                {item.isFree ? (
                  <View className="flex-row items-center mb-2">
                    <Icon name="tag" size={14} color={iconColors.default} />
                    <Text className="text-base text-gray-900 ml-2">Free</Text>
                  </View>
                ) : (
                  (item.priceMin != null || item.priceMax != null) && (
                    <View className="flex-row items-center mb-2">
                      <Icon name="tag" size={14} color={iconColors.default} />
                      <Text className="text-base text-gray-900 ml-2">
                        {item.priceMin != null ? `$${item.priceMin}` : ''}
                        {item.priceMin != null && item.priceMax != null ? ' – ' : ''}
                        {item.priceMax != null ? `$${item.priceMax}` : ''}
                      </Text>
                    </View>
                  )
                )}
              </View>
            )}

            {/* Place core fields */}
            {item.type === 'place' && (
              <View className="mb-2">
                {(item.rating != null || item.reviewCount != null) && (
                  <View className="flex-row items-center mb-2">
                    <Icon name="star" size={14} color="#F59E0B" />
                    <Text className="text-base text-gray-900 ml-2">
                      {item.rating != null ? item.rating.toFixed(1) : '—'}
                      {!!item.reviewCount ? ` (${item.reviewCount})` : ''}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {!!item.address && (
              <TouchableOpacity onPress={handleDirections} className="flex-row items-start py-2 active:opacity-60">
                <Icon name="map-pin" size={16} color="#3B82F6" />
                <Text className="text-base text-blue-600 ml-2 flex-1 leading-snug">
                  {item.address}
                </Text>
              </TouchableOpacity>
            )}

            {/* Social context (placeholder until friends/chat data is wired) */}
            <View className="mt-5">
              <Text className="text-sm font-bold text-gray-900 mb-2">Social</Text>
              <View className="bg-gray-50 rounded-2xl p-4">
                <Text className="text-sm text-gray-700">Friends who saved: —</Text>
                <Text className="text-sm text-gray-700 mt-1">{item.type === 'event' ? 'Friends going: —' : 'Friends who went: —'}</Text>
                <Text className="text-xs text-gray-500 mt-2">This will populate when social graph & chat links are connected.</Text>
              </View>
            </View>

            {/* Associated chat/plan context (placeholder) */}
            <View className="mt-4 mb-2">
              <Text className="text-sm font-bold text-gray-900 mb-2">Context</Text>
              <View className="bg-gray-50 rounded-2xl p-4">
                <Text className="text-sm text-gray-700">Linked group: —</Text>
                <Text className="text-sm text-gray-700 mt-1">Date: —</Text>
              </View>
            </View>

            {/* Actions (scrollable) */}
            <View className="mt-5">
              <View className="flex-row gap-3">
                <TouchableOpacity
                  onPress={() => toggleSave(item as any)}
                  className="flex-1 py-4 rounded-2xl items-center bg-gray-100 active:bg-gray-200"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <Icon name="bookmark" size={22} color={isSaved ? iconColors.primary : iconColors.active} />
                  <Text className="text-sm font-bold text-gray-900 mt-1.5">Save</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => thumbsUp(item.id)}
                  className="flex-1 py-4 rounded-2xl items-center bg-gray-100 active:bg-gray-200"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <Feather name="thumbs-up" size={22} color={myVote === 'up' ? iconColors.active : iconColors.default} />
                  <Text className="text-sm font-bold text-gray-900 mt-1.5">{thumbsUpCount}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => thumbsDown(item.id)}
                  className="flex-1 py-4 rounded-2xl items-center bg-gray-100 active:bg-gray-200"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.1,
                    shadowRadius: 4,
                    elevation: 2,
                  }}
                >
                  <Feather name="thumbs-down" size={22} color={myVote === 'down' ? iconColors.active : iconColors.default} />
                  <Text className="text-sm font-bold text-gray-900 mt-1.5">Private</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={handleOpenUrl}
                  className="flex-1 py-4 rounded-2xl items-center bg-gray-900 active:bg-gray-800"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.3,
                    shadowRadius: 8,
                    elevation: 5,
                  }}
                >
                  {isPlace ? (
                    <Icon name="navigation" size={22} color="#FFFFFF" />
                  ) : (
                    <MaterialCommunityIcons name="ticket-confirmation" size={22} color="#FFFFFF" />
                  )}
                  <Text className="text-sm font-bold text-white mt-1.5">
                    {isPlace ? 'Maps' : (item.url ? 'Tickets' : 'Maps')}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  };

  // Render Unified Results
  const renderSearchResults = () => (
    <>
      {/* Header with Back Button */}
      <View className="px-4 pb-3 border-b border-gray-100">
        <View className="flex-row items-center justify-between mb-2">
          <TouchableOpacity
            onPress={onBackFromSearch}
            className="flex-row items-center"
          >
            <Icon name="chevron-left" size={24} color={iconColors.active} />
            <Text className="text-base font-semibold text-gray-900 ml-2">Back</Text>
          </TouchableOpacity>
          <View className="flex-row items-center">
            <View className="bg-gray-900 px-3 py-1 rounded-full">
              <Text className="text-sm font-semibold text-white">
                {searchResults?.length || 0}
              </Text>
            </View>
          </View>
        </View>
        <Text className="text-2xl font-bold text-gray-900">Results</Text>
      </View>

      {/* Results List */}
      <ScrollView className="flex-1 px-4 pt-4" showsVerticalScrollIndicator={false}>
        {searchResults && searchResults.length > 0 ? (
          <>
            {/* AI-Powered Badge (if reasons are present) */}
            {searchResults.some(r => r.reason) && (
              <View className="mb-3 flex-row items-center justify-center">
                <View className="bg-purple-100 px-4 py-2 rounded-full flex-row items-center">
                  <Icon name="zap" size={14} color="#A855F7" />
                  <Text className="text-xs font-semibold text-purple-700 ml-1.5">
                    AI-Powered Results
                  </Text>
                </View>
              </View>
            )}
            
            <View className="gap-3 pb-6">
            {searchResults.map((item) => (
              <TouchableOpacity
                key={`${item.type}-${item.id}`}
                onPress={() => onResultPress?.(item)}
                className={`bg-white border rounded-2xl overflow-hidden shadow-sm active:opacity-80 ${
                  activeResultId && item.id === activeResultId ? 'border-gray-900' : 'border-gray-200'
                }`}
              >
                <View className="flex-row">
                  {item.imageUrl && (
                    <Image
                      source={{ uri: item.imageUrl }}
                      style={{ width: 100, height: 100 }}
                      contentFit="cover"
                    />
                  )}
                  <View className="flex-1 p-3 justify-between">
                    <View>
                      <View className="flex-row items-center mb-1">
                        <View
                          className="w-6 h-6 rounded-full items-center justify-center mr-2"
                          style={{ backgroundColor: getCategoryColor(item.type === 'event' ? 'event' : (item.category || 'default')) }}
                        >
                          {item.type === 'event' ? (
                            <Feather name="calendar" size={12} color="#FFFFFF" />
                          ) : (
                            <CategoryIcon category={item.category || 'default'} size={12} color="#FFFFFF" />
                          )}
                        </View>
                        <Text className="text-base font-bold text-gray-900 flex-1" numberOfLines={1}>
                          {item.title}
                        </Text>
                      </View>
                      {!!item.venueName && item.type === 'event' && (
                        <Text className="text-xs text-gray-500 mb-1" numberOfLines={1}>
                          {item.venueName}
                        </Text>
                      )}
                      {!!item.address && item.type === 'place' && (
                        <Text className="text-xs text-gray-500 mb-1" numberOfLines={1}>
                          {item.address}
                        </Text>
                      )}
                    </View>

                    <View className="flex-row items-center justify-between">
                      {item.type === 'place' && typeof item.rating === 'number' && (
                        <View className="flex-row items-center">
                          <Icon name="star" size={12} color="#F59E0B" />
                          <Text className="text-xs font-medium text-gray-700 ml-1">
                            {item.rating.toFixed(1)}
                          </Text>
                          {!!item.reviewCount && (
                            <Text className="text-xs text-gray-400 ml-1">
                              ({item.reviewCount})
                            </Text>
                          )}
                        </View>
                      )}
                      {item.type === 'event' && !!item.startDate && (
                        <Text className="text-xs text-gray-600">
                          {formatEventDate(item.startDate)}
                        </Text>
                      )}
                      {item.type === 'event' && item.isFree && (
                        <View className="bg-green-100 px-2 py-0.5 rounded-full">
                          <Text className="text-xs font-semibold text-green-700">FREE</Text>
                        </View>
                      )}
                    </View>
                  </View>
                </View>

                {!!item.reason && (
                  <View className="px-3 pb-2">
                    <View className="flex-row items-start bg-purple-50 px-2 py-1.5 rounded-lg">
                      <Icon name="zap" size={12} color="#A855F7" />
                      <Text className="text-xs text-purple-700 ml-1.5 flex-1" numberOfLines={2}>
                        {item.reason}
                      </Text>
                    </View>
                  </View>
                )}
              </TouchableOpacity>
            ))}
            </View>
          </>
        ) : (
          <View className="flex-1 items-center justify-center py-12 px-6">
            <View className="w-20 h-20 bg-gray-100 rounded-full items-center justify-center mb-4">
              <Icon name="search" size={32} color={iconColors.muted} />
            </View>
            <Text className="text-xl font-bold text-gray-900 mb-2">No results found</Text>
            <Text className="text-sm text-gray-500 text-center mb-4 leading-relaxed">
              We couldn't find any matches for your search. Try adjusting your filters or searching in a different area.
            </Text>
            <View className="bg-gray-50 p-4 rounded-xl w-full">
              <Text className="text-xs font-semibold text-gray-700 mb-2">Suggestions:</Text>
              <Text className="text-xs text-gray-600">• Try a broader search term</Text>
              <Text className="text-xs text-gray-600">• Check your spelling</Text>
              <Text className="text-xs text-gray-600">• Search in a different location</Text>
              <Text className="text-xs text-gray-600">• Clear filters and try again</Text>
            </View>
          </View>
        )}
      </ScrollView>
    </>
  );

  return (
    <PanGestureHandler
      onGestureEvent={handleGestureEvent}
      onHandlerStateChange={handleGesture}
      activeOffsetY={[-10, 10]}
      failOffsetX={[-15, 15]}
    >
      <Animated.View 
        className="bg-white rounded-t-3xl shadow-lg absolute left-0 right-0 bottom-0" 
        style={{
          height: SCREEN_HEIGHT,
          transform: [{ translateY: combinedTranslateY }],
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
          elevation: 8,
        }}
      >
        {/* Draggable Handle - Interactive area */}
        <TouchableOpacity 
          activeOpacity={1}
          className="items-center py-3"
          onPress={() => {
            // Cycle through positions on tap (Google Maps style)
            const currentY = (translateY as any).__getValue();
            let targetY = SNAP_PARTIAL;
            
            if (Math.abs(currentY - SNAP_PARTIAL) < 50) {
              targetY = SNAP_THREE_QUARTER;
            } else if (Math.abs(currentY - SNAP_THREE_QUARTER) < 50) {
              targetY = SNAP_EXPANDED;
            } else {
              targetY = SNAP_PARTIAL;
            }
            
            Animated.spring(translateY, {
              toValue: targetY,
              useNativeDriver: true,
              tension: 40,
              friction: 12,
            }).start();
          }}
        >
          <View className="w-12 h-1.5 bg-gray-400 rounded-full" />
        </TouchableOpacity>

      <Animated.View
        style={{
          width: SCREEN_WIDTH * 2,
          flexDirection: 'row',
          transform: [{ translateX: slideX }],
          flex: 1,
        }}
      >
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          {renderSearchResults()}
        </View>
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          {renderDetailView()}
        </View>
      </Animated.View>
      </Animated.View>
    </PanGestureHandler>
  );
};

// Legend item - Functional category filter button
const LegendItem = ({ 
  category, 
  label, 
  isActive, 
  onPress 
}: { 
  category: string; 
  label: string;
  isActive: boolean;
  onPress: () => void;
}) => (
  <TouchableOpacity
    activeOpacity={0.85}
    onPress={onPress}
    className={`flex-row items-center mr-2 px-3 py-1.5 rounded-full border ${
      isActive 
        ? 'bg-gray-900 border-gray-900' 
        : 'bg-white/95 border-gray-100'
    }`}
    style={isActive ? { 
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.2,
      shadowRadius: 4,
      elevation: 3
    } : {}}
  >
    <View className="mr-1.5">
      <CategoryIcon
        category={category}
        size={14}
        color={isActive ? '#FFFFFF' : getCategoryColor(category)}
      />
    </View>
    <Text className={`text-xs font-medium ${isActive ? 'text-white' : 'text-gray-700'}`}>
      {label}
    </Text>
  </TouchableOpacity>
);

export const MapScreen = () => {
  const mapRef = useRef<MapView>(null);
  const lastSearchRegionRef = useRef<Region | null>(null);
  const [region, setRegion] = useState<Region>({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [backendReachable, setBackendReachable] = useState(false);
  const [resultsSource, setResultsSource] = useState<'backend' | 'mock'>('mock');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);
  const [activePlaceId, setActivePlaceId] = useState<string | null>(null);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<{ type: 'place' | 'event'; data: any } | null>(null);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isSheetVisible, setIsSheetVisible] = useState(true);
  const [shouldExpandSheet, setShouldExpandSheet] = useState(false);
  const [sheetTargetPosition, setSheetTargetPosition] = useState<'hidden' | 'collapsed' | 'partial' | 'three-quarter' | 'expanded' | undefined>('collapsed');
  const [sheetAnimationKey, setSheetAnimationKey] = useState(0);
  
  // Track bottom sheet position for Find Me button
  const [sheetTranslateY, setSheetTranslateY] = useState<Animated.Value | null>(null);
  
  // Search input ref for managing focus
  const searchInputRef = useRef<TextInput>(null);

  const activeFilterCount = 0;

  const visibleResults = useMemo(() => {
    const pad = 1.2;
    const latHalf = (region.latitudeDelta / 2) * pad;
    const lngHalf = (region.longitudeDelta / 2) * pad;
    const latMin = region.latitude - latHalf;
    const latMax = region.latitude + latHalf;
    const lngMin = region.longitude - lngHalf;
    const lngMax = region.longitude + lngHalf;

    return (results || []).filter((r) => {
      const lat = r.location?.latitude;
      const lng = r.location?.longitude;
      if (typeof lat !== 'number' || typeof lng !== 'number') return false;
      return lat >= latMin && lat <= latMax && lng >= lngMin && lng <= lngMax;
    });
  }, [results, region.latitude, region.longitude, region.latitudeDelta, region.longitudeDelta]);
  
  // Snap points for reference (matching WhatsHappeningSheet)
  const SNAP_HIDDEN = SCREEN_HEIGHT;
  const SNAP_COLLAPSED = SCREEN_HEIGHT - 80;
  const SNAP_PARTIAL = SCREEN_HEIGHT - 220;
  const SNAP_THREE_QUARTER = SCREEN_HEIGHT * 0.25;
  const SNAP_EXPANDED = 120;
  
  // Calculate Find Me button translateY based on sheet position
  // Button has fixed bottom position and uses translateY to follow sheet
  // Stops moving when sheet expands beyond partial position (Google Maps style)
  const findMeButtonTranslateY = useMemo(() => {
    if (!sheetTranslateY) {
      return new Animated.Value(0);
    }
    
    // Button follows sheet from collapsed to hidden, then stops at partial
    // When sheet at SNAP_EXPANDED/THREE_QUARTER: translateY = 0 (stops, sheet overlays)
    // When sheet at SNAP_PARTIAL: translateY = 0 (button at base position)
    // When sheet at SNAP_COLLAPSED: translateY = 140 (follows down)
    // When sheet at SNAP_HIDDEN: translateY = 220 (follows completely down)
    return sheetTranslateY.interpolate({
      inputRange: [SNAP_EXPANDED, SNAP_THREE_QUARTER, SNAP_PARTIAL, SNAP_COLLAPSED, SNAP_HIDDEN],
      outputRange: [0, 0, 0, 140, 220],
      extrapolate: 'clamp',
    });
  }, [sheetTranslateY]);

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation(location);
          const newRegion = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          };
          setRegion(newRegion);
          mapRef.current?.animateToRegion(newRegion, 1000);
        } catch (error) {
          console.error('Error getting location:', error);
        }
      }
    })();
  }, []);

  const buildMockResults = (q: string, centerLat: number, centerLng: number): SearchResultItem[] => {
    const lower = q.trim().toLowerCase();
    const matches = (text: string) => {
      if (!lower) return true;
      return text.toLowerCase().includes(lower);
    };

    const places = locationAwareMockPlaces
      .filter((p: any) => matches(p.name) || matches(p.category))
      .map((p: any): SearchResultItem => ({
        id: `mock_place_${p.id}`,
        type: 'place',
        title: p.name,
        imageUrl: p.imageUrl,
        category: p.category,
        location: p.location,
        rating: p.rating,
        reviewCount: p.reviewCount,
        priceLevel: p.priceLevel,
        address: p.address,
        isOpenNow: p.isOpenNow,
        url: p.url,
        distanceMeters: undefined,
        score: 0,
        reason: 'Mock result',
      }));

    const events = locationAwareMockEvents
      .filter((e: any) => matches(e.title) || matches(e.category) || matches(e.venueName || ''))
      .map((e: any): SearchResultItem => ({
        id: `mock_event_${e.id}`,
        type: 'event',
        title: e.title,
        imageUrl: e.imageUrl,
        category: e.category,
        location: e.location,
        startDate: e.startDate,
        endDate: e.endDate,
        venueName: e.venueName,
        isFree: e.isFree,
        priceMin: e.priceMin,
        priceMax: e.priceMax,
        url: e.url,
        distanceMeters: undefined,
        score: 0,
        reason: 'Mock result',
      }));

    const combined = [...places, ...events].slice(0, 50);
    return combined;
  };

  const runSearch = async (q: string, centerLat: number, centerLng: number) => {
    const tz = Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone || 'UTC';
    const nowISO = new Date().toISOString();

    const reachable = backendReachable ? true : await searchService.isBackendReachable();
    if (!reachable) {
      setBackendReachable(false);
      setResultsSource('mock');
      setResults(buildMockResults(q, centerLat, centerLng));
      return;
    }

    const response = await searchService.search({
      query: q,
      userContext: {
        currentLocation: { latitude: centerLat, longitude: centerLng },
        timezone: tz,
        nowISO,
      },
    });

    if (!response) {
      setBackendReachable(false);
      setResultsSource('mock');
      setResults(buildMockResults(q, centerLat, centerLng));
      return;
    }

    setBackendReachable(true);
    setResultsSource('backend');
    setResults(response.results || []);
  };

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;

    setIsSearching(true);
    try {
      const parsed = classifyQuery(q);
      let centerLat = region.latitude;
      let centerLng = region.longitude;

      if (parsed.type === 'location' || parsed.type === 'hybrid') {
        const locationQuery = parsed.location || q;
        const newRegion = await geocodeAddress(locationQuery);

        if (newRegion) {
          centerLat = newRegion.latitude;
          centerLng = newRegion.longitude;
          setRegion(newRegion);
          mapRef.current?.animateToRegion(newRegion, 1000);
        } else if (parsed.type === 'location') {
          Alert.alert(
            'Location not found',
            'Could not find that location. Try a city name, address, or landmark.',
            [{ text: 'OK' }],
          );
          return;
        }
      }

      await runSearch(q, centerLat, centerLng);
      setIsSearchMode(true);
      setIsSheetVisible(true);
      setShouldExpandSheet(true);
      setSheetTargetPosition(undefined);

      if ((results?.length ?? 0) === 0) {
        // Empty state is handled in the sheet UI; no mock merging when backend is reachable.
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleBackFromSearch = () => {
    setIsSearchMode(false);
    setSearchQuery('');
    setShouldExpandSheet(false);
    setIsSheetVisible(true);
    setActivePlaceId(null);
    setActiveEventId(null);
    setSelectedItemForDetail(null);
    setSheetTargetPosition('collapsed'); // Return to collapsed mode
  };

  const handleBackFromDetail = () => {
    setSelectedItemForDetail(null);
    setSheetTargetPosition('three-quarter');
  };

  const handleSearchFocus = () => {
    // Show sheet in collapsed mode when search is focused (if hidden)
    setIsSheetVisible(true);
    // Add timestamp to force re-trigger even if already collapsed
    setSheetTargetPosition('collapsed');
  };

  const handleSearchBlur = () => {
    // Always show collapsed sheet when blurring search (if no active search results)
    if (!isSearchMode) {
      setIsSheetVisible(true);
      setSheetTargetPosition('collapsed'); // Show at collapsed position (handle visible)
      setSheetAnimationKey(prev => prev + 1); // Force animation trigger
    }
  };

  const handleMapPress = () => {
    // Blur search bar when tapping on map
    searchInputRef.current?.blur();
  };

  const handleMarkerPress = (item: SearchResultItem) => {
    if (item.type === 'place') {
      setActivePlaceId(item.id);
      setActiveEventId(null);
    } else {
      setActiveEventId(item.id);
      setActivePlaceId(null);
    }
    setSelectedItemForDetail({ type: item.type, data: item });
    setIsSheetVisible(true);
    setSheetTargetPosition('expanded');
  };

  const handleSearchResultPress = (item: SearchResultItem) => {
    if (item.type === 'place') {
      setActivePlaceId(item.id);
      setActiveEventId(null);
    } else {
      setActiveEventId(item.id);
      setActivePlaceId(null);
    }

    // Animate map to result
    const location = item.location;
    mapRef.current?.animateToRegion(
      {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      800
    );

    setSelectedItemForDetail({ type: item.type, data: item });
    setIsSheetVisible(true);
    setSheetTargetPosition('expanded');
  };

  // Debounced unified search as map moves (thresholded)
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;

    const last = lastSearchRegionRef.current;
    const movedEnough =
      !last ||
      Math.abs(last.latitude - region.latitude) > 0.002 ||
      Math.abs(last.longitude - region.longitude) > 0.002 ||
      Math.abs(last.latitudeDelta - region.latitudeDelta) > 0.01 ||
      Math.abs(last.longitudeDelta - region.longitudeDelta) > 0.01;

    if (!movedEnough) return;
    lastSearchRegionRef.current = region;

    timeoutId = setTimeout(async () => {
      if (!isMounted) return;
      try {
        setIsLoadingRemote(true);
        await runSearch(searchQuery.trim(), region.latitude, region.longitude);
      } finally {
        if (isMounted) setIsLoadingRemote(false);
      }
    }, 500);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [region.latitude, region.longitude, region.latitudeDelta, region.longitudeDelta, searchQuery]);

  // Generate location-aware mock data based on user's actual location
  // Regenerates ONLY when user location is acquired, then stays stable
  const locationAwareMockPlaces = useMemo(() => {
    const centerLat = userLocation?.coords.latitude ?? region.latitude;
    const centerLng = userLocation?.coords.longitude ?? region.longitude;
    
    return mockPlaces.map((place, index) => {
      // Use index as seed for consistent positioning
      const seed1 = index * 0.1234;
      const seed2 = index * 0.5678;
      const latOffset = (Math.sin(seed1) * 0.04); // ~2-3 mile radius on land
      const lngOffset = (Math.cos(seed2) * 0.04);
      return {
        ...place,
        location: {
          ...place.location,
          latitude: centerLat + latOffset,
          longitude: centerLng + lngOffset,
        },
      };
    });
  }, [userLocation?.coords.latitude, userLocation?.coords.longitude]); // Updates when GPS acquired

  const locationAwareMockEvents = useMemo(() => {
    const centerLat = userLocation?.coords.latitude ?? region.latitude;
    const centerLng = userLocation?.coords.longitude ?? region.longitude;
    
    return mockEvents.map((event, index) => {
      // Use index as seed for consistent positioning  
      const seed1 = (index + 100) * 0.2345;
      const seed2 = (index + 100) * 0.6789;
      const latOffset = (Math.sin(seed1) * 0.04); // ~2-3 mile radius on land
      const lngOffset = (Math.cos(seed2) * 0.04);
      return {
        ...event,
        location: {
          ...event.location,
          latitude: centerLat + latOffset,
          longitude: centerLng + lngOffset,
        },
      };
    });
  }, [userLocation?.coords.latitude, userLocation?.coords.longitude]); // Updates when GPS acquired

  const handleRecenter = async () => {
    if (userLocation) {
      const newRegion = {
        latitude: userLocation.coords.latitude,
        longitude: userLocation.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
    } else {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const location = await Location.getCurrentPositionAsync({});
          setUserLocation(location);
          const newRegion = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          };
          setRegion(newRegion);
          mapRef.current?.animateToRegion(newRegion, 1000);
        } catch (error) {
          Alert.alert('Error', 'Could not get your location.');
        }
      } else {
        Alert.alert('Permission needed', 'Please enable location permissions in settings.');
      }
    }
  };

  // NOTE: legacy marker handler removed; Map uses unified `SearchResultItem` handler above.

  const handleSavePlace = (placeId: string) => {
    console.log('Save place:', placeId);
  };

  const handleSaveEvent = (eventId: string) => {
    console.log('Save event:', eventId);
  };

  const handleSelectItem = (type: 'place' | 'event', id: string, data: any) => {
    if (type === 'place') {
      setActivePlaceId(id);
      setActiveEventId(null);
    } else {
      setActiveEventId(id);
      setActivePlaceId(null);
    }
    setSelectedItemForDetail({ type, data: data as SearchResultItem });
    setIsSheetVisible(true);
    setSheetTargetPosition('expanded');
    
    // Animate map to selected item
    mapRef.current?.animateToRegion(
      {
        latitude: data.location.latitude,
        longitude: data.location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      800
    );
  };

  // Legend-based category filtering removed to keep backend as the source of truth.

  return (
    <SafeAreaView className="flex-1 bg-gray-100" edges={['top']}>
      <View className="flex-1 relative">
        <MapView
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          style={{ flex: 1 }}
          region={region}
          onRegionChangeComplete={setRegion}
          onPress={handleMapPress}
          showsUserLocation={true}
          showsMyLocationButton={false}
          showsPointsOfInterest={false}
          showsBuildings={false}
          mapType="standard"
          scrollEnabled={true}
          zoomEnabled={true}
          pitchEnabled={true}
          rotateEnabled={true}
        >
          {visibleResults
            .filter((r) => r.type === 'place')
            .map((place) => (
            <CustomMarker
              key={place.id}
              place={place}
              isActive={activePlaceId === place.id}
              onPress={() => handleMarkerPress(place)}
            />
          ))}
          
          {visibleResults
            .filter((r) => r.type === 'event')
            .map((event) => (
              <EventMarker
                key={event.id}
                event={event}
                isActive={activeEventId === event.id}
                onPress={() => handleMarkerPress(event)}
            />
          ))}
        </MapView>

        <View className="absolute top-4 left-4 right-4">
          <View className="bg-white rounded-2xl px-4 py-3 flex-row items-center shadow-2xl" style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 8 }}>
            <Icon name="search" size={20} color={iconColors.default} />
            <TextInput
              ref={searchInputRef}
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search places, events, or locations..."
              placeholderTextColor="#9ca3af"
              className="flex-1 text-base text-gray-900 ml-3"
              onSubmitEditing={handleSearch}
              onFocus={handleSearchFocus}
              onBlur={handleSearchBlur}
              returnKeyType="search"
            />
            {isSearching ? (
              <ActivityIndicator size="small" color={iconColors.primary} />
            ) : (
              searchQuery.length > 0 && (
                <TouchableOpacity 
                  onPress={() => {
                    setSearchQuery('');
                    setIsSearchMode(false);
                    setSelectedItemForDetail(null);
                    setActivePlaceId(null);
                    setActiveEventId(null);
                    void runSearch('', region.latitude, region.longitude);
                  }} 
                  className="ml-2"
                >
                  <Icon name="x" size={18} color={iconColors.default} />
                </TouchableOpacity>
              )
            )}
          </View>
        </View>

        {/* Loading Indicator for Remote Data */}
        {(isLoadingRemote || isSearching) && (
          <View className="absolute top-32 left-1/2 -ml-20">
            <View className="bg-white px-4 py-2.5 rounded-full flex-row items-center shadow-lg">
              <ActivityIndicator size="small" color={iconColors.primary} />
              <Text className="text-sm text-gray-700 ml-2 font-medium">
                {isSearching ? 'Searching...' : 'Loading...'}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* Find Me Button - Follows bottom sheet position (Google Maps style) */}
      <Animated.View
        className="absolute"
        style={{
          right: 16,
          bottom: 236, // Fixed position: 220 (sheet height at partial) + 16 (spacing)
          transform: [{ translateY: findMeButtonTranslateY }],
        }}
      >
      <TouchableOpacity
        onPress={handleRecenter}
          className="bg-white w-14 h-14 rounded-full items-center justify-center active:bg-gray-50"
          style={{ 
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 4 },
            shadowOpacity: 0.15,
            shadowRadius: 12,
            elevation: 8
          }}
        >
          <Icon name="navigation" size={24} color={iconColors.primary} />
      </TouchableOpacity>
      </Animated.View>

      {/* What's Happening Bottom Sheet */}
      <WhatsHappeningSheet
        region={region}
        visible={isSheetVisible}
        searchResults={visibleResults}
        activeResultId={activePlaceId || activeEventId}
        selectedItem={selectedItemForDetail}
        userLocation={userLocation}
        onBackFromSearch={handleBackFromSearch}
        onBackFromDetail={handleBackFromDetail}
        onResultPress={handleSearchResultPress}
        onSelectItem={handleSelectItem}
        onSheetPositionChange={setSheetTranslateY}
        shouldExpand={shouldExpandSheet}
        targetPosition={sheetTargetPosition}
        animationKey={sheetAnimationKey}
      />
    </SafeAreaView>
  );
};
