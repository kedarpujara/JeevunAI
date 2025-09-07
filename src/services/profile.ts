// src/services/profile.ts
import { supabase } from '@/services/supabase';
import * as FileSystem from 'expo-file-system';
import * as ImageManipulator from 'expo-image-manipulator';
import { DeviceEventEmitter } from 'react-native';

export const PROFILE_UPDATED_EVENT = 'profile:updated';

export type UserProfile = {
  id: string;
  email: string | null;
  display_name: string | null;
  bio: string | null;
  avatar_url: string | null;
  is_premium?: boolean | null;
  created_at?: string | null;
  updated_at?: string | null;
};

const TABLE = 'user_profiles';
const AVATAR_BUCKET = 'avatars';

export function broadcastProfileUpdated(userId: string) {
  DeviceEventEmitter.emit(PROFILE_UPDATED_EVENT, { userId });
}

/* -------------------------------- Helpers -------------------------------- */

function base64ToUint8Array(base64: string): Uint8Array {
  // RN has global atob in many setups; fallback to Buffer if polyfilled
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const b64 = (global as any).atob
    ? (global as any).atob(base64)
    : Buffer.from(base64, 'base64').toString('binary');

  const len = b64.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) bytes[i] = b64.charCodeAt(i);
  return bytes;
}

/** Read file:// as bytes (Uint8Array) via base64; consistent on iOS/Android. */
async function readFileAsBytes(uri: string): Promise<Uint8Array> {
  const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
  return base64ToUint8Array(base64);
}

/** Force JPEG (handles HEIC/PNG) so we always upload a web-friendly format. */
async function ensureJpeg(uri: string): Promise<{ uri: string; ext: string; mime: string }> {
  try {
    const result = await ImageManipulator.manipulateAsync(uri, [], {
      compress: 0.9,
      format: ImageManipulator.SaveFormat.JPEG,
    });
    return { uri: result.uri, ext: 'jpg', mime: 'image/jpeg' };
  } catch {
    // If manipulate fails, best effort based on extension
    const ext = (uri.split('.').pop() || 'jpg').toLowerCase();
    const mime = ext === 'png' ? 'image/png' : 'image/jpeg';
    return { uri, ext: ext === 'png' ? 'png' : 'jpg', mime };
  }
}

/** Fetch a remote URL as ArrayBuffer (ui-avatars PNG for default avatar). */
async function fetchAsArrayBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to fetch: ${res.status}`);
  // @ts-ignore RN blobs support arrayBuffer via polyfill
  const buf = await res.arrayBuffer?.() ?? (await (await res.blob()).arrayBuffer());
  return buf;
}

/* ------------------------------ DB operations ----------------------------- */

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const { data, error } = await supabase
    .from(TABLE)
    .select('*')
    .eq('id', userId)
    .maybeSingle();

  if (error && error.code !== 'PGRST116') throw error;
  return (data as UserProfile) ?? null;
}

/**
 * Ensure a profile row; optionally seed display_name from auth metadata on first run.
 * If avatar is missing, caller can run ensureDefaultAvatar afterwards.
 */
export async function ensureUserProfile(
  userId: string,
  email: string | null,
  displayName?: string | null
): Promise<UserProfile> {
  const existing = await getUserProfile(userId);
  if (existing) {
    if (!existing.display_name && displayName) {
      const now = new Date().toISOString();
      const { data, error } = await supabase
        .from(TABLE)
        .upsert({ id: userId, display_name: displayName, updated_at: now }, { onConflict: 'id' })
        .select('*')
        .single();
      if (error) throw error;
      return data as UserProfile;
    }
    return existing;
  }

  const now = new Date().toISOString();
  const insert: Partial<UserProfile> = {
    id: userId,
    email,
    display_name: displayName ?? null,
    bio: null,
    avatar_url: null,
    created_at: now,
    updated_at: now,
  };

  const { data, error } = await supabase
    .from(TABLE)
    .upsert(insert, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throw error;

  return data as UserProfile;
}

/**
 * Create & persist a default avatar (blue bg, white initial), stored in Supabase.
 * This **writes avatar_url to user_profiles** if it’s empty and broadcasts an update.
 */
export async function ensureDefaultAvatar(userId: string, nameForInitial: string | null | undefined) {
  const profile = await getUserProfile(userId);
  if (profile?.avatar_url) return; // already has one

  const initial = (nameForInitial?.trim()?.[0] || 'U').toUpperCase();
  const src = `https://ui-avatars.com/api/?name=${encodeURIComponent(initial)}&background=007AFF&color=fff&bold=true&format=png&size=256&length=1`;

  // Download PNG bytes and upload as ArrayBuffer (avoids 0-byte bug)
  const arrayBuffer = await fetchAsArrayBuffer(src);
  const objectPath = `${userId}/default-${Date.now()}.png`;

  const { error: upErr } = await supabase
    .storage
    .from(AVATAR_BUCKET)
    .upload(objectPath, arrayBuffer, {
      contentType: 'image/png',
      upsert: true,
    });
  if (upErr) throw upErr;

  const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(objectPath);
  const publicUrl = pub?.publicUrl ?? null;

  if (publicUrl) {
    const now = new Date().toISOString();
    const { error: updErr } = await supabase
      .from(TABLE)
      .update({ avatar_url: publicUrl, updated_at: now })
      .eq('id', userId);
    if (updErr) throw updErr;
    broadcastProfileUpdated(userId);
  }
}

