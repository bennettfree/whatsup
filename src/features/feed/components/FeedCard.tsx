import React, { useState } from 'react';
import { View, Text, TouchableOpacity, Dimensions } from 'react-native';
import { Image } from 'expo-image';
import { Icon, iconColors } from '@/components/Icon';
import type { Place } from '@/types';
import { formatNumber } from '@/utils/mockData';

interface FeedCardProps {
  place: Place;
  onPress?: () => void;
  onLike?: () => void;
  onSave?: () => void;
  onShare?: () => void;
  onComment?: () => void;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const FeedCard = ({
  place,
  onPress,
  onLike,
  onSave,
  onShare,
  onComment,
}: FeedCardProps) => {
  const [isLiked, setIsLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(place.isSaved ?? false);

  const handleLike = () => {
    setIsLiked(!isLiked);
    onLike?.();
  };

  const handleSave = () => {
    setIsSaved(!isSaved);
    onSave?.();
  };

  return (
    <View className="bg-white mb-2">
      {/* Header */}
      <TouchableOpacity
        onPress={onPress}
        className="flex-row items-center px-3 py-2"
      >
        <Image
          source={{ uri: place.imageUrls[0] }}
          className="w-8 h-8 rounded-full bg-gray-200"
          contentFit="cover"
        />
        <View className="ml-3 flex-1">
          <Text className="font-semibold text-gray-900">{place.name}</Text>
          <View className="flex-row items-center">
            <Icon name="map-pin" size={12} color={iconColors.default} />
            <Text className="text-xs text-gray-500 ml-1">{place.location.city}</Text>
          </View>
        </View>
        <TouchableOpacity className="p-2">
          <Icon name="more-horizontal" size={20} color={iconColors.active} />
        </TouchableOpacity>
      </TouchableOpacity>

      {/* Image */}
      <TouchableOpacity onPress={onPress} activeOpacity={0.95}>
        <Image
          source={{ uri: place.imageUrls[0] }}
          style={{ width: SCREEN_WIDTH, height: SCREEN_WIDTH }}
          contentFit="cover"
          transition={200}
        />
      </TouchableOpacity>

      {/* Action Buttons */}
      <View className="flex-row items-center justify-between px-4 py-3">
        <View className="flex-row items-center gap-5">
          <TouchableOpacity onPress={handleLike}>
            <Icon
              name="heart"
              size={24}
              color={isLiked ? '#E25C50' : iconColors.active}
            />
          </TouchableOpacity>
          <TouchableOpacity onPress={onComment}>
            <Icon name="message-circle" size={24} color={iconColors.active} />
          </TouchableOpacity>
          <TouchableOpacity onPress={onShare}>
            <Icon name="send" size={24} color={iconColors.active} />
          </TouchableOpacity>
        </View>
        <TouchableOpacity onPress={handleSave}>
          <Icon
            name="bookmark"
            size={24}
            color={isSaved ? iconColors.active : iconColors.active}
          />
        </TouchableOpacity>
      </View>

      {/* Likes & Rating */}
      <View className="px-4 pb-1">
        <View className="flex-row items-center">
          <Text className="font-semibold text-gray-900">
            {formatNumber(place.reviewCount)} reviews
          </Text>
          <Text className="mx-2 text-gray-300">•</Text>
          <View className="flex-row items-center">
            <Icon name="star" size={14} color="#FBBF24" />
            <Text className="text-gray-900 ml-1">{place.rating.toFixed(1)}</Text>
          </View>
          {place.aiScore && (
            <>
              <Text className="mx-2 text-gray-300">•</Text>
              <View className="flex-row items-center">
                <Icon name="zap" size={14} color={iconColors.primary} />
                <Text className="text-gray-600 ml-1">{place.aiScore}% match</Text>
              </View>
            </>
          )}
        </View>
      </View>

      {/* Description */}
      <View className="px-4 pb-3">
        <Text className="text-gray-900" numberOfLines={2}>
          <Text className="font-semibold">{place.name}</Text>
          {' '}{place.description}
        </Text>
        <TouchableOpacity onPress={onPress}>
          <Text className="text-gray-400 mt-1">View all {place.reviewCount} reviews</Text>
        </TouchableOpacity>
      </View>

      {/* Tags */}
      <View className="flex-row flex-wrap px-4 pb-3 gap-1">
        {place.tags.slice(0, 3).map((tag) => (
          <View key={tag} className="bg-gray-100 px-2 py-1 rounded-full">
            <Text className="text-xs text-gray-600">{tag}</Text>
          </View>
        ))}
      </View>
    </View>
  );
};
