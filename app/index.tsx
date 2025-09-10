// app/index.tsx - Root redirect file

import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Alert } from 'react-native';
import { ENV, hostedFunctionsBaseUrl } from '@/config/env';

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    // Redirect to main tabs immediately
    router.replace('/(tabs)');
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}