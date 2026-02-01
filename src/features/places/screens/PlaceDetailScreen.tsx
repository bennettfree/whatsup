import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Icon, iconColors } from '@/components/Icon';
import { mockPlaces } from '@/utils/mockData';
import type { RootStackScreenProps } from '@/navigation/types';

type Props = RootStackScreenProps<'PlaceDetail'>;

const PlaceDetailScreen: React.FC<Props> = ({ route, navigation }) => {
  const { placeId } = route.params;

  const place = mockPlaces.find((p) => p.id === placeId);
  const title = place?.name ?? 'Place details coming soon';

  return (
    <SafeAreaView className="flex-1 bg-white" edges={['top']}>
      {/* Header with back button */}
      <View className="flex-row items-center px-4 py-3 border-b border-gray-100">
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          activeOpacity={0.8}
          className="mr-3"
        >
          <Icon name="chevron-left" size={20} color={iconColors.active} />
        </TouchableOpacity>
        <Text
          className="text-base font-semibold text-gray-900"
          numberOfLines={1}
        >
          {place ? place.name : 'Place'}
        </Text>
      </View>

      {/* Body */}
      <View className="flex-1 items-center justify-center px-8">
        <Text className="text-lg font-semibold text-gray-900 text-center mb-2">
          {title}
        </Text>
        {!place && (
          <Text className="text-sm text-gray-500 text-center">
            We&apos;ll show full details for this spot soon.
          </Text>
        )}
      </View>
    </SafeAreaView>
  );
};

export default PlaceDetailScreen;
