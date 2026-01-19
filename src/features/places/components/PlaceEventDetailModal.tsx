import React, { useMemo } from 'react';
import { Modal, View, Text, ScrollView, TouchableOpacity, Linking, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Image } from 'expo-image';
import { Feather, MaterialCommunityIcons } from '@expo/vector-icons';
import { Icon, iconColors } from '@/components/Icon';
import { useSavedStore, type SavedEntity } from '@/stores/useSavedStore';

type Props = {
  visible: boolean;
  item: SavedEntity | null;
  onClose: () => void;
};

function formatDistance(distanceMeters?: number): string | null {
  if (typeof distanceMeters !== 'number' || !Number.isFinite(distanceMeters)) return null;
  if (distanceMeters < 1000) return `${Math.round(distanceMeters)} m`;
  const km = distanceMeters / 1000;
  return `${km.toFixed(km < 10 ? 1 : 0)} km`;
}

function formatEventDateTime(startDate?: string): string | null {
  if (!startDate) return null;
  const d = new Date(startDate);
  if (!Number.isFinite(d.getTime())) return null;
  return d.toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
}

function priceLevelText(level?: number): string | null {
  if (typeof level !== 'number' || !Number.isFinite(level) || level <= 0) return null;
  return '$'.repeat(Math.min(4, Math.max(1, Math.round(level))));
}

