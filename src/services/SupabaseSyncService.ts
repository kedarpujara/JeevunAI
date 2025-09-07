// src/services/SupabaseSyncService.ts
import { Entry, LocationData, Mood, Tag } from '../types/journal';
import { generateId } from '../utils/id';
import { storageService } from './storage/asyncStorage';
import { supabase } from './supabase';

type DBEntryRow = {
  id: string;
  user_id: string;
  entry_date: string;         // YYYY-MM-DD
  encrypted_blob: string;     // JSON of the full entry (unencrypted for now)
  mood_score: number | null;
  has_photos: boolean | null;
  photo_uris?: string | null; // optional convenience
  location_data?: any | null;
  metadata?: any | null;
  created_at: string;
  updated_at: string;
  tombstoned?: boolean | null;
  tombstoned_at?: string | null;
};

function toDbRow(entry: Entry, userId: string): DBEntryRow {
  const blob = {
    title: entry.title,
    body: entry.body,
    tags: entry.tags,
    photoUris: entry.photoUris ?? [],
    audioUri: entry.audioUri ?? null,
    transcription: entry.transcription ?? null,
    locationData: entry.locationData ?? null,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
  };

  return {
    id: entry.id,
    user_id: userId,
    entry_date: entry.date,
    encrypted_blob: JSON.stringify(blob),
    mood_score: entry.mood ?? null,
    has_photos: entry.hasPhotos ?? ((entry.photoUris?.length ?? 0) > 0),
    photo_uris: entry.photoUris ? JSON.stringify(entry.photoUris) : null,
    location_data: entry.locationData ?? null,
    metadata: null,
    created_at: entry.createdAt,
    updated_at: entry.updatedAt,
    tombstoned: entry.deleted ?? false,
    tombstoned_at: entry.deleted ? new Date().toISOString() : null,
  };
}

function fromDbRow(row: DBEntryRow): Entry {
  let blob: any = {};
  try { blob = row.encrypted_blob ? JSON.parse(row.encrypted_blob) : {}; } catch {}

  const parsedPhotoUris: string[] = (() => {
    if (blob?.photoUris) return blob.photoUris as string[];
    if (row.photo_uris) { try { return JSON.parse(row.photo_uris); } catch { return []; } }
    return [];
  })();

  return {
    id: row.id,
    date: row.entry_date,
    title: blob.title ?? '',
    body: blob.body ?? '',
    mood: (row.mood_score ?? blob.mood ?? 3) as Mood,
    tags: (blob.tags ?? []) as Tag[],
    createdAt: blob.createdAt ?? row.created_at,
    updatedAt: blob.updatedAt ?? row.updated_at,
    photoUris: parsedPhotoUris,
    hasPhotos: row.has_photos ?? (parsedPhotoUris.length > 0),
    audioUri: blob.audioUri ?? undefined,
    transcription: blob.transcription ?? undefined,
    locationData: (blob.locationData ?? row.location_data ?? undefined) as LocationData | undefined,
    deleted: row.tombstoned ?? false,
  };
}

async function currentUserId(): Promise<string | null> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data?.user) return null;
  return data.user.id;
}

async function pullAllFromSupabase(): Promise<Entry[]> {
  const uid = await currentUserId();
  if (!uid) return storageService.listEntries();

  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', uid)
    .eq('tombstoned', false)
    .order('created_at', { ascending: false });

  if (error) {
    console.warn('Supabase fetch error:', error.message);
    return storageService.listEntries();
  }

  const remote = (data as DBEntryRow[]).map(fromDbRow);

  // simple mirror: update/insert locals to match remote
  const locals = await storageService.listEntries();
  const byId = new Map(locals.map(e => [e.id, e]));
  for (const e of remote) {
    if (byId.has(e.id)) await storageService.updateEntry(e);
    else await storageService.addEntry(e);
  }
  return remote;
}

async function pushOneToSupabase(entry: Entry): Promise<Entry> {
  const uid = await currentUserId();
  if (!uid) return entry;

  const row = toDbRow(entry, uid);
  const { data, error } = await supabase
    .from('entries')
    .upsert(row, { onConflict: 'id' })
    .select('*')
    .single();

  if (error) {
    console.warn('Supabase upsert error:', error.message);
    return entry;
  }
  return fromDbRow(data as DBEntryRow);
}

export const SupabaseSyncService = {
  async syncFromSupabase(): Promise<Entry[]> {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return []; // no-op when not signed in
    return pullAllFromSupabase();
  },
  async deleteRemote(id: string): Promise<void> {
    const uid = await currentUserId();
    if (!uid) return;
    const now = new Date().toISOString();
    await supabase
      .from('entries')
      .update({ tombstoned: true, tombstoned_at: now, updated_at: now })
      .eq('id', id)
      .eq('user_id', uid);
  }
};

export const hybridEntriesService = {
  async createEntry(data: Partial<Entry>): Promise<Entry> {
    const now = new Date().toISOString();
    const entry: Entry = {
      id: data.id ?? generateId(),
      date: data.date ?? new Date().toISOString().slice(0, 10),
      title: data.title ?? '',
      body: (data as any).body ?? (data as any).content ?? '',
      mood: (data.mood ?? 3) as Mood,
      tags: data.tags ?? [],
      createdAt: data.createdAt ?? now,
      updatedAt: data.updatedAt ?? now,
      photoUris: data.photoUris ?? [],
      hasPhotos: data.hasPhotos ?? ((data.photoUris?.length ?? 0) > 0),
      audioUri: data.audioUri,
      transcription: data.transcription,
      locationData: data.locationData,
      deleted: false,
    };

    await storageService.addEntry(entry); // local first

    try {
      const saved = await pushOneToSupabase(entry);
      await storageService.updateEntry(saved); // keep mirror fresh
      return saved;
    } catch {
      return entry;
    }
  },

  async updateEntry(id: string, updates: Partial<Entry>): Promise<void> {
    const existing = await storageService.getEntry(id);
    if (!existing) return;
    const updated: Entry = { ...existing, ...updates, updatedAt: new Date().toISOString() };
    await storageService.updateEntry(updated);
    try { await pushOneToSupabase(updated); } catch {}
  },

  async deleteEntry(id: string): Promise<void> {
    await storageService.deleteEntry(id);
    try { await SupabaseSyncService.deleteRemote(id); } catch {}
  },
};