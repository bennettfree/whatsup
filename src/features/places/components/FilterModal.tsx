import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, TextInput } from 'react-native';
import { Icon, iconColors } from '@/components/Icon';
import { Feather } from '@expo/vector-icons';

export interface FilterOptions {
  venueCategories: string[];
  eventCategories: string[];
  priceLevel: number[]; // [1,2,3,4]
  dateRange: 'today' | 'weekend' | 'month' | 'all';
  distance: number; // in miles
  openNow?: boolean; // Show only open places
  searchKeyword?: string; // Search within results
}

interface FilterModalProps {
  visible: boolean;
  currentFilters: FilterOptions;
  onClose: () => void;
  onApply: (filters: FilterOptions) => void;
}

const VENUE_CATEGORIES = [
  { id: 'bar', label: 'Bars', icon: 'glass-cocktail' },
  { id: 'restaurant', label: 'Restaurants', icon: 'silverware-fork-knife' },
  { id: 'cafe', label: 'Cafés', icon: 'coffee' },
  { id: 'hotel', label: 'Hotels', icon: 'bed' },
  { id: 'shopping', label: 'Shopping', icon: 'shopping-bag' },
  { id: 'gym', label: 'Gyms', icon: 'dumbbell' },
  { id: 'spa', label: 'Spas', icon: 'spa' },
  { id: 'museum', label: 'Museums', icon: 'palette' },
  { id: 'park', label: 'Parks', icon: 'sun' },
];

const EVENT_CATEGORIES = [
  { id: 'music', label: 'Music', icon: 'music' },
  { id: 'sports', label: 'Sports', icon: 'football' },
  { id: 'art', label: 'Arts', icon: 'palette' },
  { id: 'nightlife', label: 'Nightlife', icon: 'moon' },
  { id: 'festival', label: 'Festivals', icon: 'flag' },
  { id: 'food', label: 'Food & Drink', icon: 'utensils' },
  { id: 'workshop', label: 'Workshops', icon: 'book' },
];

const PRICE_LEVELS = [
  { value: 1, label: '$' },
  { value: 2, label: '$$' },
  { value: 3, label: '$$$' },
  { value: 4, label: '$$$$' },
];

const DISTANCE_OPTIONS = [
  { value: 1, label: '1 mi' },
  { value: 3, label: '3 mi' },
  { value: 5, label: '5 mi' },
  { value: 10, label: '10 mi' },
  { value: 25, label: '25 mi' },
];

const DATE_RANGES = [
  { value: 'today' as const, label: 'Today' },
  { value: 'weekend' as const, label: 'This Weekend' },
  { value: 'month' as const, label: 'This Month' },
  { value: 'all' as const, label: 'All Dates' },
];

