// app/index.tsx - Root redirect file with session tracking
import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import analytics from '../src/utils/analytics'
import 'react-native-get-random-values'

export default function Index() {
  const router = useRouter();

  useEffect(() => {
    const initializeAnalytics = async () => {
      await analytics.init()
      router.replace('/(tabs)');
    }
    
    initializeAnalytics()

    // Track app termination when component unmounts
    return () => {
      analytics.logAppTerminated()
    }
  }, []);

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
      <ActivityIndicator size="large" color="#007AFF" />
    </View>
  );
}