export const PlaceEventDetailModal = ({ visible, item, onClose }: Props) => {
  const isSaved = useSavedStore((s) => (item ? s.isSaved(item.id) : false));
  const toggleSave = useSavedStore((s) => s.toggleSave);
  const thumbsUp = useSavedStore((s) => s.thumbsUp);
  const thumbsDown = useSavedStore((s) => s.thumbsDown);
  const thumbsUpCount = useSavedStore((s) => (item ? (s.thumbsUpCountById[item.id] ?? 0) : 0));
  const myVote = useSavedStore((s) => (item ? (s.myVoteById[item.id] ?? 'none') : 'none'));

  const isPlace = item?.type === 'place';

  const distanceText = useMemo(() => formatDistance(item?.distanceMeters), [item?.distanceMeters]);
  const eventDateTime = useMemo(() => formatEventDateTime(item?.startDate), [item?.startDate]);
  const priceText = useMemo(() => (isPlace ? priceLevelText(item?.priceLevel) : null), [isPlace, item?.priceLevel]);

  const openMaps = () => {
    if (!item) return;
    const { latitude, longitude } = item.location;
    const label = encodeURIComponent(item.title);
    const url =
      Platform.OS === 'ios'
        ? `http://maps.apple.com/?ll=${latitude},${longitude}&q=${label}`
        : `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
    Linking.openURL(url);
  };

  const openExternal = () => {
    if (!item) return;
    if (item.url) {
      Linking.openURL(item.url);
    } else {
      openMaps();
    }
  };

  if (!item) {
    return (
      <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
        <View className="flex-1 bg-black/40" />
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <SafeAreaView className="flex-1 bg-white" edges={['top', 'bottom']}>
        {/* Header */}
        <View className="flex-row items-center justify-between px-4 py-3 border-b border-gray-100">
          <TouchableOpacity onPress={onClose} className="flex-row items-center">
            <Icon name="x" size={20} color={iconColors.active} />
            <Text className="ml-2 text-base font-semibold text-gray-900">Back</Text>
          </TouchableOpacity>
          <View className="flex-row items-center gap-2">
            <View className="bg-gray-100 px-3 py-1 rounded-full">
              <Text className="text-xs font-semibold text-gray-700 capitalize">{item.type}</Text>
            </View>
          </View>
        </View>

        <ScrollView className="flex-1" showsVerticalScrollIndicator={false}>
          {/* Hero */}
          {item.imageUrl ? (
            <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: 260 }} contentFit="cover" />
          ) : (
            <View className="w-full h-[260px] bg-gray-100 items-center justify-center">
              <Icon name="image" size={32} color={iconColors.muted} />
            </View>
          )}

          <View className="px-4 pt-4 pb-2">
            <Text className="text-2xl font-bold text-gray-900">{item.title}</Text>

            <View className="flex-row items-center flex-wrap mt-2">
              {!!item.category && (
                <View className="bg-gray-100 px-3 py-1 rounded-full mr-2 mb-2">
                  <Text className="text-xs font-semibold text-gray-700">{item.category}</Text>
                </View>
              )}

              {distanceText && (
                <View className="flex-row items-center mr-3 mb-2">
                  <Icon name="map-pin" size={14} color={iconColors.default} />
                  <Text className="text-sm text-gray-600 ml-1">{distanceText}</Text>
                </View>
              )}

              {!isPlace && eventDateTime && (
                <View className="flex-row items-center mb-2">
                  <Icon name="calendar" size={14} color={iconColors.default} />
                  <Text className="text-sm text-gray-600 ml-1">{eventDateTime}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Action Row */}
          <View className="px-4 py-3">
            <View className="flex-row gap-3">
              <TouchableOpacity
                onPress={() => toggleSave(item)}
                className={`flex-1 py-3 rounded-2xl items-center justify-center flex-row ${
                  isSaved ? 'bg-gray-900' : 'bg-gray-100'
                }`}
              >
                <Icon name="bookmark" size={18} color={isSaved ? '#FFFFFF' : iconColors.active} />
                <Text className={`ml-2 text-sm font-bold ${isSaved ? 'text-white' : 'text-gray-900'}`}>
                  Save
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => thumbsUp(item.id)}
                className="flex-1 py-3 rounded-2xl items-center justify-center flex-row bg-gray-100"
              >
                <Feather name="thumbs-up" size={18} color={myVote === 'up' ? '#111827' : '#6B7280'} />
                <Text className="ml-2 text-sm font-bold text-gray-900">{thumbsUpCount}</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={() => thumbsDown(item.id)}
                className="flex-1 py-3 rounded-2xl items-center justify-center flex-row bg-gray-100"
              >
                <Feather name="thumbs-down" size={18} color={myVote === 'down' ? '#111827' : '#6B7280'} />
                <Text className="ml-2 text-sm font-bold text-gray-900">Private</Text>
              </TouchableOpacity>
            </View>

            {!isPlace && (
              <View className="mt-3">
                <TouchableOpacity
                  onPress={openExternal}
                  className="py-3 rounded-2xl items-center justify-center flex-row bg-gray-900"
                >
                  <MaterialCommunityIcons name="ticket-confirmation" size={20} color="#FFFFFF" />
                  <Text className="ml-2 text-sm font-bold text-white">Buy Tickets</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>

          {/* Core Info */}
          <View className="px-4 pb-4">
            <Text className="text-sm font-bold text-gray-900 mb-2">Info</Text>

            {!!item.address && (
              <TouchableOpacity onPress={openMaps} className="p-4 bg-gray-50 rounded-2xl mb-3">
                <View className="flex-row items-start">
                  <Icon name="map-pin" size={18} color="#3B82F6" />
                  <View className="ml-3 flex-1">
                    <Text className="text-xs text-gray-500 mb-1">Address</Text>
                    <Text className="text-base text-gray-900">{item.address}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            )}

            <View className="p-4 bg-gray-50 rounded-2xl mb-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-xs text-gray-500">Category</Text>
                <Text className="text-sm font-semibold text-gray-900">{item.category || '—'}</Text>
              </View>

              {isPlace && (
                <>
                  <View className="h-px bg-gray-100 my-3" />
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-gray-500">Price</Text>
                    <Text className="text-sm font-semibold text-gray-900">{priceText || '—'}</Text>
                  </View>
                  <View className="h-px bg-gray-100 my-3" />
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-gray-500">Rating</Text>
                    <View className="flex-row items-center">
                      <Feather name="star" size={14} color="#F59E0B" />
                      <Text className="ml-1 text-sm font-semibold text-gray-900">
                        {typeof item.rating === 'number' ? item.rating.toFixed(1) : '—'}
                      </Text>
                      {!!item.reviewCount && (
                        <Text className="ml-2 text-sm text-gray-600">({item.reviewCount})</Text>
                      )}
                    </View>
                  </View>
                  <View className="h-px bg-gray-100 my-3" />
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-gray-500">Open now</Text>
                    <Text className="text-sm font-semibold text-gray-900">
                      {typeof item.isOpenNow === 'boolean' ? (item.isOpenNow ? 'Open' : 'Closed') : '—'}
                    </Text>
                  </View>
                </>
              )}

              {!isPlace && (
                <>
                  <View className="h-px bg-gray-100 my-3" />
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-gray-500">Price</Text>
                    <Text className="text-sm font-semibold text-gray-900">
                      {item.isFree ? 'Free' : item.priceMin ? `$${item.priceMin}${item.priceMax ? `–$${item.priceMax}` : ''}` : '—'}
                    </Text>
                  </View>
                  <View className="h-px bg-gray-100 my-3" />
                  <View className="flex-row items-center justify-between">
                    <Text className="text-xs text-gray-500">Venue</Text>
                    <Text className="text-sm font-semibold text-gray-900">{item.venueName || '—'}</Text>
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Social Context */}
          <View className="px-4 pb-4">
            <Text className="text-sm font-bold text-gray-900 mb-2">Social</Text>
            <View className="p-4 bg-gray-50 rounded-2xl">
              <Text className="text-sm text-gray-700">
                Friends who saved this: 0
              </Text>
              <Text className="text-sm text-gray-700 mt-2">
                Friends who {isPlace ? 'went here' : 'are going'}: 0
              </Text>
            </View>
          </View>

          {/* Associations */}
          <View className="px-4 pb-6">
            <Text className="text-sm font-bold text-gray-900 mb-2">Associated</Text>
            <View className="p-4 bg-gray-50 rounded-2xl">
              <Text className="text-sm text-gray-700">Linked group chats: 0</Text>
              <Text className="text-sm text-gray-500 mt-2">No linked chats</Text>
            </View>
          </View>
        </ScrollView>

        {/* Footer Actions */}
        <View className="px-4 pb-6 pt-3 bg-white border-t border-gray-100">
          <View className="flex-row gap-3">
            <TouchableOpacity onPress={openMaps} className="flex-1 py-4 rounded-2xl items-center bg-gray-100">
              <Icon name="navigation" size={20} color={iconColors.active} />
              <Text className="text-sm font-bold text-gray-900 mt-1">Open in Maps</Text>
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => {}}
              className="flex-1 py-4 rounded-2xl items-center bg-gray-100"
              activeOpacity={1}
            >
              <Icon name="share" size={20} color={iconColors.muted} />
              <Text className="text-sm font-bold text-gray-500 mt-1">Share to Chat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </Modal>
  );
};

