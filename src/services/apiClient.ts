// src/services/apiClient.ts
import { ENV, hostedFunctionsBaseUrl } from '@/config/env';
import { supabase } from '@/services/supabase';
import { Platform } from 'react-native';

// Toggle this in Expo env: EXPO_PUBLIC_USE_LOCAL_FUNCTIONS=1
const USE_LOCAL = ENV.USE_LOCAL_FUNCTIONS === '1';

const LOCAL_HOST = Platform.select({
  ios: '127.0.0.1',
  android: '10.0.2.2',
  default: '127.0.0.1',
});

const LOCAL_FUNCTIONS_BASE = `http://${LOCAL_HOST}:54321/functions/v1`;

export const FUNCTIONS_BASE_URL = USE_LOCAL ? LOCAL_FUNCTIONS_BASE : hostedFunctionsBaseUrl;

function logEnv() {
  console.log('[EdgeApi] ENV.USE_LOCAL_FUNCTIONS:', ENV.USE_LOCAL_FUNCTIONS);
  console.log('[EdgeApi] USE_LOCAL (calculated):', USE_LOCAL);
  console.log('[EdgeApi] BASE_URL:', FUNCTIONS_BASE_URL);
  console.log('[EdgeApi] Should use local?', ENV.USE_LOCAL_FUNCTIONS === '1');
}

export const EdgeApi = {
  async call<T = any>(
    fnName: string,
    options: {
      method?: 'GET' | 'POST';
      body?: any;                 // we’ll stringify if not FormData
      headers?: Record<string, string>;
      formData?: FormData | null; // pass when uploading files
      withAuth?: boolean;         // send supabase session JWT
      timeoutMs?: number;
    } = {}
  ): Promise<T> {
    logEnv();

    const {
      method = 'POST',
      body,
      headers = {},
      formData = null,
      withAuth = true,
      timeoutMs = 60000,
    } = options;

    const controller = new AbortController();
    const t = setTimeout(() => controller.abort(), timeoutMs);

    // Optional: attach a Supabase session JWT (required if your function enforces JWT)
    let authHeaders: Record<string, string> = {};
    if (withAuth) {
      try {
        const { data } = await supabase.auth.getSession();
        const token = data.session?.access_token;
        if (token) authHeaders.Authorization = `Bearer ${token}`;
      } catch (e) {
        console.log('[EdgeApi] getSession error (non-fatal):', e);
      }
    }

    const url = `${FUNCTIONS_BASE_URL}/${fnName}`;

    console.log('[EdgeApi] →', method, url, {
      withAuth,
      hasFormData: !!formData,
      hasBody: !!body,
    });

    try {
      const res = await fetch(url, {
        method,
        headers: {
          ...authHeaders,
          ...(formData ? {} : { 'Content-Type': 'application/json' }),
          ...headers,
        },
        // React Native’s fetch typing is stricter—cast here to avoid BodyInit type noise
        body: (formData ?? (body ? JSON.stringify(body) : null)) as any,
        signal: controller.signal as any,
      });

      clearTimeout(t);

      const text = await res.text();
      const isJson = (res.headers.get('content-type') || '').includes('application/json');
      const payload = isJson && text ? JSON.parse(text) : text;

      if (!res.ok) {
        console.log('[EdgeApi] ← ERROR', res.status, payload);
        throw new Error(
          typeof payload === 'string' ? payload : JSON.stringify(payload)
        );
      }

      console.log('[EdgeApi] ← OK', res.status);
      return payload as T;
    } catch (err: any) {
      clearTimeout(t);
      console.log('[EdgeApi] NETWORK/OTHER ERROR:', err?.message || err);
      throw err;
    }
  },

  // Convenience wrappers
  async transcribe(file: { uri: string; type?: string; name?: string }) {
    const fd = new FormData();
    // @ts-ignore RN-specific FormData file shape is fine at runtime
    fd.append('file', {
      uri: file.uri,
      type: file.type || 'audio/m4a',
      name: file.name || 'recording.m4a',
    });

    // Function expects multipart/form-data
    return this.call<{ text: string }>('whisper-transcribe', {
      method: 'POST',
      formData: fd,
      withAuth: false, // if your local serve used --no-verify-jwt
    });
  },

  async analyzeJournal(input: {
    content: string;
    mood?: number;
    hasPhotos?: boolean;
    location?: string;
  }) {
    return this.call<{ title: string; tags: string[]; sentiment?: string; themes?: string[] }>(
      'journal-analyze',
      { method: 'POST', body: input, withAuth: false }
    );
  },

  async log(payload: { events: any[] }) {
    return this.call<{ ok: boolean }>('client-log', {
      method: 'POST',
      body: payload,
      withAuth: false, // or true if you want user context
      timeoutMs: 4000,
    });
  }
};


