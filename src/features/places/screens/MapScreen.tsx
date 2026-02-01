import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Dimensions, ActivityIndicator, Alert, Linking, Animated, Modal, Pressable, Easing, Keyboard, Platform } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import Svg, { Defs, LinearGradient as SvgLinearGradient, Path, Stop } from 'react-native-svg';
import Slider from '@react-native-community/slider';
import { Icon, iconColors } from '@/components/Icon';
import { mockPlaces, mockEvents, formatHours } from '@/utils/mockData';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { classifyQuery, mapVenueTypeToCategory, mapEventTypeToCategory, type ParsedQuery } from '@/utils/searchHelpers';
import { searchService, type SearchResult as UnifiedSearchResult } from '@/services/searchService';
import { API_BASE_URL } from '@/services/apiClient';
import { useSavedStore } from '@/stores/useSavedStore';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type SearchResultItem = UnifiedSearchResult;

function isLikelyGoogleIconUrl(url?: string): boolean {
  if (!url) return false;
  const u = url.toLowerCase();
  return (
    u.includes('maps.gstatic.com') ||
    u.includes('gstatic.com/mapfiles') ||
    u.includes('place_api/icons')
  );
}

function extractGooglePlaceIdFromResultId(resultId: string): string | null {
  if (!resultId || typeof resultId !== 'string') return null;
  if (!resultId.startsWith('gp_')) return null;
  const placeId = resultId.slice(3).trim();
  return placeId ? placeId : null;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

const DistanceConfigIcon = ({ size = 24, color = 'currentColor' }: { size?: number; color?: string }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Path
        fill={color}
        d="M11.058 17q-.213 0-.356-.144t-.144-.357t.144-.356t.356-.143h1.865q.213 0 .356.144t.144.357t-.144.356t-.356.143zm-3.75-4.5q-.213 0-.356-.144t-.144-.357t.144-.356t.356-.143h9.365q.213 0 .356.144t.144.357t-.144.356t-.356.143zM4.5 8q-.213 0-.356-.144T4 7.499t.144-.356T4.5 7h15q.213 0 .356.144t.144.357t-.144.356T19.5 8z"
      />
    </Svg>
  );
};

