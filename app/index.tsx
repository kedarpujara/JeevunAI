// app/index.tsx - Root redirect file

import { useRouter } from 'expo-router';
import { useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { Alert } from 'react-native';
import { ENV, hostedFunctionsBaseUrl } from '@/config/env';

// Add this in useEffect or component mount:
// useEffect(() => {
//   const envDebug = {
//     SUPABASE_URL: ENV.SUPABASE_URL,
//     SUPABASE_ANON_KEY: ENV.SUPABASE_ANON_KEY ? 'EXISTS' : 'MISSING',
//     USE_LOCAL_FUNCTIONS: ENV.USE_LOCAL_FUNCTIONS,
//     hostedFunctionsBaseUrl,
//   };
  
//   console.log('ENV Debug:', envDebug);
//   Alert.alert('ENV Debug', JSON.stringify(envDebug, null, 2));
// }, []);

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