/**
 * Save profile fields.
 * - If `avatar_uri` is a `file://` path, convert to JPEG and upload bytes (no blobs).
 * - If `avatar_uri` is a remote http(s) URL, re-upload to your bucket so it’s your asset.
 * - If `avatar_uri` is null, clear avatar_url.
 */
export async function saveUserProfile(
  userId: string,
  updates: {
    email?: string | null;
    display_name?: string | null;
    bio?: string | null;
    avatar_uri?: string | null; // local file or remote URL
  }
): Promise<UserProfile> {
  const now = new Date().toISOString();
  let avatar_url: string | null | undefined = undefined;

  if (updates.avatar_uri !== undefined) {
    const uri = updates.avatar_uri;

    if (uri === null) {
      // Explicitly clear
      avatar_url = null;
    } else if (/^https?:\/\//i.test(uri)) {
      // Remote URL → bring into our bucket
      const buf = await fetchAsArrayBuffer(uri);
      const path = `${userId}/${Date.now()}.png`;
      const { error: upErr } = await supabase
        .storage
        .from(AVATAR_BUCKET)
        .upload(path, buf, { contentType: 'image/png', upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      avatar_url = pub?.publicUrl ?? null;
    } else if (uri.startsWith('file://')) {
      // Local file → normalize to JPEG, then upload bytes
      const norm = await ensureJpeg(uri);
      const bytes = await readFileAsBytes(norm.uri);
      const path = `${userId}/${Date.now()}.${norm.ext}`;

      const { error: upErr } = await supabase
        .storage
        .from(AVATAR_BUCKET)
        .upload(path, bytes.buffer, { contentType: norm.mime, upsert: true });
      if (upErr) throw upErr;

      const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      avatar_url = pub?.publicUrl ?? null;
    } else {
      // Unknown scheme; try to fetch → upload
      const buf = await fetchAsArrayBuffer(uri);
      const path = `${userId}/${Date.now()}.png`;
      const { error: upErr } = await supabase
        .storage
        .from(AVATAR_BUCKET)
        .upload(path, buf, { contentType: 'image/png', upsert: true });
      if (upErr) throw upErr;
      const { data: pub } = supabase.storage.from(AVATAR_BUCKET).getPublicUrl(path);
      avatar_url = pub?.publicUrl ?? null;
    }
  }

  const patch: Partial<UserProfile> = {
    email: updates.email ?? undefined,
    display_name: updates.display_name ?? undefined,
    bio: updates.bio ?? undefined,
    avatar_url, // undefined = leave as is; null = clear; string = set
    updated_at: now,
  };

  const { data, error } = await supabase
    .from(TABLE)
    .upsert({ id: userId, ...patch }, { onConflict: 'id' })
    .select('*')
    .single();
  if (error) throw error;

  broadcastProfileUpdated(userId);
  return data as UserProfile;
}