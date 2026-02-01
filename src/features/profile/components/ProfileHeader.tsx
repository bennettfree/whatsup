import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { ProfileAvatar } from '@/components/ProfileAvatar';
import { useProfileStore } from '@/stores';
import type { User } from '@/types';

interface ProfileHeaderProps {
  user: User;
  isOwnProfile?: boolean;
  interests?: string[];
}

export const ProfileHeader = ({
  user,
  isOwnProfile = true,
  interests,
}: ProfileHeaderProps) => {
  const { profileImageUri, setProfileImage } = useProfileStore();
  const [showFullBio, setShowFullBio] = React.useState(false);

  // Use uploaded image if available, otherwise use user's avatarUrl
  const displayImage = profileImageUri || user.avatarUrl;

  const bioLines = user.bio ? user.bio.split('\n') : [];
  const hasExtraBioLines = bioLines.length > 2;
  const visibleBio =
    showFullBio || !hasExtraBioLines
      ? user.bio
      : bioLines.slice(0, 2).join('\n');

  return (
    <View className="px-4">
      {/* Inline identity section, integrated with background */}
      <View className="flex-row items-start">
        <View className="flex-1">
          {/* Name */}
          <Text
            className="text-lg font-semibold text-gray-900"
            numberOfLines={1}
          >
            {user.displayName}
          </Text>

          {/* Username */}
          <Text
            className="mt-1 text-sm text-gray-500"
            numberOfLines={1}
            ellipsizeMode="tail"
          >
            @{user.username}
          </Text>

          {/* Bio */}
          {user.bio ? (
            <Text
              className="mt-2 text-sm text-gray-700"
              numberOfLines={showFullBio ? 0 : 2}
              style={{ lineHeight: 20 }}
            >
              {visibleBio}
            </Text>
          ) : null}

          {hasExtraBioLines && !showFullBio ? (
            <TouchableOpacity
              onPress={() => setShowFullBio(true)}
              activeOpacity={0.8}
              className="mt-1"
            >
              <Text className="text-xs font-semibold text-gray-500">
                More
              </Text>
            </TouchableOpacity>
          ) : null}
        </View>

        <View className="ml-4">
          <ProfileAvatar
          uri={displayImage}
          size={88}
          editable={isOwnProfile}
          onImageSelected={(uri) => setProfileImage(uri || null)}
          />
        </View>
      </View>

      {/* Interests chips aligned with content */}
      {interests && interests.length > 0 && (
        <View className="mt-3 flex-row flex-wrap">
          {interests.map((interest) => (
            <View
              key={interest}
              className="px-3 py-1 rounded-full bg-gray-50 border border-gray-100 mr-2 mb-2"
            >
              <Text className="text-xs text-gray-600">{interest}</Text>
            </View>
          ))}
        </View>
      )}
    </View>
  );
};