const CurrentLocationGradientIcon = ({ size = 24 }: { size?: number }) => {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      <Defs>
        <SvgLinearGradient id="navGradient" x1="2" y1="2" x2="22" y2="22">
          <Stop offset="0" stopColor="#22C55E" />
          <Stop offset="0.5" stopColor="#3B82F6" />
          <Stop offset="1" stopColor="#A855F7" />
        </SvgLinearGradient>
      </Defs>
      {/* Centered "current location" crosshair (gradient fill) */}
      <Path
        fill="url(#navGradient)"
        d="M12 8a4 4 0 1 0 0 8a4 4 0 0 0 0-8Zm8.94 3A8.96 8.96 0 0 0 13 3.06V1h-2v2.06A8.96 8.96 0 0 0 3.06 11H1v2h2.06A8.96 8.96 0 0 0 11 20.94V23h2v-2.06A8.96 8.96 0 0 0 20.94 13H23v-2h-2.06ZM12 19a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z"
      />
    </Svg>
  );
};

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
  onWhatsHappeningPress,
  onSelectItem,
  onOpenEventVenue,
  searchDisplayCount,
  searchHasReachedBottom,
  onSearchReachedBottomChange,
  onLoadMoreSearchResults,
  isLoadingMoreSearchResults,
  onSheetPositionChange,
  shouldExpand,
  targetPosition,
  animationKey,
  isSearchMode,
  resolveImageUrl,
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
  onWhatsHappeningPress?: (item: SearchResultItem) => void;
  onSelectItem?: (type: 'place' | 'event', id: string, data: any) => void;
  onOpenEventVenue?: (event: SearchResultItem) => void;
  searchDisplayCount?: number;
  searchHasReachedBottom?: boolean;
  onSearchReachedBottomChange?: (v: boolean) => void;
  onLoadMoreSearchResults?: () => void;
  isLoadingMoreSearchResults?: boolean;
  onSheetPositionChange?: (translateY: Animated.Value) => void;
  shouldExpand?: boolean; // Expand when search results appear
  targetPosition?: 'hidden' | 'collapsed' | 'partial' | 'three-quarter' | 'expanded'; // External control
  animationKey?: number; // Force animation trigger
  isSearchMode?: boolean; // Whether we're in search mode
  resolveImageUrl?: (item: SearchResultItem) => string | undefined;
}) => {
  const [selectedDate, setSelectedDate] = useState<DateFilter>('today');
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  const [isDistanceSheetOpen, setIsDistanceSheetOpen] = useState(false);
  const [distanceMiles, setDistanceMiles] = useState(10);
  const [distanceDraft, setDistanceDraft] = useState(10);
  const distanceTrackWidthRef = useRef(0);
  const distanceThumbStartXRef = useRef(0);
  const DISTANCE_SHEET_HEIGHT = 270;
  const distanceBackdropOpacity = useRef(new Animated.Value(0)).current;
  const distanceSheetTranslateY = useRef(new Animated.Value(DISTANCE_SHEET_HEIGHT)).current;

  const openDistanceSheet = () => {
    setDistanceDraft(distanceMiles);
    // Ensure initial (hidden) state before showing.
    distanceBackdropOpacity.setValue(0);
    distanceSheetTranslateY.setValue(DISTANCE_SHEET_HEIGHT);
    setIsDistanceSheetOpen(true);

    // Animate in on next frame so modal is mounted.
    requestAnimationFrame(() => {
      Animated.parallel([
        Animated.timing(distanceBackdropOpacity, {
          toValue: 1,
          duration: 180,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }),
        Animated.timing(distanceSheetTranslateY, {
          toValue: 0,
          duration: 220,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
    });
  };

  const closeDistanceSheet = (opts?: { revertDraft?: boolean }) => {
    if (opts?.revertDraft) setDistanceDraft(distanceMiles);

    Animated.parallel([
      Animated.timing(distanceBackdropOpacity, {
        toValue: 0,
        duration: 160,
        easing: Easing.out(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(distanceSheetTranslateY, {
        toValue: DISTANCE_SHEET_HEIGHT,
        duration: 200,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setIsDistanceSheetOpen(false);
    });
  };
  
  // Snap points for the bottom sheet
  const SNAP_HIDDEN = SCREEN_HEIGHT; // Completely off-screen
  const SNAP_COLLAPSED = SCREEN_HEIGHT - 80; // Just handle showing
  const SNAP_PARTIAL = SCREEN_HEIGHT - 220; // Default view
  const SNAP_THREE_QUARTER = SCREEN_HEIGHT * 0.25; // 75% expanded
  const SNAP_EXPANDED = 120; // Fully expanded - aligns with top of map UI
  
  const translateY = useRef(new Animated.Value(SNAP_COLLAPSED)).current;
  const dragOffset = useRef(new Animated.Value(0)).current;
  const slideX = useRef(new Animated.Value(0)).current;
  const isUserDraggingRef = useRef(false);

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

  // External programmatic snap (used by MapScreen on search blur).
  // IMPORTANT: Only runs when explicitly triggered via `animationKey` to avoid
  // reintroducing the historical "snap-back" bug during normal drag interactions.
  useEffect(() => {
    if (!targetPosition) return;

    let toValue = SNAP_PARTIAL;
    switch (targetPosition) {
      case 'hidden':
        toValue = SNAP_HIDDEN;
        break;
      case 'collapsed':
        toValue = SNAP_COLLAPSED;
        break;
      case 'partial':
        toValue = SNAP_PARTIAL;
        break;
      case 'three-quarter':
        toValue = SNAP_THREE_QUARTER;
        break;
      case 'expanded':
        toValue = SNAP_EXPANDED;
        break;
      default:
        toValue = SNAP_PARTIAL;
    }

    Animated.parallel([
      Animated.spring(translateY, {
        toValue,
        useNativeDriver: true,
        tension: 40,
        friction: 12,
      }),
      Animated.spring(dragOffset, {
        toValue: 0,
        useNativeDriver: true,
        tension: 40,
        friction: 12,
      }),
    ]).start(() => {
      if ((toValue === SNAP_COLLAPSED || toValue === SNAP_HIDDEN) && selectedItem) {
        onBackFromSearch?.();
      }
    });
  }, [
    animationKey,
    targetPosition,
    SNAP_COLLAPSED,
    SNAP_EXPANDED,
    SNAP_HIDDEN,
    SNAP_PARTIAL,
    SNAP_THREE_QUARTER,
    dragOffset,
    onBackFromSearch,
    selectedItem,
    translateY,
  ]);

  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: dragOffset } }],
    { 
      useNativeDriver: true,
      listener: ({ nativeEvent }: any) => {
        if (isInnerScrollActiveRef.current) {
          dragOffset.setValue(0);
        }
      }
    }
  );

  const handleGesture = ({ nativeEvent }: any) => {
    const state = nativeEvent.state;
    
    // Track dragging state
    if (state === State.BEGAN) {
      isUserDraggingRef.current = true;
      // Avoid stale "inner scroll active" state locking the sheet.
      // If the current scroll view is at/near top, onScroll will set this back to false quickly.
      isInnerScrollActiveRef.current = false;
      return;
    }
    
    if (state === State.ACTIVE) {
      isUserDraggingRef.current = true;
      return;
    }
    
    // Handle gesture completion
    if (state === State.END) {
      isUserDraggingRef.current = false;
      
      if (isInnerScrollActiveRef.current) {
        dragOffset.setValue(0);
        return;
      }
      
      const { translationY, velocityY } = nativeEvent;
      const currentY = (translateY as any).__getValue();
      const finalY = currentY + translationY;
      
      let targetSnap = SNAP_PARTIAL;
      
      // Determine target snap point based on position and velocity
      if (velocityY > 1200) {
        targetSnap = SNAP_HIDDEN;
      } else if (velocityY > 800) {
        targetSnap = SNAP_COLLAPSED;
      } else if (velocityY < -1200) {
        targetSnap = SNAP_EXPANDED;
      } else if (velocityY < -800) {
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
      
      // Animate to target position
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
        if ((targetSnap === SNAP_COLLAPSED || targetSnap === SNAP_HIDDEN) && selectedItem) {
          onBackFromSearch?.();
        }
      });
    }
    
    // Handle cancelled/failed gestures
    if (state === State.CANCELLED || state === State.FAILED) {
      isUserDraggingRef.current = false;
      Animated.spring(dragOffset, {
        toValue: 0,
        useNativeDriver: true,
        tension: 40,
        friction: 12,
      }).start();
    }
  };

  // Preserve the user's vertical sheet position when navigating between views.
  // (No auto-expand on selection; the sheet should only move when the user drags it,
  // or when it's fully hidden and needs to be revealed.)
  const lastSelectedItemIdRef = useRef<string | null>(null);
  useEffect(() => {
    const currentItemId = selectedItem?.data?.id;
    
    // Track selection changes (used for other logic), but do NOT change translateY.
    if (currentItemId && currentItemId !== lastSelectedItemIdRef.current) {
      lastSelectedItemIdRef.current = currentItemId;
    }
    
    // Clear when item is deselected
    if (!selectedItem) {
      lastSelectedItemIdRef.current = null;
    }
  }, [selectedItem?.data?.id, selectedItem]);

  // Clamp visual translation so overscroll/drag can't reveal the map underneath the sheet.
  const combinedTranslateY = Animated.diffClamp(
    Animated.add(translateY, dragOffset),
    SNAP_EXPANDED,
    SNAP_HIDDEN,
  );

  // Control which view is shown based on search mode and selected item
  // Position 0: What's Happening (default)
  // Position -SCREEN_WIDTH: Results (when in search mode)
  // Position -SCREEN_WIDTH * 2: Detail (when item selected)
  const currentViewRef = useRef(0);
  useEffect(() => {
    let targetX = 0; // Default: What's Happening
    
    if (selectedItem) {
      targetX = -SCREEN_WIDTH * 2; // Show Detail
      currentViewRef.current = 2;
    } else if (isSearchMode && searchResults && searchResults.length >= 0) {
      targetX = -SCREEN_WIDTH; // Show Results (even if empty)
      currentViewRef.current = 1;
    } else {
      targetX = 0; // Show What's Happening
      currentViewRef.current = 0;
    }
    
    Animated.timing(slideX, {
      toValue: targetX,
      duration: 220,
      useNativeDriver: true,
    }).start();
  }, [selectedItem, isSearchMode, searchResults, slideX]);

  const filteredEvents = useMemo(() => [], [selectedDate, customDate]);
  const nearbyPlaces = useMemo(() => [], []);

  const getImageUrl = useCallback(
    (item: SearchResultItem): string | undefined => {
      return resolveImageUrl?.(item) ?? item.imageUrl;
    },
    [resolveImageUrl],
  );

  // Render What's Happening Default View
  const renderWhatsHappening = () => {
    const nearbyEvents = searchResults?.filter(r => r.type === 'event') || [];
    const nearbyPlaces = searchResults?.filter(r => r.type === 'place') || [];
    
    return (
      <>
        {/* Header */}
        <View className="px-4 pt-3 pb-3">
          <View className="flex-row items-center justify-between">
            <View className="flex-1 pr-3">
              <Text className="text-2xl font-bold text-gray-900 mb-1">What's Happening</Text>
              <Text className="text-sm text-gray-500">Discover nearby places and events</Text>
            </View>

            {/* Distance preference button (Bumble-style control) */}
            <TouchableOpacity
              activeOpacity={0.85}
              onPress={() => {
                openDistanceSheet();
              }}
              className="items-center justify-center"
            >
              <DistanceConfigIcon size={24} color={iconColors.active} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Scrollable Content */}
        <ScrollView
          className="flex-1"
          showsVerticalScrollIndicator={false}
          scrollEventThrottle={16}
          onScroll={(e) => {
            const y = e?.nativeEvent?.contentOffset?.y ?? 0;
            // Treat near-top as not scrolling to allow sheet dragging.
            isInnerScrollActiveRef.current = y > 2;
          }}
        >
          {/* Events Feed */}
          {nearbyEvents.length > 0 && (
            <View className="mb-6">
              <View className="px-4 pb-3 flex-row items-center justify-between">
                <View>
                  <Text className="text-lg font-bold text-gray-900">Events Near You</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">{nearbyEvents.length} happening now</Text>
                </View>
                <TouchableOpacity>
                  <Text className="text-sm font-semibold text-gray-900">See all</Text>
                </TouchableOpacity>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              >
                {nearbyEvents.map((event) => (
                  <TouchableOpacity
                    key={event.id}
                    onPress={() => onWhatsHappeningPress?.(event)}
                    activeOpacity={0.9}
                    style={{ width: 280, height: 180 }}
                  >
                    <View className="relative rounded-2xl overflow-hidden">
                      <Image
                        source={{ uri: getImageUrl(event) || 'https://via.placeholder.com/280x180' }}
                        style={{ width: 280, height: 180 }}
                        contentFit="cover"
                      />
                      {/* Gradient overlay for text readability */}
                      <View 
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(0,0,0,0.3)',
                        }}
                      />
                      {/* Title card in bottom left */}
                      <View 
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          padding: 12,
                        }}
                      >
                        <Text className="text-base font-bold text-white mb-1" numberOfLines={2}>
                          {event.title}
                        </Text>
                        {event.venueName && (
                          <View className="flex-row items-center">
                            <Icon name="map-pin" size={12} color="#FFFFFF" />
                            <Text className="text-xs text-white/90 ml-1" numberOfLines={1}>
                              {event.venueName}
                            </Text>
                          </View>
                        )}
                        {event.startDate && (
                          <View className="flex-row items-center mt-1">
                            <Icon name="calendar" size={12} color="#FFFFFF" />
                            <Text className="text-xs text-white/90 ml-1">
                              {formatEventDate(event.startDate)}
                            </Text>
                          </View>
                        )}
                      </View>
                      {/* Event badge */}
                      <View 
                        className="absolute top-3 right-3 bg-pink-500 px-2 py-1 rounded-full"
                        style={{
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.3,
                          shadowRadius: 4,
                        }}
                      >
                        <Text className="text-xs font-bold text-white">EVENT</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Places Feed */}
          {nearbyPlaces.length > 0 && (
            <View className="mb-6">
              <View className="px-4 pb-3 flex-row items-center justify-between">
                <View>
                  <Text className="text-lg font-bold text-gray-900">Places Near You</Text>
                  <Text className="text-xs text-gray-500 mt-0.5">{nearbyPlaces.length} to explore</Text>
                </View>
                <TouchableOpacity>
                  <Text className="text-sm font-semibold text-gray-900">See all</Text>
                </TouchableOpacity>
              </View>
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingHorizontal: 16, gap: 12 }}
              >
                {nearbyPlaces.map((place) => (
                  <TouchableOpacity
                    key={place.id}
                    onPress={() => onWhatsHappeningPress?.(place)}
                    activeOpacity={0.9}
                    style={{ width: 240, height: 160 }}
                  >
                    <View className="relative rounded-2xl overflow-hidden">
                      <Image
                        source={{ uri: getImageUrl(place) || 'https://via.placeholder.com/240x160' }}
                        style={{ width: 240, height: 160 }}
                        contentFit="cover"
                      />
                      {/* Gradient overlay */}
                      <View 
                        style={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          right: 0,
                          bottom: 0,
                          backgroundColor: 'rgba(0,0,0,0.3)',
                        }}
                      />
                      {/* Title card in bottom left */}
                      <View 
                        style={{
                          position: 'absolute',
                          bottom: 0,
                          left: 0,
                          right: 0,
                          padding: 12,
                        }}
                      >
                        <Text className="text-base font-bold text-white mb-1" numberOfLines={1}>
                          {place.title}
                        </Text>
                        <View className="flex-row items-center flex-wrap">
                          {place.category && (
                            <View className="bg-white/20 px-2 py-0.5 rounded-full mr-2 mb-1">
                              <Text className="text-xs font-medium text-white capitalize">
                                {place.category}
                              </Text>
                            </View>
                          )}
                          {typeof place.rating === 'number' && (
                            <View className="flex-row items-center bg-white/20 px-2 py-0.5 rounded-full mb-1">
                              <Icon name="star" size={10} color="#FCD34D" />
                              <Text className="text-xs font-bold text-white ml-1">
                                {place.rating.toFixed(1)}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                      {/* Category icon badge */}
                      <View 
                        className="absolute top-3 right-3 rounded-full p-2"
                        style={{
                          backgroundColor: getCategoryColor(place.category || 'default'),
                          shadowColor: '#000',
                          shadowOffset: { width: 0, height: 2 },
                          shadowOpacity: 0.3,
                          shadowRadius: 4,
                        }}
                      >
                        <CategoryIcon category={place.category || 'default'} size={14} color="#FFFFFF" />
                      </View>
                    </View>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Empty State */}
          {nearbyEvents.length === 0 && nearbyPlaces.length === 0 && (
            <View className="flex-1 items-center justify-center py-16 px-6">
              <View className="w-24 h-24 bg-gray-100 rounded-full items-center justify-center mb-4">
                <Icon name="map-pin" size={36} color={iconColors.muted} />
              </View>
              <Text className="text-xl font-bold text-gray-900 mb-2">Discovering nearby</Text>
              <Text className="text-sm text-gray-500 text-center leading-relaxed">
                We're finding the best places and events around you...
              </Text>
            </View>
          )}
        </ScrollView>

        {/* Distance preference bottom sheet (UI-only) */}
        <Modal
          visible={isDistanceSheetOpen}
          transparent
          animationType="none"
          onRequestClose={() => closeDistanceSheet({ revertDraft: true })}
        >
          <View style={{ flex: 1, justifyContent: 'flex-end' }}>
            {/* Backdrop (fade only; does NOT slide) */}
            <Pressable onPress={() => closeDistanceSheet({ revertDraft: true })} style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
              <Animated.View
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  bottom: 0,
                  backgroundColor: 'rgba(0,0,0,0.35)',
                  opacity: distanceBackdropOpacity,
                }}
              />
            </Pressable>

            {/* Sheet (slides up smoothly) */}
            <Animated.View
              style={{
                transform: [{ translateY: distanceSheetTranslateY }],
                backgroundColor: '#FFFFFF',
                borderTopLeftRadius: 24,
                borderTopRightRadius: 24,
                paddingTop: 16,
                paddingBottom: 18,
                paddingHorizontal: 16,
                borderTopWidth: 1,
                borderTopColor: '#F3F4F6',
              }}
            >
            <View className="items-center mb-3">
              <View className="w-12 h-1.5 bg-gray-300 rounded-full" />
            </View>

            <View className="flex-row items-center justify-between mb-4">
              <Text className="text-lg font-bold text-gray-900">How far away?</Text>
              <View className="bg-gray-100 px-3 py-1 rounded-full">
                <Text className="text-sm font-semibold text-gray-900">{distanceDraft} mi</Text>
              </View>
            </View>

            {/* Slider track (1–100) */}
            <View style={{ width: '100%', paddingVertical: 6 }}>
              <Slider
                style={{ width: '100%', height: 44 }}
                minimumValue={1}
                maximumValue={100}
                step={1}
                value={distanceDraft}
                onValueChange={(v) => setDistanceDraft(Math.round(v))}
                minimumTrackTintColor="#111827"
                maximumTrackTintColor="#E5E7EB"
                thumbTintColor="#111827"
              />
            </View>

            {/* Save/Cancel */}
            <View className="flex-row gap-3 mt-5">
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  closeDistanceSheet({ revertDraft: true });
                }}
                className="flex-1 py-3.5 rounded-2xl bg-gray-100"
              >
                <Text className="text-center text-base font-semibold text-gray-900">Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                activeOpacity={0.9}
                onPress={() => {
                  setDistanceMiles(distanceDraft);
                  closeDistanceSheet();
                }}
                className="flex-1 py-3.5 rounded-2xl bg-gray-900"
              >
                <Text className="text-center text-base font-semibold text-white">Save</Text>
              </TouchableOpacity>
            </View>
            </Animated.View>
          </View>
        </Modal>
      </>
    );
  };

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
      const lat = item.location?.latitude;
      const lng = item.location?.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
        Alert.alert('Directions unavailable', 'This item is missing a valid location.');
        return;
      }
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
          // Make bottom actions part of normal scroll content and prevent the sheet
          // from snapping down when the user releases after scrolling.
          contentContainerStyle={{ paddingBottom: 120 }}
          scrollEventThrottle={16}
          onScroll={(e) => {
            const y = e?.nativeEvent?.contentOffset?.y ?? 0;
            // Only allow sheet drag when the detail view is scrolled to the top.
            isInnerScrollActiveRef.current = y > 2;
          }}
        >
          <View className="px-4 pt-4 pb-4">
            {/* Header Image */}
            {getImageUrl(item) ? (
              <View className="rounded-2xl overflow-hidden mb-4">
                <Image
                  source={{ uri: getImageUrl(item) }}
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
                  <TouchableOpacity
                    activeOpacity={0.8}
                    onPress={() => onOpenEventVenue?.(item)}
                    className="flex-row items-center mb-2"
                  >
                    <Icon name="map-pin" size={14} color={iconColors.default} />
                    <Text className="text-base text-gray-900 ml-2 flex-1" numberOfLines={1}>
                      {item.venueName}
                    </Text>
                    <Icon name="chevron-right" size={18} color={iconColors.muted} />
                  </TouchableOpacity>
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

  // Render Unified Results (supports incremental "infinite" scroll)
  const renderSearchResults = () => {
    const all = searchResults ?? [];
    const limit = typeof searchDisplayCount === 'number' ? searchDisplayCount : all.length;
    const shown = all.slice(0, Math.max(0, limit));
    const canShowMore = shown.length < all.length;

    return (
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
      <ScrollView
        className="flex-1 px-4 pt-4"
        showsVerticalScrollIndicator={false}
        scrollEventThrottle={16}
        onScroll={(e) => {
          const y = e?.nativeEvent?.contentOffset?.y ?? 0;
          isInnerScrollActiveRef.current = y > 2;

          // Only show "load more" after the user truly reached the bottom.
          const layoutH = e?.nativeEvent?.layoutMeasurement?.height ?? 0;
          const contentH = e?.nativeEvent?.contentSize?.height ?? 0;
          const reachedBottom = layoutH + y >= contentH - 24;
          onSearchReachedBottomChange?.(Boolean(reachedBottom));
        }}
      >
        {shown.length > 0 ? (
          <>
            {/* AI-Powered Badge (if reasons are present) */}
            {shown.some((r) => r.reason) && (
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
            {shown.map((item) => (
              <TouchableOpacity
                key={`${item.type}-${item.id}`}
                onPress={() => onResultPress?.(item)}
                className={`bg-white border rounded-2xl overflow-hidden shadow-sm active:opacity-80 ${
                  activeResultId && item.id === activeResultId ? 'border-gray-900' : 'border-gray-200'
                }`}
              >
                <View className="flex-row">
                  {getImageUrl(item) && (
                    <Image
                      source={{ uri: getImageUrl(item) }}
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

            {/* Load more / refresh button (only after reaching bottom) */}
            {Boolean(searchHasReachedBottom) && (
              <View className="pb-10 pt-2 items-center">
                <TouchableOpacity
                  activeOpacity={0.9}
                  disabled={Boolean(isLoadingMoreSearchResults)}
                  onPress={() => onLoadMoreSearchResults?.()}
                  className="bg-white border border-gray-200 px-5 py-3 rounded-2xl flex-row items-center"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.08,
                    shadowRadius: 12,
                    elevation: 6,
                  }}
                >
                  {isLoadingMoreSearchResults ? (
                    <ActivityIndicator size="small" color={iconColors.active} />
                  ) : (
                    <Icon name="refresh-cw" size={18} color={iconColors.active} />
                  )}
                  <Text className="text-sm font-semibold text-gray-900 ml-2">
                    {isLoadingMoreSearchResults
                      ? 'Searching more…'
                      : canShowMore
                        ? 'Show more results'
                        : 'Refresh for more results'}
                  </Text>
                </TouchableOpacity>
              </View>
            )}
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
  };

  return (
    <PanGestureHandler
      onGestureEvent={handleGestureEvent}
      onHandlerStateChange={handleGesture}
      activeOffsetY={[-3, 3]}
      failOffsetX={[-50, 50]}
      enabled={true}
      shouldCancelWhenOutside={false}
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
          width: SCREEN_WIDTH * 3,
          flexDirection: 'row',
          transform: [{ translateX: slideX }],
          flex: 1,
        }}
      >
        {/* View 1: What's Happening (Default) */}
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          {renderWhatsHappening()}
        </View>
        
        {/* View 2: Search Results */}
        <View style={{ width: SCREEN_WIDTH, flex: 1 }}>
          {renderSearchResults()}
        </View>
        
        {/* View 3: Detail View */}
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
  const insets = useSafeAreaInsets();
  const recenterPressScale = useRef(new Animated.Value(1)).current;
  const mapRef = useRef<MapView>(null);
  const isMapReadyRef = useRef(false);
  const pendingAnimateRegionRef = useRef<Region | null>(null);
  const hasInitializedToUserLocationRef = useRef(false);
  const isRecenteringRef = useRef(false);
  const lastSearchRegionRef = useRef<Region | null>(null);
  const [mapInstanceKey, setMapInstanceKey] = useState(0);
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
  const [sheetTargetPosition, setSheetTargetPosition] = useState<'hidden' | 'collapsed' | 'partial' | 'three-quarter' | 'expanded' | undefined>(undefined);
  const [sheetAnimationKey, setSheetAnimationKey] = useState(0);
  
  // Track bottom sheet position for Find Me button
  const [sheetTranslateY, setSheetTranslateY] = useState<Animated.Value | null>(null);
  
  // Search input ref for managing focus
  const searchInputRef = useRef<TextInput>(null);
  const [isSearchInputFocused, setIsSearchInputFocused] = useState(false);
  const keyboardShiftY = useRef(new Animated.Value(0)).current;
  const keyboardHeightRef = useRef(0);
  const sheetYRef = useRef<number>(SCREEN_HEIGHT);
  const didSubmitSearchDuringFocusRef = useRef(false);
  const sheetTargetBeforeSearchRef = useRef<'collapsed' | 'partial' | 'three-quarter' | 'expanded'>('partial');
  const lastSheetViewBeforeDetailRef = useRef<'whats' | 'results'>('whats');
  const SEARCH_PAGE_SIZE = 20;
  const [searchDisplayCount, setSearchDisplayCount] = useState(SEARCH_PAGE_SIZE);
  const [searchHasReachedBottom, setSearchHasReachedBottom] = useState(false);
  const [isLoadingMoreSearchResults, setIsLoadingMoreSearchResults] = useState(false);
  const runSearchSeqRef = useRef(0);
  const [isSheetHidden, setIsSheetHidden] = useState(false);

  // Treat programmatic snaps as one-shot commands.
  // This prevents later re-renders / data refreshes from accidentally reusing a stale target position.
  useEffect(() => {
    if (!sheetTargetPosition) return;
    const t = setTimeout(() => {
      setSheetTargetPosition(undefined);
    }, 350);
    return () => clearTimeout(t);
  }, [sheetAnimationKey, sheetTargetPosition]);

  // Best-effort place photoName enrichment (when backend results fall back to legacy icons).
  // Requires a public key at build time. If missing, we gracefully do nothing.
  const publicPlacesApiKey = process.env.EXPO_PUBLIC_GOOGLE_PLACES_API_KEY;
  const [photoNameOverrideById, setPhotoNameOverrideById] = useState<Record<string, string>>({});

  const resolveResultImageUrl = useCallback(
    (item: SearchResultItem): string | undefined => {
      // Prefer real photos for places when available.
      if (item.type === 'place') {
        const photoName = item.photoName || photoNameOverrideById[item.id];
        if (photoName && API_BASE_URL) {
          const name = encodeURIComponent(photoName);
          return `${API_BASE_URL}/api/place-photo?name=${name}&maxWidthPx=800&maxHeightPx=800`;
        }
        return item.imageUrl;
      }

      // Events: use provided imageUrl.
      return item.imageUrl;
    },
    [photoNameOverrideById],
  );

  useEffect(() => {
    if (!publicPlacesApiKey) return;
    if (!API_BASE_URL) return; // we proxy photos through backend

    const placesNeedingPhotos = (results || [])
      .filter((r) => r.type === 'place')
      .filter((p) => !p.photoName)
      .filter((p) => !photoNameOverrideById[p.id])
      .filter((p) => p.id.startsWith('gp_'))
      // Only bother when the current image is a legacy icon (or missing).
      .filter((p) => isLikelyGoogleIconUrl(p.imageUrl) || !p.imageUrl)
      .slice(0, 16);

    if (placesNeedingPhotos.length === 0) return;

    let isCancelled = false;
    const controller = new AbortController();

    (async () => {
      const updates: Array<{ id: string; photoName: string }> = [];

      await Promise.all(
        placesNeedingPhotos.map(async (p) => {
          const placeId = extractGooglePlaceIdFromResultId(p.id);
          if (!placeId) return;

          try {
            const resp = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
              method: 'GET',
              headers: {
                'X-Goog-Api-Key': publicPlacesApiKey,
                'X-Goog-FieldMask': 'photos',
              },
              signal: controller.signal,
            });

            if (!resp.ok) return;
            const data = (await resp.json()) as { photos?: Array<{ name?: string }> };
            const name = data?.photos?.[0]?.name;
            if (typeof name === 'string' && name.startsWith('places/')) {
              updates.push({ id: p.id, photoName: name });
            }
          } catch {
            // ignore
          }
        }),
      );

      if (isCancelled) return;
      if (updates.length === 0) return;

      setPhotoNameOverrideById((prev) => {
        const next = { ...prev };
        for (const u of updates) next[u.id] = u.photoName;
        return next;
      });
    })();

    return () => {
      isCancelled = true;
      controller.abort();
    };
  }, [publicPlacesApiKey, photoNameOverrideById, results]);

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

  // When in search mode, keep the results list stable (do not clip to viewport).
  const sheetResults = useMemo(() => {
    return isSearchMode ? results : visibleResults;
  }, [isSearchMode, results, visibleResults]);
  
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

  // Keep the search bar above the keyboard while focused, then restore on blur.
  const computeFollowDownY = useCallback(
    (sheetY: number): number => {
      // Mirrors `findMeButtonTranslateY` mapping: [EXPANDED, THREE_QUARTER, PARTIAL, COLLAPSED, HIDDEN] -> [0, 0, 0, 140, 220]
      if (!Number.isFinite(sheetY)) return 0;
      if (sheetY <= SNAP_PARTIAL) return 0;
      if (sheetY <= SNAP_COLLAPSED) {
        const t = (sheetY - SNAP_PARTIAL) / (SNAP_COLLAPSED - SNAP_PARTIAL);
        return clamp(t * 140, 0, 140);
      }
      if (sheetY <= SNAP_HIDDEN) {
        const t = (sheetY - SNAP_COLLAPSED) / (SNAP_HIDDEN - SNAP_COLLAPSED);
        return 140 + clamp(t * 80, 0, 80);
      }
      return 220;
    },
    [SNAP_COLLAPSED, SNAP_HIDDEN, SNAP_PARTIAL],
  );

  const animateKeyboardShift = useCallback(
    (opts: { keyboardHeight: number; sheetY: number; focused: boolean }) => {
      if (!opts.focused) {
        Animated.timing(keyboardShiftY, {
          toValue: 0,
          duration: 160,
          easing: Easing.out(Easing.quad),
          useNativeDriver: true,
        }).start();
        return;
      }

      // iOS keyboard height commonly includes the bottom safe-area inset; compensate so the
      // search bar sits right above the visible keyboard (not floating too high).
      const extraIosSlack = Platform.OS === 'ios' ? 12 : 0;
      const effectiveKeyboardHeight = Math.max(0, opts.keyboardHeight - insets.bottom - extraIosSlack);

      const followDownY = computeFollowDownY(opts.sheetY);
      const bottomDistancePx = 236 - followDownY; // base bottom offset minus follow-down translate
      const overlapPx = effectiveKeyboardHeight - bottomDistancePx;
      const shiftUpPx = Math.max(0, overlapPx); // breathing room above keyboard (minimal/flush)

      Animated.timing(keyboardShiftY, {
        toValue: -shiftUpPx,
        duration: 180,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start();
    },
    [computeFollowDownY, insets.bottom, keyboardShiftY],
  );

  // Track sheet position numerically so keyboard avoidance stays correct while user drags the sheet.
  useEffect(() => {
    if (!sheetTranslateY) return;
    const id = sheetTranslateY.addListener(({ value }) => {
      sheetYRef.current = value;
      const hiddenNow = typeof value === 'number' ? value >= SNAP_HIDDEN - 10 : false;
      setIsSheetHidden((prev) => (prev === hiddenNow ? prev : hiddenNow));
      if (keyboardHeightRef.current > 0 && isSearchInputFocused) {
        animateKeyboardShift({
          keyboardHeight: keyboardHeightRef.current,
          sheetY: sheetYRef.current,
          focused: true,
        });
      }
    });
    return () => {
      sheetTranslateY.removeListener(id);
    };
  }, [SNAP_HIDDEN, animateKeyboardShift, isSearchInputFocused, sheetTranslateY]);

  // Keyboard show/hide handling (only affects the search bar while it's focused).
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, (e) => {
      const h = e?.endCoordinates?.height ?? 0;
      keyboardHeightRef.current = h;
      animateKeyboardShift({ keyboardHeight: h, sheetY: sheetYRef.current, focused: isSearchInputFocused });
    });

    const hideSub = Keyboard.addListener(hideEvent, () => {
      keyboardHeightRef.current = 0;
      animateKeyboardShift({ keyboardHeight: 0, sheetY: sheetYRef.current, focused: false });
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, [animateKeyboardShift, isSearchInputFocused]);

  const applyRegion = (nextRegion: Region, opts?: { animateMs?: number; remountMapOnce?: boolean }) => {
    setRegion(nextRegion);

    // If requested, remount the map ONCE when we first resolve the user's location,
    // so the initial viewport is their actual position (not the default seed region).
    if (opts?.remountMapOnce && !hasInitializedToUserLocationRef.current) {
      hasInitializedToUserLocationRef.current = true;
      setMapInstanceKey((k) => k + 1);
    }

    // Animate immediately if the map is ready; otherwise defer until `onMapReady`.
    if (isMapReadyRef.current && mapRef.current) {
      mapRef.current.animateToRegion(nextRegion, opts?.animateMs ?? 800);
      pendingAnimateRegionRef.current = null;
    } else {
      pendingAnimateRegionRef.current = nextRegion;
    }
  };

  useEffect(() => {
    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status === 'granted') {
        try {
          const lastKnown = await Location.getLastKnownPositionAsync();
          const location = lastKnown ?? (await Location.getCurrentPositionAsync({}));
          setUserLocation(location);
          const newRegion = {
            latitude: location.coords.latitude,
            longitude: location.coords.longitude,
            latitudeDelta: 0.05,
            longitudeDelta: 0.05,
          };
          applyRegion(newRegion, { animateMs: 800, remountMapOnce: true });
          
          // Load initial "What's Happening" data in background
          await runSearch('', location.coords.latitude, location.coords.longitude);
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
    const seq = ++runSearchSeqRef.current;
    const tz = Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone || 'UTC';
    const nowISO = new Date().toISOString();

    try {
      const reachable = backendReachable ? true : await searchService.isBackendReachable();
      if (seq !== runSearchSeqRef.current) return;

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
      if (seq !== runSearchSeqRef.current) return;

      if (!response) {
        setBackendReachable(false);
        setResultsSource('mock');
        setResults(buildMockResults(q, centerLat, centerLng));
        return;
      }

      setBackendReachable(true);
      setResultsSource('backend');
      setResults(response.results || []);
    } catch {
      if (seq !== runSearchSeqRef.current) return;
      // Never crash the UI on search failures; fall back safely.
      setBackendReachable(false);
      setResultsSource('mock');
      setResults(buildMockResults(q, centerLat, centerLng));
    }
  };

  const handleSearch = async () => {
    const q = searchQuery.trim();
    if (!q) return;

    didSubmitSearchDuringFocusRef.current = true;
    setSearchHasReachedBottom(false);
    setSearchDisplayCount(SEARCH_PAGE_SIZE);
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
      // After submitting a search, expand the sheet to the second-highest position
      // so results are immediately visible (without changing user drag state otherwise).
      setSheetTargetPosition('three-quarter');
      setSheetAnimationKey((k) => k + 1);

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
    setSearchHasReachedBottom(false);
    setSearchDisplayCount(SEARCH_PAGE_SIZE);
    setIsSheetVisible(true);
    setActivePlaceId(null);
    setActiveEventId(null);
    setSelectedItemForDetail(null);
    setResults([]); // Clear results to show What's Happening view
  };

  const exitSearchToWhatsHappening = () => {
    // User explicitly finished searching; return to What's Happening.
    searchInputRef.current?.blur();
    setSearchQuery('');
    setIsSearchMode(false);
    setShouldExpandSheet(false);
    setSearchHasReachedBottom(false);
    setSearchDisplayCount(SEARCH_PAGE_SIZE);
    setSelectedItemForDetail(null);
    setActivePlaceId(null);
    setActiveEventId(null);
    setIsSheetVisible(true);
    setSheetTargetPosition('partial');
    setSheetAnimationKey((k) => k + 1);
    void runSearch('', region.latitude, region.longitude);
  };

  const loadMoreSearchResults = async () => {
    if (isLoadingMoreSearchResults) return;
    setIsLoadingMoreSearchResults(true);
    try {
      const total = results.length;
      if (searchDisplayCount < total) {
        setSearchDisplayCount((c) => Math.min(c + SEARCH_PAGE_SIZE, total));
        return;
      }

      const q = searchQuery.trim();
      if (!q) return;

      // Best-effort: refresh the backend search and merge in any new unique results.
      const reachable = backendReachable ? true : await searchService.isBackendReachable();
      if (!reachable) return;

      const tz = Intl?.DateTimeFormat?.().resolvedOptions?.().timeZone || 'UTC';
      const nowISO = new Date().toISOString();
      const response = await searchService.search({
        query: q,
        userContext: {
          currentLocation: { latitude: region.latitude, longitude: region.longitude },
          timezone: tz,
          nowISO,
        },
      });

      const incoming = response?.results ?? [];
      if (incoming.length === 0) return;

      setResults((prev) => {
        const seen = new Set(prev.map((r) => `${r.type}-${r.id}`));
        const merged = [...prev];
        for (const r of incoming) {
          const key = `${r.type}-${r.id}`;
          if (!seen.has(key)) {
            seen.add(key);
            merged.push(r);
          }
        }
        return merged;
      });

      // Reveal any newly merged items.
      setSearchDisplayCount((c) => Math.min(c + SEARCH_PAGE_SIZE, results.length + incoming.length));
    } finally {
      setIsLoadingMoreSearchResults(false);
      setSearchHasReachedBottom(false);
    }
  };

  const handleBackFromDetail = () => {
    setSelectedItemForDetail(null);
    // Go back exactly one step:
    // - Detail -> Results (if user came from Results)
    // - Detail -> What's Happening (otherwise)
    if (lastSheetViewBeforeDetailRef.current === 'results') {
      setIsSearchMode(true);
      return;
    }
    setIsSearchMode(false);
    setShouldExpandSheet(false);
  };

  const ensureSheetRevealed = (opts?: { target?: 'partial' | 'collapsed' | 'expanded' | 'three-quarter' }) => {
    const currentY =
      sheetTranslateY && typeof (sheetTranslateY as any).__getValue === 'function'
        ? (sheetTranslateY as any).__getValue()
        : undefined;

    const isHidden = typeof currentY === 'number' ? currentY >= SNAP_HIDDEN - 10 : false;
    if (!isHidden) return;

    setIsSheetVisible(true);
    setSheetTargetPosition(opts?.target ?? 'partial');
    setSheetAnimationKey((k) => k + 1);
  };

  const handleSearchFocus = () => {
    // When focusing the search input:
    // - remember the current sheet position (so we can restore it on blur)
    // - collapse the sheet fully behind the keyboard for a clean search experience
    const currentY = sheetYRef.current;
    const distances = [
      { key: 'expanded' as const, d: Math.abs(currentY - SNAP_EXPANDED) },
      { key: 'three-quarter' as const, d: Math.abs(currentY - SNAP_THREE_QUARTER) },
      { key: 'partial' as const, d: Math.abs(currentY - SNAP_PARTIAL) },
      { key: 'collapsed' as const, d: Math.abs(currentY - SNAP_COLLAPSED) },
      { key: 'hidden' as const, d: Math.abs(currentY - SNAP_HIDDEN) },
    ];
    const nearest = distances.sort((a, b) => a.d - b.d)[0]?.key ?? 'partial';
    sheetTargetBeforeSearchRef.current = nearest === 'hidden' ? 'partial' : nearest;

    setIsSearchInputFocused(true);
    didSubmitSearchDuringFocusRef.current = false;
    setIsSheetVisible(true);

    setSheetTargetPosition('hidden');
    setSheetAnimationKey((k) => k + 1);
  };

  const handleSearchBlur = () => {
    // When leaving the search input:
    // - If user did NOT submit a search, restore the sheet to its prior position.
    // - If user DID submit a search, expand to second-highest position for results.
    setIsSearchInputFocused(false);
    setIsSheetVisible(true);

    if (didSubmitSearchDuringFocusRef.current) {
      setSheetTargetPosition('three-quarter');
      setSheetAnimationKey((k) => k + 1);
      return;
    }

    setShouldExpandSheet(false);
    setSheetTargetPosition(sheetTargetBeforeSearchRef.current);
    setSheetAnimationKey((k) => k + 1);
  };

  const handleMapPress = () => {
    // Blur search bar when tapping on map
    searchInputRef.current?.blur();
  };

  const handleMarkerPress = (item: SearchResultItem) => {
    ensureSheetRevealed({ target: 'partial' });
    lastSheetViewBeforeDetailRef.current = isSearchMode ? 'results' : 'whats';
    if (item.type === 'place') {
      setActivePlaceId(item.id);
      setActiveEventId(null);
    } else {
      setActiveEventId(item.id);
      setActivePlaceId(null);
    }
    setSelectedItemForDetail({ type: item.type, data: item });
    setIsSheetVisible(true);
    // Sheet will auto-expand via useEffect when selectedItem is set
  };

  const handleSearchResultPress = (item: SearchResultItem) => {
    ensureSheetRevealed({ target: 'partial' });
    lastSheetViewBeforeDetailRef.current = 'results';
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
    // Sheet will auto-expand via useEffect when selectedItem is set
  };

  const handleWhatsHappeningResultPress = (item: SearchResultItem) => {
    ensureSheetRevealed({ target: 'partial' });
    lastSheetViewBeforeDetailRef.current = 'whats';

    if (item.type === 'place') {
      setActivePlaceId(item.id);
      setActiveEventId(null);
    } else {
      setActiveEventId(item.id);
      setActivePlaceId(null);
    }

    // Animate map to result (same behavior as search results)
    const location = item.location;
    mapRef.current?.animateToRegion(
      {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      800,
    );

    setSelectedItemForDetail({ type: item.type, data: item });
    setIsSheetVisible(true);
  };

  const handleOpenEventVenue = async (eventItem: SearchResultItem) => {
    try {
      const venueName = (eventItem?.venueName ?? '').trim();
      if (!venueName) return;
      const lat = eventItem.location?.latitude;
      const lng = eventItem.location?.longitude;
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return;

      const reachable = backendReachable ? true : await searchService.isBackendReachable();
      if (!reachable) {
        Alert.alert('Venue unavailable', 'Connect to the backend to open venue details.');
        return;
      }

      // Prefer a direct Google Places Nearby lookup for venues (more reliable than intent-based /api/search).
      if (!API_BASE_URL) {
        Alert.alert('Venue unavailable', 'API base URL is not configured.');
        return;
      }

      type PlacesApiPlace = {
        id: string;
        type: 'place';
        name: string;
        category?: string;
        rating?: number;
        reviewCount?: number;
        priceLevel?: number;
        imageUrl?: string;
        location: { latitude: number; longitude: number };
        address?: string;
        isOpenNow?: boolean;
        url?: string;
      };

      const norm = (s: string) =>
        s
          .toLowerCase()
          .replace(/[\u2019']/g, "'")
          .replace(/[^a-z0-9\s]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

      const targetName = norm(venueName);

      const distMeters = (a: { latitude: number; longitude: number }, b: { latitude: number; longitude: number }) => {
        const R = 6371000;
        const toRad = (deg: number) => (deg * Math.PI) / 180;
        const dLat = toRad(b.latitude - a.latitude);
        const dLon = toRad(b.longitude - a.longitude);
        const lat1 = toRad(a.latitude);
        const lat2 = toRad(b.latitude);
        const x =
          Math.sin(dLat / 2) * Math.sin(dLat / 2) +
          Math.sin(dLon / 2) * Math.sin(dLon / 2) * Math.cos(lat1) * Math.cos(lat2);
        const c = 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
        return R * c;
      };

      const fetchPlacesNearby = async (radius: number): Promise<PlacesApiPlace[]> => {
        const url =
          `${API_BASE_URL}/api/places?lat=${encodeURIComponent(String(lat))}` +
          `&lng=${encodeURIComponent(String(lng))}` +
          `&radius=${encodeURIComponent(String(radius))}` +
          `&query=${encodeURIComponent(venueName)}`;
        const resp = await fetch(url);
        if (!resp.ok) return [];
        const data = (await resp.json()) as any;
        return Array.isArray(data) ? (data as PlacesApiPlace[]) : [];
      };

      // Tight radius first (venue should be very close), then broaden.
      const rawPlaces = (await fetchPlacesNearby(1200)).concat(await fetchPlacesNearby(6000));

      const candidates = rawPlaces
        .filter((p) => p && p.id && p.location && Number.isFinite(p.location.latitude) && Number.isFinite(p.location.longitude))
        .slice(0, 60);

      if (candidates.length === 0) {
        Alert.alert('Venue not found', 'We couldn’t find the venue on Google Places.');
        return;
      }

      const origin = { latitude: lat as number, longitude: lng as number };
      const scored = candidates
        .map((p) => {
          const name = norm(p.name);
          const exact = name === targetName;
          const contains = name.includes(targetName) || targetName.includes(name);
          const namePenalty = exact ? 0 : contains ? 1 : 4;
          const d = distMeters(origin, p.location);
          // Strongly prefer closest + name match. Distance is in meters; scale to keep weights comparable.
          const score = namePenalty * 1000 + d;
          return { p, score };
        })
        .sort((a, b) => a.score - b.score);

      const bestPlace = scored[0]?.p;
      if (!bestPlace) {
        Alert.alert('Venue not found', 'We couldn’t find the venue on Google Places.');
        return;
      }

      // Convert to our unified SearchResultItem shape.
      const placeResult: SearchResultItem = {
        id: bestPlace.id,
        type: 'place',
        title: bestPlace.name,
        imageUrl: bestPlace.imageUrl,
        photoName: undefined,
        category: bestPlace.category,
        location: bestPlace.location,
        rating: bestPlace.rating,
        reviewCount: bestPlace.reviewCount,
        priceLevel: bestPlace.priceLevel,
        address: bestPlace.address,
        isOpenNow: bestPlace.isOpenNow,
        url: bestPlace.url,
        distanceMeters: distMeters(origin, bestPlace.location),
        score: 0,
        reason: 'Venue match',
      };

      // Best-effort photoName enrichment for this venue place (so it shows real images).
      if (publicPlacesApiKey && placeResult.id.startsWith('gp_') && !photoNameOverrideById[placeResult.id]) {
        const placeId = extractGooglePlaceIdFromResultId(placeResult.id);
        if (placeId) {
          fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
            method: 'GET',
            headers: { 'X-Goog-Api-Key': publicPlacesApiKey, 'X-Goog-FieldMask': 'photos' },
          })
            .then((r) => (r.ok ? r.json() : null))
            .then((d: any) => {
              const name = d?.photos?.[0]?.name;
              if (typeof name === 'string' && name.startsWith('places/')) {
                setPhotoNameOverrideById((prev) => ({ ...prev, [placeResult.id]: name }));
              }
            })
            .catch(() => {});
        }
      }

      ensureSheetRevealed({ target: 'partial' });
      lastSheetViewBeforeDetailRef.current = 'results';
      setActivePlaceId(placeResult.id);
      setActiveEventId(null);
      setSelectedItemForDetail({ type: 'place', data: placeResult });
      setIsSheetVisible(true);
    } catch {
      Alert.alert('Error', 'Could not open the venue right now.');
    }
  };

  // Debounced unified search as map moves (thresholded)
  useEffect(() => {
    // Don't refresh results while user is browsing search results or a detail view.
    // This prevents clicking a result (which recenters the map) from overwriting the user's search list.
    if (isSearchMode || selectedItemForDetail || isSearchInputFocused) return;

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
  }, [
    isSearchInputFocused,
    isSearchMode,
    region.latitude,
    region.longitude,
    region.latitudeDelta,
    region.longitudeDelta,
    searchQuery,
    selectedItemForDetail,
  ]);

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
    if (isRecenteringRef.current) return;
    isRecenteringRef.current = true;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please enable location permissions in settings.');
        return;
      }

      const lastKnown = await Location.getLastKnownPositionAsync();
      const location = lastKnown ?? (await Location.getCurrentPositionAsync({}));
      setUserLocation(location);

      const nextRegion: Region = {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.05,
        longitudeDelta: 0.05,
      };

      // Just recenter the map to the user's current GPS position.
      applyRegion(nextRegion, { animateMs: 800, remountMapOnce: false });
    } catch (e) {
      console.error('Error recentering:', e);
      Alert.alert('Error', 'Could not get your location.');
    } finally {
      isRecenteringRef.current = false;
    }
  };

  const handleRecenterPressIn = () => {
    Animated.spring(recenterPressScale, {
      toValue: 0.92,
      useNativeDriver: true,
      tension: 180,
      friction: 16,
    }).start();
  };

  const handleRecenterPressOut = () => {
    Animated.spring(recenterPressScale, {
      toValue: 1,
      useNativeDriver: true,
      tension: 180,
      friction: 14,
    }).start();
  };

  // NOTE: legacy marker handler removed; Map uses unified `SearchResultItem` handler above.

  const handleSavePlace = (placeId: string) => {
    console.log('Save place:', placeId);
  };

  const handleSaveEvent = (eventId: string) => {
    console.log('Save event:', eventId);
  };

  const handleSelectItem = (type: 'place' | 'event', id: string, data: any) => {
    ensureSheetRevealed({ target: 'partial' });
    lastSheetViewBeforeDetailRef.current = isSearchMode ? 'results' : 'whats';
    if (type === 'place') {
      setActivePlaceId(id);
      setActiveEventId(null);
    } else {
      setActiveEventId(id);
      setActivePlaceId(null);
    }
    setSelectedItemForDetail({ type, data: data as SearchResultItem });
    setIsSheetVisible(true);
    // Sheet will auto-expand via useEffect when selectedItem is set
    
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
    <View className="flex-1 bg-gray-100">
      <View className="flex-1 relative">
        <MapView
          key={mapInstanceKey}
          ref={mapRef}
          provider={PROVIDER_GOOGLE}
          // Ensure map renders full-bleed behind the iOS status bar/notch area,
          // even if any parent layout applies top insets.
          style={{ position: 'absolute', top: -insets.top, left: 0, right: 0, bottom: 0 }}
          // Using a controlled `region` can cause subtle drift/feedback loops on iOS.
          // Keep the map interactive/uncontrolled, but still track region changes for search + UI.
          initialRegion={region}
          onRegionChangeComplete={setRegion}
          onMapReady={() => {
            isMapReadyRef.current = true;
            const pending = pendingAnimateRegionRef.current;
            if (pending && mapRef.current) {
              mapRef.current.animateToRegion(pending, 0);
              pendingAnimateRegionRef.current = null;
            }
          }}
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

        {/* UI overlay stays in safe-area, map renders behind status bar */}
        <SafeAreaView
          pointerEvents="box-none"
          edges={['top']}
          className="absolute inset-0"
          style={{ backgroundColor: 'transparent' }}
        >
          {/* Current location button (moved to top; horizontal placement preserved) */}
          <View className="absolute right-4" style={{ top: insets.top + 14 }}>
            <Pressable
              onPress={handleRecenter}
              onPressIn={handleRecenterPressIn}
              onPressOut={handleRecenterPressOut}
              className="bg-white w-14 h-14 rounded-full items-center justify-center"
              style={{ 
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.15,
                shadowRadius: 12,
                elevation: 8
              }}
            >
              <Animated.View
                style={{
                  width: 24,
                  height: 24,
                  alignItems: 'center',
                  justifyContent: 'center',
                  transform: [{ scale: recenterPressScale }],
                }}
              >
                <CurrentLocationGradientIcon size={24} />
              </Animated.View>
            </Pressable>
          </View>

          {/* Search bar (moved to bottom; tracks sheet like old current-location button) */}
          <Animated.View
            className="absolute left-4 right-4"
            style={{
              bottom: 236, // same base as old current-location button
              transform: [{ translateY: findMeButtonTranslateY }, { translateY: keyboardShiftY }],
            }}
          >
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
                (isSearchMode || searchQuery.length > 0) && (
                  <TouchableOpacity 
                    onPress={exitSearchToWhatsHappening}
                    className="ml-2"
                  >
                    <Icon name="x" size={18} color={iconColors.default} />
                  </TouchableOpacity>
                )
              )}
            </View>
          </Animated.View>

          {/* Data Source Indicator */}
          <View className="absolute left-4" style={{ top: insets.top + 12 }}>
            <View className={`px-3 py-1.5 rounded-full flex-row items-center shadow-lg ${
              resultsSource === 'backend' ? 'bg-green-500' : 'bg-orange-500'
            }`}>
              <View className={`w-2 h-2 rounded-full mr-2 ${
                resultsSource === 'backend' ? 'bg-white' : 'bg-white'
              }`} />
              <Text className="text-xs font-bold text-white">
                {resultsSource === 'backend' ? 'LIVE DATA' : 'MOCK DATA'}
              </Text>
            </View>
          </View>

          {/* Fail-safe: when sheet is fully hidden, show a small handle to bring it back */}
          {isSheetHidden && !isSearchInputFocused && (
            <View className="absolute left-0 right-0" style={{ bottom: 84 }}>
              <View className="items-center">
                <Pressable
                  onPress={() => {
                    setIsSheetVisible(true);
                    setSheetTargetPosition('partial');
                    setSheetAnimationKey((k) => k + 1);
                  }}
                  hitSlop={12}
                  className="bg-white/95 border border-gray-100 px-5 py-2 rounded-full flex-row items-center"
                  style={{
                    shadowColor: '#000',
                    shadowOffset: { width: 0, height: 6 },
                    shadowOpacity: 0.12,
                    shadowRadius: 12,
                    elevation: 8,
                  }}
                >
                  <View style={{ transform: [{ rotate: '180deg' }] }}>
                    <Icon name="chevron-down" size={18} color={iconColors.active} />
                  </View>
                  <Text className="text-sm font-semibold text-gray-900 ml-1.5">What’s happening</Text>
                </Pressable>
              </View>
            </View>
          )}
        </SafeAreaView>
      </View>

      {/* What's Happening Bottom Sheet */}
      <WhatsHappeningSheet
        region={region}
        visible={isSheetVisible}
        searchResults={sheetResults}
        activeResultId={activePlaceId || activeEventId}
        selectedItem={selectedItemForDetail}
        userLocation={userLocation}
        onBackFromSearch={handleBackFromSearch}
        onBackFromDetail={handleBackFromDetail}
        onResultPress={handleSearchResultPress}
        onWhatsHappeningPress={handleWhatsHappeningResultPress}
        onSelectItem={handleSelectItem}
        onOpenEventVenue={handleOpenEventVenue}
        searchDisplayCount={isSearchMode ? searchDisplayCount : undefined}
        searchHasReachedBottom={isSearchMode ? searchHasReachedBottom : undefined}
        onSearchReachedBottomChange={isSearchMode ? setSearchHasReachedBottom : undefined}
        onLoadMoreSearchResults={isSearchMode ? loadMoreSearchResults : undefined}
        isLoadingMoreSearchResults={isSearchMode ? isLoadingMoreSearchResults : undefined}
        onSheetPositionChange={setSheetTranslateY}
        shouldExpand={shouldExpandSheet}
        targetPosition={sheetTargetPosition}
        animationKey={sheetAnimationKey}
        isSearchMode={isSearchMode}
        resolveImageUrl={resolveResultImageUrl}
      />
    </View>
  );
};
