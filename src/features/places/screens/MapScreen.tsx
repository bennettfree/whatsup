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

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

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

// Custom Marker Component
const CustomMarker = ({
  place,
  onPress,
  isActive,
}: {
  place: Place;
  onPress?: () => void;
  isActive?: boolean;
}) => {
  return (
    <Marker
      coordinate={{
        latitude: place.location.latitude,
        longitude: place.location.longitude,
      }}
      onPress={onPress}
    >
      <View className="items-center">
        <View
          className="rounded-full items-center justify-center shadow-lg"
          style={{
            backgroundColor: getCategoryColor(place.category),
            width: isActive ? 40 : 36,
            height: isActive ? 40 : 36,
            borderWidth: isActive ? 2 : 0,
            borderColor: isActive ? '#FFFFFF' : 'transparent',
          }}
        >
          <CategoryIcon category={place.category} size={16} />
        </View>
        <View
          className="w-0 h-0 -mt-1"
          style={{
            borderLeftWidth: 5,
            borderRightWidth: 5,
            borderTopWidth: 6,
            borderLeftColor: 'transparent',
            borderRightColor: 'transparent',
            borderTopColor: getCategoryColor(place.category),
          }}
        />
      </View>
    </Marker>
  );
};

// Business Detail Modal with Hours & Website
const BusinessDetailModal = ({
  place,
  visible,
  onClose,
  onSave,
}: {
  place: Place | null;
  visible: boolean;
  onClose: () => void;
  onSave: (placeId: string) => void;
}) => {
  if (!place) return null;

  const [isSaved, setIsSaved] = useState(place.isSaved ?? false);

  const handleSave = () => {
    setIsSaved(!isSaved);
    onSave(place.id);
  };

  const handleCall = () => {
    if (place.contact?.phone) {
      Linking.openURL(`tel:${place.contact.phone}`);
    }
  };

  const handleWebsite = () => {
    if (place.contact?.website) {
      Linking.openURL(place.contact.website);
    }
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View className="flex-1 bg-black/50 justify-end">
        <View className="bg-white rounded-t-3xl max-h-[85%]">
          <View className="items-center py-3">
            <View className="w-12 h-1 bg-gray-300 rounded-full" />
          </View>

          <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
            <Image
              source={{ uri: place.imageUrls[0] }}
              style={{ width: SCREEN_WIDTH, height: 250 }}
              contentFit="cover"
            />

            <View className="px-4 py-4">
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-1">
                  <Text className="text-2xl font-bold text-gray-900 mb-1">{place.name}</Text>
                  <View className="flex-row items-center">
                    <View
                      className="px-2 py-1 rounded-full flex-row items-center mr-2"
                      style={{ backgroundColor: getCategoryColor(place.category) + '20' }}
                    >
                      <CategoryIcon category={place.category} size={14} />
                      <Text
                        className="text-xs font-medium ml-1 capitalize"
                        style={{ color: getCategoryColor(place.category) }}
                      >
                        {place.category}
                      </Text>
                    </View>
                    <Rating value={place.rating} size="sm" reviewCount={place.reviewCount} />
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} className="p-2">
                  <Icon name="x" size={24} color={iconColors.active} />
                </TouchableOpacity>
              </View>

              <View className="flex-row items-center mb-4 gap-4">
                <PriceLevel level={place.priceLevel} size="md" />
                {place.aiScore && (
                  <View className="flex-row items-center">
                    <Icon name="zap" size={16} color={iconColors.primary} />
                    <Text className="text-sm font-medium text-gray-700 ml-1">
                      {place.aiScore}% match
                    </Text>
                  </View>
                )}
              </View>

              {/* Hours */}
              {place.hours && (
                <View className="mb-4 p-3 bg-gray-50 rounded-xl">
                  <View className="flex-row items-center mb-2">
                    <Icon name="clock" size={18} color={iconColors.active} />
                    <Text className="font-semibold text-gray-900 ml-2">Hours</Text>
                  </View>
                  <Text className="text-sm text-gray-700">{formatHours(place.hours)}</Text>
                </View>
              )}

              <Text className="text-base text-gray-700 mb-4">{place.description}</Text>

              <View className="flex-row items-start mb-4 p-3 bg-gray-50 rounded-xl">
                <Icon name="map-pin" size={20} color={iconColors.active} />
                <View className="ml-3 flex-1">
                  <Text className="text-sm font-medium text-gray-900">{place.location.address}</Text>
                  <Text className="text-sm text-gray-500">
                    {place.location.city}, {place.location.state}
                  </Text>
                </View>
              </View>

              {/* Contact Info */}
              {place.contact && (
                <View className="mb-4 gap-2">
                  {place.contact.phone && (
                    <TouchableOpacity
                      onPress={handleCall}
                      className="flex-row items-center p-3 bg-gray-50 rounded-xl"
                    >
                      <Icon name="phone" size={18} color={iconColors.active} />
                      <Text className="text-sm font-medium text-gray-900 ml-3">
                        {place.contact.phone}
                      </Text>
                    </TouchableOpacity>
                  )}
                  {place.contact.website && (
                    <TouchableOpacity
                      onPress={handleWebsite}
                      className="flex-row items-center p-3 bg-gray-50 rounded-xl"
                    >
                      <Icon name="globe" size={18} color={iconColors.active} />
                      <Text className="text-sm font-medium text-primary-500 ml-3">
                        Visit Website
                      </Text>
                      <View className="ml-2">
                        <Icon name="external-link" size={16} color={iconColors.primary} />
                      </View>
                    </TouchableOpacity>
                  )}
                </View>
              )}

              <View className="flex-row flex-wrap gap-2 mb-6">
                {place.tags.map((tag) => (
                  <View key={tag} className="bg-gray-100 px-3 py-1.5 rounded-full">
                    <Text className="text-sm text-gray-700">{tag}</Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>

          <View className="px-4 pb-6 pt-2 border-t border-gray-100">
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleSave}
                className={`flex-1 py-3 rounded-xl items-center ${
                  isSaved ? 'bg-gray-100' : 'bg-gray-900'
                }`}
              >
                <Icon
                  name="bookmark"
                  size={20}
                  color={isSaved ? iconColors.active : '#FFFFFF'}
                />
                <Text
                  className={`text-sm font-semibold mt-1 ${
                    isSaved ? 'text-gray-900' : 'text-white'
                  }`}
                >
                  {isSaved ? 'Saved' : 'Save'}
                </Text>
              </TouchableOpacity>
              <TouchableOpacity className="flex-1 py-3 rounded-xl items-center bg-primary-500">
                <Icon name="navigation" size={20} color="#FFFFFF" />
                <Text className="text-sm font-semibold text-white mt-1">Directions</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

// Date Filter Types
type DateFilter = 'today' | 'tomorrow' | 'weekend' | 'custom';

// What's Happening Bottom Sheet Component - Draggable
const WhatsHappeningSheet = ({
  region,
  visible,
}: {
  region: Region;
  visible: boolean;
}) => {
  const [selectedDate, setSelectedDate] = useState<DateFilter>('today');
  const [customDate, setCustomDate] = useState<Date | null>(null);
  const [currentEventIndex, setCurrentEventIndex] = useState(0);
  
  // Snap points for the bottom sheet
  const SNAP_COLLAPSED = SCREEN_HEIGHT - 80; // Just handle showing
  const SNAP_PARTIAL = SCREEN_HEIGHT - 220; // Default view
  const SNAP_EXPANDED = 100; // Nearly full screen
  
  const translateY = useRef(new Animated.Value(SNAP_PARTIAL)).current;
  const dragOffset = useRef(new Animated.Value(0)).current;
  
  const handleGestureEvent = Animated.event(
    [{ nativeEvent: { translationY: dragOffset } }],
    { useNativeDriver: true }
  );

  const handleGesture = ({ nativeEvent }: any) => {
    if (nativeEvent.state === State.END) {
      const { translationY, velocityY } = nativeEvent;
      const currentY = translateY.__getValue();
      const finalY = currentY + translationY;
      
      let targetSnap = SNAP_PARTIAL;
      
      // Determine target snap point based on position and velocity
      if (velocityY > 500) {
        // Fast downward swipe - collapse
        targetSnap = SNAP_COLLAPSED;
      } else if (velocityY < -500) {
        // Fast upward swipe - expand
        targetSnap = SNAP_EXPANDED;
      } else {
        // Snap to nearest position
        const distances = [
          Math.abs(finalY - SNAP_EXPANDED),
          Math.abs(finalY - SNAP_PARTIAL),
          Math.abs(finalY - SNAP_COLLAPSED),
        ];
        const minIndex = distances.indexOf(Math.min(...distances));
        targetSnap = [SNAP_EXPANDED, SNAP_PARTIAL, SNAP_COLLAPSED][minIndex];
      }
      
      // Animate to target position
      Animated.parallel([
        Animated.spring(translateY, {
          toValue: targetSnap,
          useNativeDriver: true,
          tension: 50,
          friction: 10,
          velocity: velocityY / 1000,
        }),
        Animated.spring(dragOffset, {
          toValue: 0,
          useNativeDriver: true,
          tension: 50,
          friction: 10,
        }),
      ]).start();
    } else if (nativeEvent.state === State.BEGAN) {
      dragOffset.setValue(0);
    }
  };

  const combinedTranslateY = Animated.add(translateY, dragOffset);

  // Filter events based on map region and selected date
  const filteredEvents = useMemo(() => {
    let events = mockEvents;

    // Filter by map region (events within visible area)
    events = events.filter((event) => {
      const latDiff = Math.abs(event.location.latitude - region.latitude);
      const lngDiff = Math.abs(event.location.longitude - region.longitude);
      return latDiff <= region.latitudeDelta && lngDiff <= region.longitudeDelta;
    });

    // Filter by date
    const now = new Date();
    let targetDate: Date;

    switch (selectedDate) {
      case 'today':
        targetDate = now;
        break;
      case 'tomorrow':
        targetDate = new Date(now);
        targetDate.setDate(targetDate.getDate() + 1);
        break;
      case 'weekend':
        const daysUntilSaturday = 6 - now.getDay();
        targetDate = new Date(now);
        targetDate.setDate(now.getDate() + daysUntilSaturday);
        break;
      case 'custom':
        targetDate = customDate || now;
        break;
      default:
        targetDate = now;
    }

    return events.filter((event) => {
      const eventDate = new Date(event.startDate);
      return (
        eventDate.getDate() === targetDate.getDate() &&
        eventDate.getMonth() === targetDate.getMonth() &&
        eventDate.getFullYear() === targetDate.getFullYear()
      );
    });
  }, [region, selectedDate, customDate]);

  const formatEventDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  };

  const formatEventTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  };

  if (!visible) return null;

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
            // Toggle between partial and expanded on tap
            const currentY = translateY.__getValue();
            const targetY = currentY === SNAP_PARTIAL ? SNAP_EXPANDED : SNAP_PARTIAL;
            Animated.spring(translateY, {
              toValue: targetY,
              useNativeDriver: true,
              tension: 50,
              friction: 10,
            }).start();
          }}
        >
          <View className="w-12 h-1.5 bg-gray-400 rounded-full" />
        </TouchableOpacity>

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

      {/* Swipeable Events */}
      {filteredEvents.length > 0 ? (
        <ScrollView
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onMomentumScrollEnd={(e) => {
            const index = Math.round(e.nativeEvent.contentOffset.x / SCREEN_WIDTH);
            setCurrentEventIndex(index);
          }}
          contentContainerStyle={{ paddingHorizontal: 16 }}
        >
          {filteredEvents.map((event) => (
            <TouchableOpacity
              key={event.id}
              className="mr-3 bg-gray-50 rounded-xl overflow-hidden"
              style={{ width: SCREEN_WIDTH - 32 }}
            >
              <View className="relative">
                <Image
                  source={{ uri: event.imageUrls[0] }}
                  style={{ width: SCREEN_WIDTH - 32, height: 100 }}
                  contentFit="cover"
                />
                <View
                  className="absolute top-2 left-2 px-2 py-1 rounded-full flex-row items-center"
                  style={{ backgroundColor: getCategoryColor(event.category) }}
                >
                  <CategoryIcon category={event.category} size={12} />
                  <Text className="text-white text-xs font-medium ml-1 capitalize">
                    {event.category}
                  </Text>
                </View>
                {event.isFree && (
                  <View className="absolute top-2 right-2 bg-green-500 px-2 py-1 rounded-full">
                    <Text className="text-white text-xs font-medium">FREE</Text>
                  </View>
                )}
              </View>
              <View className="p-3">
                <Text className="font-bold text-gray-900 mb-1" numberOfLines={1}>
                  {event.title}
                </Text>
                <Text className="text-xs text-gray-500 mb-2" numberOfLines={2}>
                  {event.description}
                </Text>
                <View className="flex-row items-center justify-between">
                  <View className="flex-row items-center">
                    <Icon name="calendar" size={12} color={iconColors.default} />
                    <Text className="text-xs text-gray-600 ml-1">
                      {formatEventDate(event.startDate)} • {formatEventTime(event.startDate)}
                    </Text>
                  </View>
                  {!event.isFree && event.price && (
                    <Text className="text-xs font-semibold text-gray-900">${event.price}</Text>
                  )}
                </View>
                {event.place && (
                  <View className="flex-row items-center mt-2">
                    <Icon name="map-pin" size={12} color={iconColors.default} />
                    <Text className="text-xs text-gray-500 ml-1">{event.place.name}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      ) : (
        <View className="flex-1 items-center justify-center py-8">
          <Icon name="calendar" size={32} color={iconColors.muted} />
          <Text className="text-gray-500 mt-2">No events found for this date</Text>
        </View>
      )}
      </Animated.View>
    </PanGestureHandler>
  );
};

// Legend item as a modern, pill-shaped button with category icon (UI-only for now)
const LegendItem = ({ category, label }: { category: string; label: string }) => (
  <TouchableOpacity
    activeOpacity={0.85}
    className="flex-row items-center mr-2 px-3 py-1.5 rounded-full bg-white/95 border border-gray-100"
  >
    <View className="mr-1.5">
      <CategoryIcon
        category={category}
        size={14}
        color={getCategoryColor(category)}
      />
    </View>
    <Text className="text-xs text-gray-700">{label}</Text>
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
  const [selectedPlace, setSelectedPlace] = useState<Place | null>(null);
  const [remotePlaces, setRemotePlaces] = useState<MapPlace[]>([]);
  const [remoteEvents, setRemoteEvents] = useState<MapEvent[]>([]);
  const [isLoadingRemote, setIsLoadingRemote] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [activePlaceId, setActivePlaceId] = useState<string | null>(null);

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
    const newRegion = await geocodeAddress(searchQuery);

    if (newRegion) {
      setRegion(newRegion);
      mapRef.current?.animateToRegion(newRegion, 1000);
    } else {
      Alert.alert('Location not found', 'Try a different search term.');
    }

    setIsSearching(false);
  };

  // Load remote events and places whenever the region changes meaningfully.
  useEffect(() => {
    const loadData = async () => {
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

        setRemoteEvents(events);
        setRemotePlaces(places);
      } catch (error) {
        if (__DEV__) {
          console.log('Error loading map data', error);
        }
      } finally {
        setIsLoadingRemote(false);
      }
    };

    loadData();
  }, [region.latitude, region.longitude]);

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

  const handleMarkerPress = (place: Place) => {
    setSelectedPlace(place);
    setActivePlaceId(place.id);
    setModalVisible(true);
    mapRef.current?.animateToRegion(
      {
        latitude: place.location.latitude,
        longitude: place.location.longitude,
        latitudeDelta: 0.01,
        longitudeDelta: 0.01,
      },
      500
    );
  };

  const handleSavePlace = (placeId: string) => {
    console.log('Save place:', placeId);
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
          showsUserLocation={true}
          showsMyLocationButton={false}
          mapType="standard"
          scrollEnabled={true}
          zoomEnabled={true}
          pitchEnabled={true}
          rotateEnabled={true}
        >
          {(remotePlaces.length ? remotePlaces : mockPlaces).map((place) => (
            <CustomMarker
              key={place.id}
              place={place as unknown as Place}
              isActive={activePlaceId === place.id}
              onPress={() => handleMarkerPress(place as unknown as Place)}
            />
          ))}
        </MapView>

        <View className="absolute top-4 left-4 right-4">
          <View className="bg-white rounded-full px-4 py-3 flex-row items-center shadow-lg">
            <Icon name="search" size={20} color={iconColors.default} />
            <TextInput
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search places (e.g., San Francisco)"
              placeholderTextColor="#9ca3af"
              className="flex-1 text-base text-gray-900 ml-3"
              onSubmitEditing={handleSearch}
              returnKeyType="search"
            />
            {isSearching ? (
              <ActivityIndicator size="small" color={iconColors.active} />
            ) : (
              searchQuery.length > 0 && (
                <TouchableOpacity onPress={handleSearch} className="ml-2">
                  <Icon name="search" size={20} color={iconColors.active} />
                </TouchableOpacity>
              )
            )}
            <TouchableOpacity className="flex-row items-center bg-gray-100 px-3 py-1.5 rounded-full ml-2">
              <Icon name="sliders" size={16} color={iconColors.active} />
              <Text className="text-sm font-medium text-gray-700 ml-1">Filters</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View className="absolute top-20 left-4 right-4">
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            className="bg-white/90 rounded-full px-3 py-2"
          >
            <LegendItem category="bar" label="Bars" />
            <LegendItem category="restaurant" label="Food" />
            <LegendItem category="cafe" label="Cafés" />
            <LegendItem category="hotel" label="Hotels" />
            <LegendItem category="shopping" label="Markets" />
            <LegendItem category="gym" label="Gyms" />
            <LegendItem category="spa" label="Spas" />
            <LegendItem category="museum" label="Culture" />
          </ScrollView>
        </View>
      </View>

      {/* Find Me Button - Positioned relative to screen, above bottom sheet */}
      <TouchableOpacity
        onPress={handleRecenter}
        className="absolute bg-white w-12 h-12 rounded-full items-center justify-center shadow-lg"
        style={{ right: 16, bottom: 235 }}
      >
        <Icon name="navigation" size={22} color={iconColors.active} />
      </TouchableOpacity>

      {/* What's Happening Bottom Sheet */}
      <WhatsHappeningSheet region={region} visible={true} />

      {/* Business Detail Modal */}
      <BusinessDetailModal
        place={selectedPlace}
        visible={modalVisible}
        onClose={() => {
          setModalVisible(false);
          setSelectedPlace(null);
          setActivePlaceId(null);
        }}
        onSave={handleSavePlace}
      />
    </SafeAreaView>
  );
};
