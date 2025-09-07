import { supabase } from '@/services/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const clearAllAuthData = async () => {
  try {
    // Clear Supabase session
    await supabase.auth.signOut();
    
    // Clear all AsyncStorage (where Supabase stores tokens)
    await AsyncStorage.clear();
    
    // Clear any other cached data
    const keys = await AsyncStorage.getAllKeys();
    if (keys.length > 0) {
      await AsyncStorage.multiRemove(keys);
    }
    
    console.log('✅ All auth data cleared');
  } catch (error) {
    console.error('Error clearing auth data:', error);
  }
};