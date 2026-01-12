import React, { useState } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Modal, Linking } from 'react-native';
import { Image } from 'expo-image';
import { Dimensions } from 'react-native';
import { Icon, iconColors } from '@/components/Icon';
import type { Event } from '@/types';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

interface EventDetailModalProps {
  event: Event | null;
  visible: boolean;
  onClose: () => void;
  onSave: (eventId: string) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  visible,
  onClose,
  onSave,
}) => {
  if (!event) return null;

  const [isSaved, setIsSaved] = useState(event.isSaved ?? false);

  const handleSave = () => {
    setIsSaved(!isSaved);
    onSave(event.id);
  };

  const handleGetTickets = () => {
    // In real implementation, this would link to ticket purchase
    Linking.openURL(`https://www.ticketmaster.com/event/${event.id}`).catch(err =>
      console.error('Failed to open URL:', err)
    );
  };

  const formatEventDate = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      weekday: 'long', 
      month: 'long', 
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatEventTime = (dateString: string): string => {
    const date = new Date(dateString);
    return date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
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
            {event.imageUrls && event.imageUrls[0] && (
              <Image
                source={{ uri: event.imageUrls[0] }}
                style={{ width: SCREEN_WIDTH, height: 250 }}
                contentFit="cover"
              />
            )}

            <View className="px-4 py-4">
              <View className="flex-row items-start justify-between mb-3">
                <View className="flex-1">
                  <Text className="text-2xl font-bold text-gray-900 mb-2">{event.title}</Text>
                  <View className="flex-row items-center flex-wrap gap-2">
                    <View className="px-3 py-1 bg-pink-100 rounded-full">
                      <Text className="text-xs font-medium text-pink-700 capitalize">
                        {event.category}
                      </Text>
                    </View>
                    {event.isFree && (
                      <View className="px-3 py-1 bg-green-100 rounded-full">
                        <Text className="text-xs font-medium text-green-700">FREE</Text>
                      </View>
                    )}
                  </View>
                </View>
                <TouchableOpacity onPress={onClose} className="p-2">
                  <Icon name="x" size={24} color={iconColors.active} />
                </TouchableOpacity>
              </View>

              {/* Date and Time */}
              <View className="mb-4 p-4 bg-gray-50 rounded-xl">
                <View className="flex-row items-center mb-2">
                  <Icon name="calendar" size={20} color={iconColors.active} />
                  <Text className="font-semibold text-gray-900 ml-2">When</Text>
                </View>
                <Text className="text-base text-gray-700 mb-1">
                  {formatEventDate(event.startDate)}
                </Text>
                <Text className="text-sm text-gray-600">
                  {formatEventTime(event.startDate)}
                  {event.endDate && ` - ${formatEventTime(event.endDate)}`}
                </Text>
              </View>

              {/* Price */}
              {!event.isFree && event.price && (
                <View className="mb-4 p-4 bg-gray-50 rounded-xl">
                  <View className="flex-row items-center mb-2">
                    <Icon name="dollar-sign" size={20} color={iconColors.active} />
                    <Text className="font-semibold text-gray-900 ml-2">Price</Text>
                  </View>
                  <Text className="text-2xl font-bold text-gray-900">${event.price}</Text>
                </View>
              )}

              {/* Description */}
              {event.description && (
                <Text className="text-base text-gray-700 mb-4 leading-6">
                  {event.description}
                </Text>
              )}

              {/* Location */}
              <View className="flex-row items-start mb-4 p-4 bg-gray-50 rounded-xl">
                <Icon name="map-pin" size={20} color={iconColors.active} />
                <View className="ml-3 flex-1">
                  {event.place?.name && (
                    <Text className="text-base font-medium text-gray-900 mb-1">
                      {event.place.name}
                    </Text>
                  )}
                  <Text className="text-sm text-gray-600">{event.location.address}</Text>
                  {event.location.city && (
                    <Text className="text-sm text-gray-500">
                      {event.location.city}, {event.location.state}
                    </Text>
                  )}
                </View>
              </View>

              {/* Attendee Count */}
              {event.attendeeCount > 0 && (
                <View className="flex-row items-center mb-4">
                  <Icon name="users" size={18} color={iconColors.default} />
                  <Text className="text-sm text-gray-600 ml-2">
                    {event.attendeeCount} people attending
                    {event.maxAttendees && ` • ${event.maxAttendees} max`}
                  </Text>
                </View>
              )}

              {/* Tags */}
              <View className="flex-row flex-wrap gap-2 mb-6">
                {event.tags.map((tag) => (
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
              <TouchableOpacity 
                className="flex-1 py-3 rounded-xl items-center bg-primary-500"
                onPress={handleGetTickets}
              >
                <Icon name="ticket" size={20} color="#FFFFFF" />
                <Text className="text-sm font-semibold text-white mt-1">Get Tickets</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};
