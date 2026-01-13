import React, { useState, useRef, useEffect, useMemo } from 'react';
import { View, Text, TouchableOpacity, ScrollView, TextInput, Dimensions, ActivityIndicator, Alert, Modal, Linking, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Region, PROVIDER_GOOGLE } from 'react-native-maps';
import * as Location from 'expo-location';
import { Image } from 'expo-image';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Icon, iconColors } from '@/components/Icon';
import { Rating, PriceLevel } from '@/components';
import { mockPlaces, mockEvents, formatHours } from '@/utils/mockData';
import type { Place, Event } from '@/types';
import { eventsService, type Event as MapEvent } from '@/services/eventsService';
import { placesService, type Place as MapPlace } from '@/services/placesService';
import { PanGestureHandler, State } from 'react-native-gesture-handler';
import { classifyQuery, mapVenueTypeToCategory, mapEventTypeToCategory, type ParsedQuery } from '@/utils/searchHelpers';
import { FilterModal, type FilterOptions } from '@/features/places/components/FilterModal';
import { parseSearchQuery } from '@/services/ai/queryParser';
import { rankResults } from '@/services/ai/ranker';
import { generateReason } from '@/services/ai/reasonGenerator';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Combined result type for search results
type SearchResultItem = {
  id: string;
  type: 'place' | 'event';
  data: MapPlace | MapEvent;
  score?: number; // AI relevance score
  reason?: string; // AI-generated reason
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
  place: Place;
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
            backgroundColor: getCategoryColor(place.category),
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
          <CategoryIcon category={place.category} size={isActive ? 20 : 18} color="#FFFFFF" />
        </View>
        <View
          className="w-0 h-0 -mt-0.5"
          style={{
            borderLeftWidth: 6,
            borderRightWidth: 6,
            borderTopWidth: 8,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: getCategoryColor(place.category),
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
  event: MapEvent;
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
  isSearchMode,
  selectedItem,
  userLocation,
  remoteEvents,
  remotePlaces,
  locationAwareMockEvents,
  locationAwareMockPlaces,
  onBackFromSearch,
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
  isSearchMode?: boolean;
  selectedItem?: { type: 'place' | 'event'; data: any } | null;
  userLocation?: Location.LocationObject | null;
  remoteEvents?: any[];
  remotePlaces?: any[];
  locationAwareMockEvents?: any[];
  locationAwareMockPlaces?: any[];
  onBackFromSearch?: () => void;
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

  // Notify parent of sheet position changes
  useEffect(() => {
    if (onSheetPositionChange) {
      onSheetPositionChange(translateY);
    }
  }, [translateY, onSheetPositionChange]);

  // Expand sheet when search results appear
  useEffect(() => {
    if (shouldExpand && isSearchMode) {
      Animated.spring(translateY, {
        toValue: SNAP_THREE_QUARTER,
        useNativeDriver: true,
        tension: 40,
        friction: 12,
      }).start();
    }
  }, [shouldExpand, isSearchMode, translateY, SNAP_THREE_QUARTER]);

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
  
  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: dragOffset } }],
    { useNativeDriver: true }
  );

  const handleGesture = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.END) {
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

  // Filter events based on selected date (uses API data if available)
  const filteredEvents = useMemo(() => {
    // Use API events if available, otherwise mock events
    const events = ((remoteEvents && remoteEvents.length > 0) ? remoteEvents : (locationAwareMockEvents || [])) as any[];

    // Filter by date
    const now = new Date();
    let targetDate: Date;
    let isWeekendFilter = false;

    switch (selectedDate) {
      case 'today':
        targetDate = now;
        break;
      case 'tomorrow':
        targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + 1);
        break;
      case 'weekend':
        isWeekendFilter = true;
        targetDate = now;
        break;
      case 'custom':
        targetDate = customDate || now;
        break;
      default:
        targetDate = now;
    }

    if (isWeekendFilter) {
      // Show all events happening on Saturday or Sunday
      return events.filter((event) => {
        const eventDate = new Date(event.startDate);
        const day = eventDate.getDay();
        return day === 0 || day === 6; // Sunday or Saturday
      });
    }

    return events.filter((event) => {
      const eventDate = new Date(event.startDate);
      return (
        eventDate.getDate() === targetDate.getDate() &&
        eventDate.getMonth() === targetDate.getMonth() &&
        eventDate.getFullYear() === targetDate.getFullYear()
      );
    });
  }, [remoteEvents, locationAwareMockEvents, selectedDate, customDate]);

  // Get nearby places for "What's Happening" (top rated nearby)
  const nearbyPlaces = useMemo(() => {
    const places = ((remotePlaces && remotePlaces.length > 0) ? remotePlaces : (locationAwareMockPlaces || [])) as any[];
    // Sort by rating and return top 10
    return places
      .filter((place: any) => place.rating)
      .sort((a: any, b: any) => (b.rating || 0) - (a.rating || 0))
      .slice(0, 10);
  }, [remotePlaces, locationAwareMockPlaces]);

  const formatEventDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatEventTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  // Don't return null - keep component mounted for animations
  // The sheet position is controlled by translateY instead

  // Render Detail View for Selected Item
  const renderDetailView = () => {
    if (!selectedItem) return null;

    const isPlace = selectedItem.type === 'place';
    const item = selectedItem.data;

    const handleDirections = () => {
      const lat = item.location.latitude;
      const lng = item.location.longitude;
      const label = isPlace ? item.name : item.title;
      const url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${label}`;
      Linking.openURL(url);
    };

    const handleGetTickets = () => {
      if (item.url) {
        Linking.openURL(item.url);
      }
    };

    // Calculate walking distance from user location (rough estimate: 3mph walking speed)
    const calculateWalkingTime = (): number | null => {
      if (!userLocation) return null;
      
      const R = 3959; // Earth radius in miles
      const lat1 = userLocation.coords.latitude;
      const lon1 = userLocation.coords.longitude;
      const lat2 = item.location.latitude;
      const lon2 = item.location.longitude;
      
      const dLat = (lat2 - lat1) * (Math.PI / 180);
      const dLon = (lon2 - lon1) * (Math.PI / 180);
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(lat1 * (Math.PI / 180)) *
          Math.cos(lat2 * (Math.PI / 180)) *
          Math.sin(dLon / 2) *
          Math.sin(dLon / 2);
      const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
      const distanceMiles = R * c;
      
      // Convert to walking time (3 mph average walking speed)
      const walkingTimeMinutes = Math.round((distanceMiles / 3) * 60);
      return walkingTimeMinutes;
    };

    const walkingTime = calculateWalkingTime();

    // Parse hours for places
    const getHoursInfo = (): { isOpen: boolean; time: string | null } => {
      if (!isPlace || !item.hours) return { isOpen: item.isOpenNow ?? false, time: null };
      const today = new Date().getDay();
      const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
      const todayHours = item.hours[dayNames[today] as keyof typeof item.hours];
      
      if (!todayHours || todayHours.isClosed) {
        // Closed today - find next opening time
        for (let i = 1; i <= 7; i++) {
          const nextDay = (today + i) % 7;
          const nextHours = item.hours[dayNames[nextDay] as keyof typeof item.hours];
          if (nextHours && !nextHours.isClosed) {
            const dayName = dayNames[nextDay].charAt(0).toUpperCase() + dayNames[nextDay].slice(1);
            return { isOpen: false, time: `${dayName} at ${nextHours.open}` };
          }
        }
        return { isOpen: false, time: null };
      }
      
      return { isOpen: true, time: todayHours.close };
    };

    const hoursInfo = getHoursInfo();

    return (
      <>
        {/* Header with Back Button */}
        <View className="px-4 py-3 border-b border-gray-100">
          <TouchableOpacity
            onPress={() => onBackFromSearch?.()} 
            className="flex-row items-center"
          >
            <Icon name="chevron-left" size={24} color={iconColors.active} />
            <Text className="text-base font-semibold text-gray-900 ml-2">Back</Text>
          </TouchableOpacity>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          <View className="px-4 pt-4 pb-3">
            {/* Name - Large and Bold */}
            <Text className="text-2xl font-bold text-gray-900 mb-1.5 leading-tight">
              {isPlace ? item.name : item.title}
            </Text>

            {/* Rating, Reviews, Walking Time - Compact Single Line (Places) */}
            {isPlace && (
              <View className="flex-row items-center flex-wrap mb-1">
                {item.rating && (
                  <>
                    <Text className="text-base font-semibold text-gray-900">{item.rating.toFixed(1)}</Text>
                    <View className="ml-0.5">
                      <Icon name="star" size={14} color="#F59E0B" />
                    </View>
                  </>
                )}
                {item.reviewCount && (
                  <Text className="text-base text-gray-600 ml-1">({item.reviewCount})</Text>
                )}
                {walkingTime !== null && (
                  <>
                    <Text className="text-base text-gray-600 mx-1.5">·</Text>
                    <Feather name="user" size={13} color="#6B7280" />
                    <Text className="text-base text-gray-600 ml-1">{walkingTime} min</Text>
                  </>
                )}
              </View>
            )}

            {/* Walking Time Only for Events */}
            {!isPlace && walkingTime !== null && (
              <View className="flex-row items-center flex-wrap mb-1">
                <Feather name="user" size={13} color="#6B7280" />
                <Text className="text-base text-gray-600 ml-1">{walkingTime} min</Text>
              </View>
            )}

            {/* Event Date/Time - Compact Single Line (Events Only) */}
            {!isPlace && item.startDate && (
              <View className="flex-row items-center mb-1">
                <Icon name="calendar" size={14} color={iconColors.default} />
                <Text className="text-base text-gray-900 ml-1.5 font-medium">
                  {formatEventDate(item.startDate)}, {formatEventTime(item.startDate)}
                </Text>
              </View>
            )}

            {/* Category, Price, and Open Status - Compact Single Line */}
            <View className="flex-row items-center flex-wrap">
              <Text className="text-base text-gray-600 capitalize">{item.category}</Text>
              
              {/* Price for Places */}
              {isPlace && item.priceLevel && (
                <Text className="text-base text-gray-600 mx-1.5">· {'$'.repeat(item.priceLevel)}</Text>
              )}
              {isPlace && (item.priceMin || item.price) && !item.priceLevel && (
                <Text className="text-base text-gray-600 mx-1.5">
                  · ${item.priceMin || item.price}
                  {item.priceMax && item.priceMax !== (item.priceMin || item.price) && `–${item.priceMax}`}
                </Text>
              )}
              
              {/* Price for Events */}
              {!isPlace && item.isFree && (
                <Text className="text-base font-semibold text-green-600 mx-1.5">· FREE</Text>
              )}
              {!isPlace && !item.isFree && (item.priceMin || item.price) && (
                <Text className="text-base text-gray-600 mx-1.5">
                  · ${item.priceMin || item.price}
                  {item.priceMax && item.priceMax !== (item.priceMin || item.price) && `–${item.priceMax}`}
                </Text>
              )}
              
              {/* Hours: Clock Icon + Open/Closed + Time (Places) */}
              {isPlace && item.hours && (
                <>
                  <Text className="text-base text-gray-400 mx-1.5">·</Text>
                  <Icon name="clock" size={14} color={iconColors.default} />
                  <Text className={`text-base font-medium ml-1 ${hoursInfo.isOpen ? 'text-green-600' : 'text-red-600'}`}>
                    {hoursInfo.isOpen ? 'Open' : 'Closed'}
                  </Text>
                  {hoursInfo.time && (
                    <Text className="text-base text-gray-600 ml-1">
                      · {hoursInfo.isOpen ? `Closes ${hoursInfo.time}` : `Opens ${hoursInfo.time}`}
                    </Text>
                  )}
                </>
              )}
            </View>
          </View>

          {/* Image Gallery - Below Header Info */}
          {(item.imageUrl || item.imageUrls) && (
            <View className="mb-3">
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                pagingEnabled
                snapToInterval={SCREEN_WIDTH}
                decelerationRate="fast"
              >
                {(item.imageUrls || [item.imageUrl]).filter(Boolean).map((imgUrl: string, index: number) => (
                  <Image
                    key={index}
                    source={{ uri: imgUrl }}
                    style={{ width: SCREEN_WIDTH, height: 200 }}
                    contentFit="cover"
                  />
                ))}
              </ScrollView>
            </View>
          )}

          {/* Tags - First Thing After Images */}
          {item.tags && item.tags.length > 0 && (
            <View className="px-4 mb-3">
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ paddingRight: 16 }}
              >
                {item.tags.map((tag: string) => (
                  <View key={tag} className="bg-gray-100 px-3 py-1.5 rounded-full mr-2">
                    <Text className="text-xs font-medium text-gray-700">{tag}</Text>
                  </View>
                ))}
              </ScrollView>
            </View>
          )}

          <View className="px-4 pb-4">
            
            {/* Description */}
            {(item.description || item.info) && (
              <View className="mb-4">
                <Text className="text-sm font-bold text-gray-900 mb-2">About</Text>
                <Text className="text-base text-gray-700 leading-relaxed">
                  {item.description || item.info}
                </Text>
              </View>
            )}

            {/* Venue (Events only) */}
            {!isPlace && item.venueName && (
              <View className="mb-4 p-4 bg-gray-50 rounded-2xl">
                <View className="flex-row items-center">
                  <Icon name="map-pin" size={18} color={iconColors.active} />
                  <View className="ml-3 flex-1">
                    <Text className="text-xs text-gray-500 mb-0.5">Venue</Text>
                    <Text className="text-base font-semibold text-gray-900">{item.venueName}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Address - Single Line, Clickable, Opens Maps */}
            <TouchableOpacity 
              onPress={handleDirections}
              className="mb-3 flex-row items-start py-2 active:opacity-60"
            >
              <Icon name="map-pin" size={16} color="#3B82F6" />
              <Text className="text-base text-blue-600 ml-2 flex-1 leading-snug">
                {[
                  item.address || item.location.address || item.venueName,
                  item.location.city,
                  item.location.state,
                  item.location.postalCode || item.location.country
                ].filter(Boolean).join(', ')}
              </Text>
            </TouchableOpacity>

            {/* Contact Info (Places) */}
            {isPlace && (item.contact?.phone || item.contact?.website) && (
              <View className="mb-4 gap-2">
                {item.contact.phone && (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(`tel:${item.contact.phone}`)}
                    className="flex-row items-center p-4 bg-gray-50 rounded-2xl active:bg-gray-100"
                  >
                    <Icon name="phone" size={20} color={iconColors.active} />
                    <Text className="text-base font-medium text-gray-900 ml-3">
                      {item.contact.phone}
                    </Text>
                  </TouchableOpacity>
                )}
                {item.contact.website && (
                  <TouchableOpacity
                    onPress={() => Linking.openURL(item.contact.website)}
                    className="flex-row items-center p-4 bg-gray-50 rounded-2xl active:bg-gray-100"
                  >
                    <Icon name="globe" size={20} color="#3B82F6" />
                    <Text className="text-base font-medium text-primary-500 ml-3 flex-1">
                      Visit Website
                    </Text>
                    <Icon name="external-link" size={16} color={iconColors.primary} />
                  </TouchableOpacity>
                )}
              </View>
            )}

          </View>
        </ScrollView>

        {/* Action Buttons - Modern Design */}
        <View className="px-4 pb-6 pt-4 bg-white border-t border-gray-100">
          <View className="flex-row gap-3">
            <TouchableOpacity
              className="flex-1 py-4 rounded-2xl items-center bg-gray-100 active:bg-gray-200"
              style={{ 
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.1,
                shadowRadius: 4,
                elevation: 2
              }}
            >
              <Icon name="bookmark" size={22} color={iconColors.active} />
              <Text className="text-sm font-bold text-gray-900 mt-1.5">Save</Text>
            </TouchableOpacity>
            
            <TouchableOpacity 
              onPress={isPlace ? handleDirections : handleGetTickets}
              className="flex-1 py-4 rounded-2xl items-center bg-gray-900 active:bg-gray-800"
              style={{ 
                shadowColor: '#000',
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.3,
                shadowRadius: 8,
                elevation: 5
              }}
            >
              {isPlace ? (
                <Icon name="navigation" size={22} color="#FFFFFF" />
              ) : (
                <MaterialCommunityIcons name="ticket-confirmation" size={22} color="#FFFFFF" />
              )}
              <Text className="text-sm font-bold text-white mt-1.5">
                {isPlace ? 'Directions' : 'Get Tickets'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </>
    );
  };

  // Render Search Results Mode
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
        <Text className="text-2xl font-bold text-gray-900">Search Results</Text>
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
                className="bg-white border border-gray-200 rounded-2xl overflow-hidden shadow-sm active:opacity-80"
              >
                {item.type === 'place' ? (
                  // Place Result Card
                  (() => {
                    const place = item.data as MapPlace;
                    return (
                      <View className="flex-row">
                        {place.imageUrl && (
                          <Image
                            source={{ uri: place.imageUrl }}
                            style={{ width: 100, height: 100 }}
                            contentFit="cover"
                          />
                        )}
                        <View className="flex-1 p-3 justify-between">
                          <View>
                            <View className="flex-row items-center mb-1">
                              <View
                                className="w-6 h-6 rounded-full items-center justify-center mr-2"
                                style={{ backgroundColor: getCategoryColor(place.category) }}
                              >
                                <CategoryIcon category={place.category} size={12} color="#FFFFFF" />
                              </View>
                              <Text className="text-base font-bold text-gray-900 flex-1" numberOfLines={1}>
                                {place.name}
                              </Text>
                            </View>
                            {place.address && (
                              <Text className="text-xs text-gray-500 mb-1" numberOfLines={1}>
                                {place.address}
                              </Text>
                            )}
                          </View>
                          <View className="flex-row items-center justify-between">
                            {place.rating && (
                              <View className="flex-row items-center">
                                <Icon name="star" size={12} color="#F59E0B" />
                                <Text className="text-xs font-medium text-gray-700 ml-1">
                                  {place.rating.toFixed(1)}
                                </Text>
                                {place.reviewCount && (
                                  <Text className="text-xs text-gray-400 ml-1">
                                    ({place.reviewCount})
                                  </Text>
                                )}
                              </View>
                            )}
                            {place.priceLevel && (
                              <Text className="text-xs font-medium text-gray-600">
                                {'$'.repeat(place.priceLevel)}
                              </Text>
                            )}
                          </View>
                        </View>
                      </View>
                    );
                  })()
                ) : (
                  // Event Result Card
                  (() => {
                    const event = item.data as MapEvent;
                    return (
                      <View className="flex-row">
                        {event.imageUrl && (
                          <Image
                            source={{ uri: event.imageUrl }}
                            style={{ width: 100, height: 100 }}
                            contentFit="cover"
                          />
                        )}
                        <View className="flex-1 p-3 justify-between">
                          <View>
                            <View className="flex-row items-center mb-1">
                              <View
                                className="w-6 h-6 rounded-lg items-center justify-center mr-2"
                                style={{ backgroundColor: getCategoryColor('event') }}
                              >
                                <Feather name="calendar" size={12} color="#FFFFFF" />
                              </View>
                              <Text className="text-base font-bold text-gray-900 flex-1" numberOfLines={1}>
                                {event.title}
                              </Text>
                            </View>
                            {event.venueName && (
                              <Text className="text-xs text-gray-500 mb-1" numberOfLines={1}>
                                {event.venueName}
                              </Text>
                            )}
                          </View>
                          <View className="flex-row items-center justify-between">
                            <Text className="text-xs text-gray-600">
                              {formatEventDate(event.startDate)}
                            </Text>
                            {event.isFree ? (
                              <View className="bg-green-100 px-2 py-0.5 rounded-full">
                                <Text className="text-xs font-semibold text-green-700">FREE</Text>
                              </View>
                            ) : event.priceMin ? (
                              <Text className="text-xs font-semibold text-gray-900">
                                ${event.priceMin}
                                {event.priceMax && event.priceMax !== event.priceMin && `+`}
                              </Text>
                            ) : null}
                          </View>
                        </View>
                      </View>
                    );
                  })()
                )}
                
                {/* AI-Generated Reason (Phase 5) */}
                {item.reason && (
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

      {selectedItem ? (
        renderDetailView()
      ) : isSearchMode ? (
        renderSearchResults()
      ) : (
        <>
      {/* Header with Date Filters */}
      <View className="px-4 pb-2">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-bold text-gray-900">What's Happening</Text>
          <TouchableOpacity>
            <Text className="text-sm text-primary-500 font-medium">View all</Text>
          </TouchableOpacity>
        </View>

        {/* Date Filter Pills */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
          <View className="flex-row gap-2">
            {(['today', 'tomorrow', 'weekend'] as DateFilter[]).map((filter) => (
              <TouchableOpacity
                key={filter}
                onPress={() => setSelectedDate(filter)}
                className={`px-4 py-2 rounded-full ${
                  selectedDate === filter ? 'bg-gray-900' : 'bg-gray-100'
                }`}
              >
                <Text
                  className={`text-sm font-medium capitalize ${
                    selectedDate === filter ? 'text-white' : 'text-gray-700'
                  }`}
                >
                  {filter}
                </Text>
              </TouchableOpacity>
            ))}
            <TouchableOpacity
              onPress={() => setSelectedDate('custom')}
              className={`px-4 py-2 rounded-full flex-row items-center ${
                selectedDate === 'custom' ? 'bg-gray-900' : 'bg-gray-100'
              }`}
            >
              <Icon
                name="calendar"
                size={14}
                color={selectedDate === 'custom' ? '#FFFFFF' : iconColors.active}
              />
              <Text
                className={`text-sm font-medium ml-1 ${
                  selectedDate === 'custom' ? 'text-white' : 'text-gray-700'
                }`}
              >
                {customDate
                  ? customDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                  : 'Date'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </View>

      <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
        {/* Events Section */}
        <View className="mb-4">
          <View className="px-4 mb-3">
            <Text className="text-base font-bold text-gray-900">Events</Text>
          </View>
          
      {filteredEvents.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
              {filteredEvents.map((event: any) => (
            <TouchableOpacity
              key={event.id}
                  onPress={() => onSelectItem?.('event', event.id, event)}
                  className="mr-3 bg-white rounded-2xl overflow-hidden border border-gray-200"
                  style={{ width: 280, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}
            >
                <Image
                    source={{ uri: event.imageUrl || event.imageUrls?.[0] }}
                    style={{ width: 280, height: 140 }}
                  contentFit="cover"
                />
                  <View className="p-3">
                    <Text className="text-base font-bold text-gray-900 mb-1" numberOfLines={2}>
                      {event.title}
                    </Text>
                    <View className="flex-row items-center mb-2">
                      <Icon name="calendar" size={12} color={iconColors.default} />
                      <Text className="text-xs text-gray-600 ml-1.5">
                        {formatEventDate(event.startDate)}
                  </Text>
                </View>
                    <View className="flex-row items-center justify-between">
                      <View className="px-2 py-1 bg-pink-50 rounded-md">
                        <Text className="text-xs font-medium text-pink-700 capitalize">{event.category}</Text>
                  </View>
                      {event.isFree ? (
                        <Text className="text-xs font-bold text-green-600">FREE</Text>
                      ) : (event.priceMin || event.price) && (
                        <Text className="text-xs font-semibold text-gray-900">
                          ${event.priceMin || event.price}
                        </Text>
                )}
              </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          ) : (
            <View className="px-4 py-8 items-center">
              <Icon name="calendar" size={24} color={iconColors.muted} />
              <Text className="text-sm text-gray-500 mt-2">No events for this date</Text>
            </View>
          )}
        </View>

        {/* Nearby Places Section */}
        <View className="mb-4">
          <View className="px-4 mb-3">
            <Text className="text-base font-bold text-gray-900">Nearby Places</Text>
          </View>
          
          {nearbyPlaces.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={{ paddingHorizontal: 16 }}
            >
              {nearbyPlaces.map((place: any) => (
                <TouchableOpacity
                  key={place.id}
                  onPress={() => onSelectItem?.('place', place.id, place)}
                  className="mr-3 bg-white rounded-2xl overflow-hidden border border-gray-200"
                  style={{ width: 280, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 }}
                >
                  <Image
                    source={{ uri: place.imageUrl || place.imageUrls?.[0] }}
                    style={{ width: 280, height: 140 }}
                    contentFit="cover"
                  />
              <View className="p-3">
                    <Text className="text-base font-bold text-gray-900 mb-1" numberOfLines={2}>
                      {place.name}
                </Text>
                    <View className="flex-row items-center mb-2">
                      {place.rating && (
                        <>
                          <Icon name="star" size={12} color="#F59E0B" />
                          <Text className="text-xs font-semibold text-gray-900 ml-1">
                            {place.rating.toFixed(1)}
                </Text>
                        </>
                      )}
                      {place.priceLevel && (
                        <Text className="text-xs text-gray-600 ml-2">
                          {'$'.repeat(place.priceLevel)}
                    </Text>
                  )}
                </View>
                    <View className="flex-row items-center justify-between">
                      <View className="px-2 py-1 bg-gray-50 rounded-md">
                        <Text className="text-xs font-medium text-gray-700 capitalize">{place.category}</Text>
                  </View>
                      {place.isOpenNow !== undefined && (
                        <Text className={`text-xs font-semibold ${place.isOpenNow ? 'text-green-600' : 'text-red-600'}`}>
                          {place.isOpenNow ? 'Open' : 'Closed'}
                        </Text>
                )}
                    </View>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
            <View className="px-4 py-8 items-center">
              <Icon name="map-pin" size={24} color={iconColors.muted} />
              <Text className="text-sm text-gray-500 mt-2">No places nearby</Text>
        </View>
          )}
        </View>
      </ScrollView>
        </>
      )}
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
  const [region, setRegion] = useState<Region>({
    latitude: 37.78825,
    longitude: -122.4324,
    latitudeDelta: 0.05,
    longitudeDelta: 0.05,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [userLocation, setUserLocation] = useState<Location.LocationObject | null>(null);
  const [remotePlaces, setRemotePlaces] = useState<MapPlace[]>([]);
  const [remoteEvents, setRemoteEvents] = useState<MapEvent[]>([]);
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);
  const [activePlaceId, setActivePlaceId] = useState<string | null>(null);
  const [activeEventId, setActiveEventId] = useState<string | null>(null);
  const [selectedItemForDetail, setSelectedItemForDetail] = useState<{ type: 'place' | 'event'; data: any } | null>(null);
  const [selectedLegendCategory, setSelectedLegendCategory] = useState<string | null>(null);
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [isSearchMode, setIsSearchMode] = useState(false);
  const [isSheetVisible, setIsSheetVisible] = useState(true);
  const [shouldExpandSheet, setShouldExpandSheet] = useState(false);
  const [sheetTargetPosition, setSheetTargetPosition] = useState<'hidden' | 'collapsed' | 'partial' | 'three-quarter' | 'expanded' | undefined>('collapsed');
  const [sheetAnimationKey, setSheetAnimationKey] = useState(0);
  
  // Filter state
  const [filters, setFilters] = useState<FilterOptions>({
    venueCategories: [],
    eventCategories: [],
    priceLevel: [1, 2, 3, 4],
    dateRange: 'all',
    distance: 10,
    openNow: false,
    searchKeyword: '',
  });
  const [isFilterModalVisible, setIsFilterModalVisible] = useState(false);
  
  // Track bottom sheet position for Find Me button
  const [sheetTranslateY, setSheetTranslateY] = useState<Animated.Value | null>(null);
  
  // Search input ref for managing focus
  const searchInputRef = useRef<TextInput>(null);

  // Calculate active filter count
  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.venueCategories.length > 0) count += filters.venueCategories.length;
    if (filters.eventCategories.length > 0) count += filters.eventCategories.length;
    if (filters.priceLevel.length < 4) count += 1; // Price filter active if not all selected
    if (filters.dateRange !== 'all') count += 1;
    if (filters.distance !== 10) count += 1; // Default is 10 miles
    if (filters.openNow) count += 1; // Open now filter
    if (filters.searchKeyword && filters.searchKeyword.trim()) count += 1; // Search keyword
    return count;
  }, [filters]);

  const handleApplyFilters = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    // Trigger search again with new filters if there's an active search
    if (isSearchMode || searchQuery.trim()) {
      handleSearch();
    }
  };
  
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

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setIsSearching(true);
    
    try {
      // Classify the query to determine search strategy
      const parsed = classifyQuery(searchQuery);
      
      let centerLat = region.latitude;
      let centerLng = region.longitude;
      let shouldFetchData = false;

      // Handle location-based queries (including hybrid)
      if (parsed.type === 'location' || parsed.type === 'hybrid') {
        const locationQuery = parsed.location || searchQuery;
        const newRegion = await geocodeAddress(locationQuery);

    if (newRegion) {
          centerLat = newRegion.latitude;
          centerLng = newRegion.longitude;
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
          shouldFetchData = true;
        } else if (parsed.type === 'location') {
          // Pure location search that failed
          Alert.alert(
            'Location not found', 
            'Could not find that location. Try a city name, address, or landmark.',
            [{ text: 'OK' }]
          );
          setIsSearching(false);
          return;
        }
      }

      // For venue_type or event_type without location, use current map center
      if (parsed.type === 'venue_type' || parsed.type === 'event_type') {
        shouldFetchData = true;
      }

      // Fetch data if we have a valid location or type query
      if (shouldFetchData) {
        const radiusMiles = 10;
        const radiusMeters = 16093;

        const [events, places] = await Promise.all([
          eventsService.fetchEvents({
            lat: centerLat,
            lng: centerLng,
            radius: radiusMiles,
          }),
          placesService.fetchPlaces({
            lat: centerLat,
            lng: centerLng,
            radius: radiusMeters,
          }),
        ]);

        // Update remote data
        setRemoteEvents(events);
        setRemotePlaces(places);

        // Filter results based on query type
        let filteredPlaces = places;
        let filteredEvents = events;

        // Apply venue type filtering
        if (parsed.venueTypes && parsed.venueTypes.length > 0) {
          const targetCategories = parsed.venueTypes.map(mapVenueTypeToCategory);
          filteredPlaces = places.filter(place => 
            targetCategories.some(cat => place.category.toLowerCase().includes(cat.toLowerCase()))
          );
        }

        // Apply event type filtering
        if (parsed.eventTypes && parsed.eventTypes.length > 0) {
          const targetCategories = parsed.eventTypes.map(mapEventTypeToCategory);
          filteredEvents = events.filter(event => 
            targetCategories.some(cat => event.category.toLowerCase().includes(cat.toLowerCase()))
          );
        }

        // For mock data fallback when no API results
        if (filteredPlaces.length === 0 && filteredEvents.length === 0) {
          // Use filtered mock data
          if (parsed.venueTypes && parsed.venueTypes.length > 0) {
            const targetCategories = parsed.venueTypes.map(mapVenueTypeToCategory);
            filteredPlaces = (locationAwareMockPlaces as any[]).filter((place: any) => 
              targetCategories.some(cat => place.category.toLowerCase().includes(cat.toLowerCase()))
            );
    } else {
            filteredPlaces = locationAwareMockPlaces as any[];
          }

          if (parsed.eventTypes && parsed.eventTypes.length > 0) {
            const targetCategories = parsed.eventTypes.map(mapEventTypeToCategory);
            filteredEvents = (locationAwareMockEvents as any[]).filter((event: any) => 
              targetCategories.some(cat => event.category.toLowerCase().includes(cat.toLowerCase()))
            );
          } else {
            filteredEvents = locationAwareMockEvents as any[];
          }
        }

        // Apply additional filters from filter modal
        let finalPlaces = filteredPlaces;
        let finalEvents = filteredEvents;

        // Apply venue category filters
        if (filters.venueCategories.length > 0) {
          finalPlaces = filteredPlaces.filter(place => 
            filters.venueCategories.includes(place.category.toLowerCase())
          );
        }

        // Apply event category filters
        if (filters.eventCategories.length > 0) {
          finalEvents = filteredEvents.filter(event => 
            filters.eventCategories.includes(event.category.toLowerCase())
          );
        }

        // Apply price level filter to places
        if (filters.priceLevel.length < 4) {
          finalPlaces = finalPlaces.filter(place => 
            place.priceLevel ? filters.priceLevel.includes(place.priceLevel) : true
          );
        }

        // Apply open now filter to places
        if (filters.openNow) {
          finalPlaces = finalPlaces.filter(place => place.isOpenNow === true);
        }

        // Apply search keyword filter
        if (filters.searchKeyword && filters.searchKeyword.trim()) {
          const keyword = filters.searchKeyword.toLowerCase();
          finalPlaces = finalPlaces.filter(place => 
            place.name?.toLowerCase().includes(keyword) ||
            place.category?.toLowerCase().includes(keyword) ||
            place.address?.toLowerCase().includes(keyword)
          );
          finalEvents = finalEvents.filter(event => 
            event.title?.toLowerCase().includes(keyword) ||
            event.category?.toLowerCase().includes(keyword) ||
            event.description?.toLowerCase().includes(keyword)
          );
        }

        // Apply date range filter to events
        if (filters.dateRange !== 'all') {
          const now = new Date();
          finalEvents = finalEvents.filter(event => {
            const eventDate = new Date(event.startDate);
            
            if (filters.dateRange === 'today') {
              return eventDate.toDateString() === now.toDateString();
            } else if (filters.dateRange === 'weekend') {
              const day = eventDate.getDay();
              return day === 0 || day === 6; // Sunday or Saturday
            } else if (filters.dateRange === 'month') {
              return eventDate.getMonth() === now.getMonth() && 
                     eventDate.getFullYear() === now.getFullYear();
            }
            return true;
          });
        }

        // Step: Use AI to rank results and generate reasons (Phase 5)
        const allResults = [...finalPlaces, ...finalEvents];
        
        // Parse query for AI context
        const aiParsedQuery = await parseSearchQuery(searchQuery);
        
        // Rank results using AI heuristics
        const rankedResults = await rankResults(allResults, {
          location: { latitude: centerLat, longitude: centerLng },
          timeOfDay: getTimeOfDay(),
          preferences: aiParsedQuery.preferences,
          searchQuery,
        });

        // Generate reasons for top results
        const resultsWithReasons = await Promise.all(
          rankedResults.slice(0, 20).map(async (ranked) => {
            const reason = await generateReason(ranked.item, {
              location: { latitude: centerLat, longitude: centerLng },
              timeOfDay: getTimeOfDay(),
              preferences: aiParsedQuery.preferences,
              searchQuery,
            });
            return {
              ...ranked,
              reason,
            };
          })
        );

        // Combine results for search results view with AI scoring
        const combinedResults: SearchResultItem[] = resultsWithReasons.map((ranked) => ({
          id: ranked.item.id,
          type: ('rating' in ranked.item ? 'place' : 'event') as 'place' | 'event',
          data: ranked.item,
          score: ranked.score,
          reason: ranked.reason,
        }));

        setSearchResults(combinedResults);
        setIsSearchMode(true);
        setIsSheetVisible(true);
        setShouldExpandSheet(true);
        setSheetTargetPosition(undefined); // Let shouldExpand handle it
        setSelectedLegendCategory(null); // Clear legend filter when searching

        // Show helpful message if no results
        if (combinedResults.length === 0) {
          Alert.alert(
            'No results found',
            `No ${parsed.venueTypes?.[0] || parsed.eventTypes?.[0] || 'places'} found in this area. Try a different search or location.`,
            [{ text: 'OK' }]
          );
        }
      }
    } catch (error) {
      console.error('Search error:', error);
      Alert.alert('Search error', 'Unable to complete search. Please try again.');
    } finally {
    setIsSearching(false);
    }
  };

  const handleBackFromSearch = () => {
    setIsSearchMode(false);
    setSearchResults([]);
    setSearchQuery('');
    setShouldExpandSheet(false);
    setIsSheetVisible(true);
    setSelectedItemForDetail(null); // Clear selected item
    setActivePlaceId(null);
    setActiveEventId(null);
    setSheetTargetPosition('collapsed'); // Return to collapsed mode
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

  const handleSearchResultPress = (item: SearchResultItem) => {
    setSelectedItemForDetail(item);
    setIsSearchMode(false); // Exit search results to show detail
    setSheetTargetPosition('expanded');
    
    if (item.type === 'place') {
      setActivePlaceId(item.id);
    } else {
      setActiveEventId(item.id);
    }
    
    // Animate map to result
    const location = item.data.location;
    mapRef.current?.animateToRegion(
      {
        latitude: location.latitude,
        longitude: location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      800
    );
  };

  // Load remote events and places dynamically as map moves (with debouncing)
  useEffect(() => {
    let isMounted = true;
    let timeoutId: NodeJS.Timeout;
    
    const loadData = async () => {
      if (!isMounted) return;
      
      try {
        setIsLoadingRemote(true);
        const centerLat = region.latitude;
        const centerLng = region.longitude;

        const radiusMiles = 10;
        const radiusMeters = 16093;

        const [events, places] = await Promise.all([
          eventsService.fetchEvents({
            lat: centerLat,
            lng: centerLng,
            radius: radiusMiles,
          }),
          placesService.fetchPlaces({
            lat: centerLat,
            lng: centerLng,
            radius: radiusMeters,
          }),
        ]);

        if (isMounted) {
          setRemoteEvents(events);
          setRemotePlaces(places);
        }
      } catch (error) {
        if (__DEV__) {
          console.log('Error loading map data', error);
        }
      } finally {
        if (isMounted) {
          setIsLoadingRemote(false);
        }
      }
    };

    // Debounce: Wait 500ms after user stops moving map before loading data
    timeoutId = setTimeout(() => {
      loadData();
    }, 500);
    
    return () => {
      isMounted = false;
      clearTimeout(timeoutId);
    };
  }, [region.latitude, region.longitude]); // Dynamically load as map moves

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

  const handleMarkerPress = (place: any) => {
    setActivePlaceId(place.id);
    setSelectedItemForDetail({ type: 'place', data: place });
    setIsSearchMode(false); // Exit search mode to show detail view
    setSheetTargetPosition('expanded'); // Expand sheet to show details
    
    // Smooth animation to marker
    mapRef.current?.animateToRegion(
      {
        latitude: place.location.latitude,
        longitude: place.location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      800
    );
  };

  const handleSavePlace = (placeId: string) => {
    console.log('Save place:', placeId);
  };

  const handleSaveEvent = (eventId: string) => {
    console.log('Save event:', eventId);
  };

  const handleSelectItem = (type: 'place' | 'event', id: string, data: any) => {
    setSelectedItemForDetail({ type, data });
    if (type === 'place') {
      setActivePlaceId(id);
      setActiveEventId(null);
    } else {
      setActiveEventId(id);
      setActivePlaceId(null);
    }
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

  const handleLegendCategoryPress = (category: string) => {
    // Toggle category selection
    if (selectedLegendCategory === category) {
      setSelectedLegendCategory(null); // Deselect - show all
    } else {
      setSelectedLegendCategory(category); // Select - filter by category
    }
    // Exit any detail/search views to show browse mode
    setSelectedItemForDetail(null);
    setIsSearchMode(false);
    setSearchResults([]);
    setSearchQuery('');
    // Show sheet in collapsed mode
    setIsSheetVisible(true);
    setSheetTargetPosition('collapsed');
  };

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
          {/* Render Place Markers - Filtered by legend selection */}
          {(remotePlaces.length ? remotePlaces : locationAwareMockPlaces)
            .filter((place: any) => {
              // If legend category selected, only show matching places
              if (selectedLegendCategory && selectedLegendCategory !== 'event') {
                return place.category.toLowerCase() === selectedLegendCategory.toLowerCase();
              }
              // If events selected, hide places
              if (selectedLegendCategory === 'event') return false;
              return true;
            })
            .map((place) => (
            <CustomMarker
              key={place.id}
              place={place as unknown as Place}
              isActive={activePlaceId === place.id}
              onPress={() => handleMarkerPress(place as unknown as Place)}
            />
          ))}
          
          {/* Render Event Markers - Filtered by legend selection */}
          {(remoteEvents.length ? remoteEvents : locationAwareMockEvents)
            .filter((event: any) => {
              // If legend category selected, only show if it's 'event' or null
              if (selectedLegendCategory && selectedLegendCategory !== 'event') {
                return false; // Hide events when place category selected
              }
              return true;
            })
            .map((event) => (
              <EventMarker
                key={event.id}
                event={event as MapEvent}
                isActive={activeEventId === event.id}
                onPress={() => {
                  setSelectedItemForDetail({ type: 'event', data: event });
                  setActiveEventId(event.id);
                  setIsSearchMode(false);
                  setSheetTargetPosition('expanded');
                  
                  mapRef.current?.animateToRegion(
                    {
                      latitude: event.location.latitude,
                      longitude: event.location.longitude,
                      latitudeDelta: 0.01,
                      longitudeDelta: 0.01,
                    },
                    800
                  );
                }}
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
                    setSearchResults([]);
                  }} 
                  className="ml-2"
                >
                  <Icon name="x" size={18} color={iconColors.default} />
                </TouchableOpacity>
              )
            )}
            {/* Filter Button - Icon only on the right */}
            <TouchableOpacity 
              className="ml-2 p-2 active:opacity-60 relative"
              onPress={() => setIsFilterModalVisible(true)}
            >
              <Icon name="sliders" size={20} color={iconColors.active} />
              {activeFilterCount > 0 && (
                <View 
                  className="absolute -top-0.5 -right-0.5 bg-red-500 rounded-full w-4 h-4 items-center justify-center"
                  style={{ 
                    shadowColor: '#EF4444',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.4,
                    shadowRadius: 3,
                    elevation: 4
                  }}
                >
                  <Text className="text-white text-xs font-black">!</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <View className="absolute top-24 left-4 right-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="bg-white/95 rounded-2xl px-3 py-2.5 shadow-lg"
            style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 8, elevation: 4 }}
          >
            <LegendItem 
              category="bar" 
              label="Bars"
              isActive={selectedLegendCategory === 'bar'}
              onPress={() => handleLegendCategoryPress('bar')}
            />
            <LegendItem 
              category="restaurant" 
              label="Food"
              isActive={selectedLegendCategory === 'restaurant'}
              onPress={() => handleLegendCategoryPress('restaurant')}
            />
            <LegendItem 
              category="cafe" 
              label="Cafés"
              isActive={selectedLegendCategory === 'cafe'}
              onPress={() => handleLegendCategoryPress('cafe')}
            />
            <LegendItem 
              category="event" 
              label="Events"
              isActive={selectedLegendCategory === 'event'}
              onPress={() => handleLegendCategoryPress('event')}
            />
            <LegendItem 
              category="hotel" 
              label="Hotels"
              isActive={selectedLegendCategory === 'hotel'}
              onPress={() => handleLegendCategoryPress('hotel')}
            />
            <LegendItem 
              category="shopping" 
              label="Shopping"
              isActive={selectedLegendCategory === 'shopping'}
              onPress={() => handleLegendCategoryPress('shopping')}
            />
            <LegendItem 
              category="museum" 
              label="Culture"
              isActive={selectedLegendCategory === 'museum'}
              onPress={() => handleLegendCategoryPress('museum')}
            />
          </ScrollView>
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
        searchResults={searchResults}
        isSearchMode={isSearchMode}
        selectedItem={selectedItemForDetail}
        userLocation={userLocation}
        remoteEvents={remoteEvents}
        remotePlaces={remotePlaces}
        locationAwareMockEvents={locationAwareMockEvents}
        locationAwareMockPlaces={locationAwareMockPlaces}
        onBackFromSearch={handleBackFromSearch}
        onResultPress={handleSearchResultPress}
        onSelectItem={handleSelectItem}
        onSheetPositionChange={setSheetTranslateY}
        shouldExpand={shouldExpandSheet}
        targetPosition={sheetTargetPosition}
        animationKey={sheetAnimationKey}
      />

      {/* Filter Modal */}
      <FilterModal
        visible={isFilterModalVisible}
        currentFilters={filters}
        onClose={() => setIsFilterModalVisible(false)}
        onApply={handleApplyFilters}
      />
    </SafeAreaView>
  );
};
