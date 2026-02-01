import React from 'react';
import { View, TouchableOpacity, Dimensions, Text } from 'react-native';
import { Image } from 'expo-image';

interface Post {
  id: string;
  imageUrl: string;
  likes?: number;
  comments?: number;
}

interface PhotoGridProps {
  posts: Post[];
  onPostPress?: (post: Post) => void;
  numColumns?: number;
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');

export const PhotoGrid = ({
  posts,
  onPostPress,
  numColumns = 3,
}: PhotoGridProps) => {
  const gap = 2;
  const itemWidth = (SCREEN_WIDTH - gap * (numColumns - 1)) / numColumns;

  if (posts.length === 0) {
    return (
      <View className="flex-1 items-center justify-center py-20">
        <Text className="text-4xl mb-4">📷</Text>
        <Text className="text-gray-500 text-center">No posts yet</Text>
      </View>
    );
  }

  return (
    <View className="flex-row flex-wrap bg-white">
      {posts.map((post, index) => (
        <TouchableOpacity
          key={post.id}
          onPress={() => onPostPress?.(post)}
          activeOpacity={0.9}
          style={{
            width: itemWidth,
            height: itemWidth,
            marginRight: (index + 1) % numColumns === 0 ? 0 : gap,
            marginBottom: gap,
          }}
        >
          <Image
            source={{ uri: post.imageUrl }}
            style={{ width: '100%', height: '100%' }}
            contentFit="cover"
            transition={200}
          />
        </TouchableOpacity>
      ))}
    </View>
  );
};