export const FilterModal: React.FC<FilterModalProps> = ({
  visible,
  currentFilters,
  onClose,
  onApply,
}) => {
  const [tempFilters, setTempFilters] = useState<FilterOptions>(currentFilters);

  // Reset temp filters when modal opens (don't persist unsaved changes)
  React.useEffect(() => {
    if (visible) {
      setTempFilters(currentFilters);
    }
  }, [visible, currentFilters]);

  const toggleVenueCategory = (category: string) => {
    setTempFilters(prev => ({
      ...prev,
      venueCategories: prev.venueCategories.includes(category)
        ? prev.venueCategories.filter(c => c !== category)
        : [...prev.venueCategories, category],
    }));
  };

  const toggleEventCategory = (category: string) => {
    setTempFilters(prev => ({
      ...prev,
      eventCategories: prev.eventCategories.includes(category)
        ? prev.eventCategories.filter(c => c !== category)
        : [...prev.eventCategories, category],
    }));
  };

  const togglePriceLevel = (level: number) => {
    setTempFilters(prev => ({
      ...prev,
      priceLevel: prev.priceLevel.includes(level)
        ? prev.priceLevel.filter(p => p !== level)
        : [...prev.priceLevel, level],
    }));
  };

  const handleApply = () => {
    onApply(tempFilters);
    onClose();
  };

  const handleClear = () => {
    const clearedFilters: FilterOptions = {
      venueCategories: [],
      eventCategories: [],
      priceLevel: [1, 2, 3, 4],
      dateRange: 'all',
      distance: 10,
      openNow: false,
      searchKeyword: '',
    };
    setTempFilters(clearedFilters);
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <TouchableOpacity 
        activeOpacity={1}
        className="flex-1 bg-black/50 justify-end"
        onPress={onClose}
      >
        <TouchableOpacity 
          activeOpacity={1}
          onPress={(e) => e.stopPropagation()}
          className="max-h-[85%]"
        >
          <View className="bg-white rounded-t-3xl" style={{ maxHeight: '85%', height: 'auto' }}>
          {/* Header */}
          <View className="px-4 py-4 border-b border-gray-100">
            <View className="flex-row items-center justify-between mb-2">
              <Text className="text-2xl font-bold text-gray-900">Filters</Text>
              <TouchableOpacity onPress={onClose} className="p-2">
                <Icon name="x" size={24} color={iconColors.active} />
              </TouchableOpacity>
            </View>
            <Text className="text-sm text-gray-500">Refine your search results</Text>
          </View>

          <ScrollView 
            className="flex-1" 
            showsVerticalScrollIndicator={false}
            style={{ flexGrow: 0, flexShrink: 1 }}
            contentContainerStyle={{ paddingBottom: 20 }}
          >
            {/* Search Within Results */}
            <View className="px-4 py-4 border-b border-gray-100">
              <View className="flex-row items-center mb-3">
                <Icon name="search" size={16} color={iconColors.active} />
                <Text className="text-base font-bold text-gray-900 ml-2">Search</Text>
              </View>
              <View className="flex-row items-center bg-gray-50 rounded-xl px-4 py-3">
                <Icon name="search" size={16} color={iconColors.default} />
                <TextInput
                  value={tempFilters.searchKeyword || ''}
                  onChangeText={(text) => setTempFilters(prev => ({ ...prev, searchKeyword: text }))}
                  placeholder="Search by name or keyword..."
                  placeholderTextColor="#9CA3AF"
                  className="flex-1 text-base text-gray-900 ml-3"
                />
              </View>
            </View>

            {/* Venue Categories */}
            <View className="px-4 py-4 border-b border-gray-100">
              <View className="flex-row items-center mb-3">
                <Icon name="map-pin" size={16} color={iconColors.active} />
                <Text className="text-base font-bold text-gray-900 ml-2">Places</Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {VENUE_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => toggleVenueCategory(cat.id)}
                    className={`px-4 py-2 rounded-full border ${
                      tempFilters.venueCategories.includes(cat.id)
                        ? 'bg-gray-900 border-gray-900'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        tempFilters.venueCategories.includes(cat.id)
                          ? 'text-white'
                          : 'text-gray-700'
                      }`}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Event Categories */}
            <View className="px-4 py-4 border-b border-gray-100">
              <View className="flex-row items-center mb-3">
                <Icon name="calendar" size={16} color={iconColors.active} />
                <Text className="text-base font-bold text-gray-900 ml-2">Events</Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {EVENT_CATEGORIES.map(cat => (
                  <TouchableOpacity
                    key={cat.id}
                    onPress={() => toggleEventCategory(cat.id)}
                    className={`px-4 py-2 rounded-full border ${
                      tempFilters.eventCategories.includes(cat.id)
                        ? 'bg-gray-900 border-gray-900'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        tempFilters.eventCategories.includes(cat.id)
                          ? 'text-white'
                          : 'text-gray-700'
                      }`}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Price Level */}
            <View className="px-4 py-4 border-b border-gray-100">
              <View className="flex-row items-center mb-3">
                <Icon name="dollar-sign" size={16} color={iconColors.active} />
                <Text className="text-base font-bold text-gray-900 ml-2">Price Range</Text>
              </View>
              <View className="flex-row gap-3">
                {PRICE_LEVELS.map(price => (
                  <TouchableOpacity
                    key={price.value}
                    onPress={() => togglePriceLevel(price.value)}
                    className={`flex-1 py-3 rounded-xl border ${
                      tempFilters.priceLevel.includes(price.value)
                        ? 'bg-gray-900 border-gray-900'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text
                      className={`text-center text-sm font-semibold ${
                        tempFilters.priceLevel.includes(price.value)
                          ? 'text-white'
                          : 'text-gray-700'
                      }`}
                    >
                      {price.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Date Range for Events */}
            <View className="px-4 py-4 border-b border-gray-100">
              <View className="flex-row items-center mb-3">
                <Icon name="calendar" size={16} color={iconColors.active} />
                <Text className="text-base font-bold text-gray-900 ml-2">When</Text>
              </View>
              <View className="flex-row flex-wrap gap-2">
                {DATE_RANGES.map(date => (
                  <TouchableOpacity
                    key={date.value}
                    onPress={() => setTempFilters(prev => ({ ...prev, dateRange: date.value }))}
                    className={`px-4 py-2 rounded-full border ${
                      tempFilters.dateRange === date.value
                        ? 'bg-gray-900 border-gray-900'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text
                      className={`text-sm font-medium ${
                        tempFilters.dateRange === date.value
                          ? 'text-white'
                          : 'text-gray-700'
                      }`}
                    >
                      {date.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Distance */}
            <View className="px-4 py-4 border-b border-gray-100">
              <View className="flex-row items-center justify-between mb-3">
                <View className="flex-row items-center">
                  <Icon name="navigation" size={16} color={iconColors.active} />
                  <Text className="text-base font-bold text-gray-900 ml-2">Distance</Text>
                </View>
                <Text className="text-sm font-semibold text-primary-500">{tempFilters.distance} mi</Text>
              </View>
              <View className="flex-row gap-2 mb-2">
                {DISTANCE_OPTIONS.map(dist => (
                  <TouchableOpacity
                    key={dist.value}
                    onPress={() => setTempFilters(prev => ({ ...prev, distance: dist.value }))}
                    className={`flex-1 py-2.5 rounded-xl border ${
                      tempFilters.distance === dist.value
                        ? 'bg-gray-900 border-gray-900'
                        : 'bg-white border-gray-300'
                    }`}
                  >
                    <Text
                      className={`text-center text-sm font-semibold ${
                        tempFilters.distance === dist.value
                          ? 'text-white'
                          : 'text-gray-700'
                      }`}
                    >
                      {dist.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              {/* Visual distance indicator */}
              <View className="flex-row items-center mt-2">
                <View className="flex-1 h-1.5 bg-gray-200 rounded-full overflow-hidden">
                  <View 
                    className="h-full bg-primary-500 rounded-full"
                    style={{ width: `${(tempFilters.distance / 25) * 100}%` }}
                  />
                </View>
              </View>
            </View>

            {/* Open Now Toggle (Places) */}
            <View className="px-4 py-4">
              <View className="flex-row items-center justify-between">
                <View>
                  <Text className="text-base font-bold text-gray-900 mb-1">Open Now</Text>
                  <Text className="text-sm text-gray-500">Show only open venues</Text>
                </View>
                <TouchableOpacity
                  onPress={() => setTempFilters(prev => ({ ...prev, openNow: !prev.openNow }))}
                  className={`w-14 h-8 rounded-full ${
                    tempFilters.openNow ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                >
                  <View 
                    className={`w-6 h-6 rounded-full bg-white mt-1 ${
                      tempFilters.openNow ? 'ml-7' : 'ml-1'
                    }`}
                    style={{ shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 2, elevation: 2 }}
                  />
                </TouchableOpacity>
              </View>
            </View>
          </ScrollView>

          {/* Footer Actions */}
          <View className="px-4 py-4 border-t border-gray-100">
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={handleClear}
                className="flex-1 py-3.5 rounded-2xl bg-gray-100 active:bg-gray-200"
              >
                <Text className="text-center text-base font-semibold text-gray-900">Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={handleApply}
                className="flex-1 py-3.5 rounded-2xl bg-gray-900 active:bg-gray-800"
                style={{ 
                  shadowColor: '#000',
                  shadowOffset: { width: 0, height: 4 },
                  shadowOpacity: 0.3,
                  shadowRadius: 8,
                  elevation: 5
                }}
              >
                <View className="flex-row items-center justify-center">
                  <Icon name="check" size={18} color="#FFFFFF" />
                  <Text className="text-center text-base font-bold text-white ml-2">Save Filters</Text>
                </View>
              </TouchableOpacity>
            </View>
          </View>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};
