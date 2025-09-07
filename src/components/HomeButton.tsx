// src/components/HomeButton.tsx
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import React from 'react';
import { TouchableOpacity } from 'react-native';

export const HomeButton = () => {
  const router = useRouter();
  return (
    <TouchableOpacity
      onPress={() => router.replace('/history')}
      style={{ paddingHorizontal: 12, paddingVertical: 8 }}
      hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
    >
      <Ionicons name="home-outline" size={22} color="#007AFF" />
    </TouchableOpacity>
  );
};