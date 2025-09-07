// src/config/env.ts

import Constants from 'expo-constants';

/**
 * Gets environment variables with fallback support
 * Works in all contexts: dev, production, builds
 */
const getEnvVar = (key: string): string | undefined => {
  // Try Constants first (works at runtime in all modes)
  const fromConstants = Constants.expoConfig?.extra?.[key];
  if (fromConstants) return fromConstants;
  
  // Fallback to process.env (works in dev mode and build time)
  return process.env[key];
};

// Export your environment variables
export const ENV = {
  SUPABASE_URL: getEnvVar('EXPO_PUBLIC_SUPABASE_URL'),
  SUPABASE_ANON_KEY: getEnvVar('EXPO_PUBLIC_SUPABASE_ANON_KEY'),
  USE_LOCAL_FUNCTIONS: getEnvVar('EXPO_PUBLIC_USE_LOCAL_FUNCTIONS'),
} as const;

// Validation helper
export const validateEnv = () => {
  const missing = [];
  if (!ENV.SUPABASE_URL) missing.push('EXPO_PUBLIC_SUPABASE_URL');
  if (!ENV.SUPABASE_ANON_KEY) missing.push('EXPO_PUBLIC_SUPABASE_ANON_KEY');
  
  if (missing.length > 0) {
    throw new Error(`Missing environment variables: ${missing.join(', ')}`);
  }
};

// Debug helper
export const logEnvStatus = (context: string) => {
  console.log(`[${context}] Environment Status:`, {
    supabaseUrl: ENV.SUPABASE_URL ? 'EXISTS' : 'MISSING',
    supabaseAnonKey: ENV.SUPABASE_ANON_KEY ? 'EXISTS' : 'MISSING',
    useLocalFunctions: ENV.USE_LOCAL_FUNCTIONS || '0',
  });
};


// /** Utilities below are optional but handy for functions URLs, etc. */
function getProjectRefFromUrl(url: string | undefined): string | null {
  if (!url) { return null };
  const m = url.match(/^https?:\/\/([^.]+)\.supabase\.co/i);
  return m?.[1] ?? null;
}

export const projectRef = getProjectRefFromUrl(ENV.SUPABASE_URL);

// /**
//  * Hosted Functions base URL (works when functions are deployed).
//  * For local dev you typically hit http://127.0.0.1:54321/functions/v1 instead.
//  */
export const hostedFunctionsBaseUrl = projectRef
  ? `https://${projectRef}.functions.supabase.co`
  : '';