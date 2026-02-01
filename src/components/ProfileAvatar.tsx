import React, { useState } from 'react';
import { View, TouchableOpacity, Modal, Text, Alert, Platform } from 'react-native';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { Icon, iconColors } from './Icon';

interface ProfileAvatarProps {
  uri?: string;
  size?: number;
  onImageSelected?: (uri: string) => void;
  editable?: boolean;
  className?: string;
}

export const ProfileAvatar = ({
  uri,
  size = 80,
  onImageSelected,
  editable = false,
  className = '',
}: ProfileAvatarProps) => {
  const [modalVisible, setModalVisible] = useState(false);
  const [imageUri, setImageUri] = useState<string | undefined>(uri);

  const requestPermissions = async () => {
    if (Platform.OS !== 'web') {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Permission needed',
          'Sorry, we need camera roll permissions to upload photos!'
        );
        return false;
      }
    }
    return true;
  };

  const pickImageFromLibrary = async () => {
    const hasPermission = await requestPermissions();
    if (!hasPermission) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const selectedUri = result.assets[0].uri;
      setImageUri(selectedUri);
      onImageSelected?.(selectedUri);
      setModalVisible(false);
    }
  };

  const takePhoto = async () => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permission needed',
        'Sorry, we need camera permissions to take photos!'
      );
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets[0]) {
      const selectedUri = result.assets[0].uri;
      setImageUri(selectedUri);
      onImageSelected?.(selectedUri);
      setModalVisible(false);
    }
  };

  const handlePress = () => {
    if (editable) {
      setModalVisible(true);
    }
  };

  const handleRemovePhoto = () => {
    Alert.alert(
      'Remove Photo',
      'Are you sure you want to remove your profile photo?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => {
            setImageUri(undefined);
            onImageSelected?.('');
            setModalVisible(false);
          },
        },
      ]
    );
  };

  return (
    <>
      <TouchableOpacity
        onPress={handlePress}
        activeOpacity={editable ? 0.8 : 1}
        disabled={!editable}
        className={className}
      >
        <View
          className="rounded-full bg-gray-200 items-center justify-center overflow-hidden"
          style={{ width: size, height: size }}
        >
          {imageUri ? (
            <Image
              source={{ uri: imageUri }}
              style={{ width: size, height: size }}
              contentFit="cover"
            />
          ) : (
            <Icon name="user" size={size * 0.5} color={iconColors.default} />
          )}
        </View>
        {editable && (
          <View
            className="absolute bottom-0 right-0 bg-gray-900 rounded-full items-center justify-center border-2 border-white"
            style={{ width: size * 0.35, height: size * 0.35 }}
          >
            <Icon name="camera" size={size * 0.2} color="#FFFFFF" />
          </View>
        )}
      </TouchableOpacity>

      {/* Instagram-style Upload Modal */}
      <Modal
        visible={modalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          className="flex-1 bg-black/50 items-center justify-end"
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <TouchableOpacity
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
            className="w-full bg-white rounded-t-3xl"
          >
            {/* Handle bar */}
            <View className="items-center py-3">
              <View className="w-12 h-1 bg-gray-300 rounded-full" />
            </View>

            {/* Options */}
            <View className="pb-6">
              <TouchableOpacity
                onPress={takePhoto}
                className="flex-row items-center px-6 py-4 border-b border-gray-100"
              >
                <Icon name="camera" size={24} color={iconColors.active} />
                <Text className="text-lg font-normal text-gray-900 ml-4">Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={pickImageFromLibrary}
                className="flex-row items-center px-6 py-4 border-b border-gray-100"
              >
                <Icon name="image" size={24} color={iconColors.active} />
                <Text className="text-lg font-normal text-gray-900 ml-4">Choose from Library</Text>
              </TouchableOpacity>

              {imageUri && (
                <TouchableOpacity
                  onPress={handleRemovePhoto}
                  className="flex-row items-center px-6 py-4 border-b border-gray-100"
                >
                  <Icon name="trash" size={24} color="#EF4444" />
                  <Text className="text-lg font-normal text-red-500 ml-4">Remove Current Photo</Text>
                </TouchableOpacity>
              )}

              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                className="px-6 py-4"
              >
                <Text className="text-lg font-semibold text-gray-900 text-center">Cancel</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </>
  );
};



