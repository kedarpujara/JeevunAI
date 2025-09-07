import { ENV, validateEnv } from '@/config/env';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// Validate at startup
validateEnv();

console.log('🔗 Supabase URL:', ENV.SUPABASE_URL);
console.log('🔑 Anon key exists:', !!ENV.SUPABASE_ANON_KEY);

export const supabase = createClient(ENV.SUPABASE_URL!, ENV.SUPABASE_ANON_KEY!, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: false,
    persistSession: false,
    detectSessionInUrl: false,
  },
});