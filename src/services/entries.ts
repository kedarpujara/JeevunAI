// src/services/entries.ts
import { supabase } from '@/services/supabase';
import { Entry, GroupedEntries, LocationData, Mood, Tag } from '@/types/journal';
import { generateId } from '@/utils/id';
import { formatDate, startOfWeek } from './dates';

const TABLE = 'entries';

type EntryRow = {
  id: string;
  user_id: string;
  entry_date: string;         // YYYY-MM-DD
  mood_score: number | null;
  has_photos: boolean | null;
  location_data: any | null;  // jsonb
  encrypted_blob: any | null; // jsonb
  created_at: string;
  updated_at: string;
  tombstoned: boolean | null;
};

// ---------- helpers ----------

async function uid(): Promise<string> {
  const { data, error } = await supabase.auth.getUser();
  if (error) throw error;
  const id = data.user?.id;
  if (!id) throw new Error('AuthSessionMissingError: Not authenticated');
  return id;
}

function toRow(userId: string, e: Entry) {
    return {
      id: e.id,
      user_id: userId,
      entry_date: e.date,
      mood_score: e.mood ?? null,
      has_photos: e.hasPhotos ?? ((e.photoUris?.length ?? 0) > 0), // keep
      location_data: e.locationData ?? null,
      encrypted_blob: { ...e }, // <-- full entry, including photoUris, tags, etc.
      created_at: e.createdAt,
      updated_at: e.updatedAt,
      tombstoned: !!e.deleted,
    };
  }

  function fromRow(r: EntryRow): Entry {
    const blob = (r.encrypted_blob ?? {}) as Partial<Entry>;
    return {
      id: r.id,
      createdAt: blob.createdAt ?? r.created_at,
      updatedAt: blob.updatedAt ?? r.updated_at,
      date: r.entry_date,
      title: blob.title,
      body: blob.body,
      mood: (r.mood_score ?? blob.mood ?? undefined) as any,
      tags: blob.tags ?? [],
      photoUris: blob.photoUris ?? [],           // <-- from encrypted_blob
      hasPhotos: r.has_photos ?? blob.hasPhotos ?? ((blob.photoUris?.length ?? 0) > 0),
      locationData: (r.location_data as any) ?? blob.locationData,
      audioUri: blob.audioUri,
      transcription: blob.transcription,
      deleted: !!r.tombstoned,
    };
  }

// ---------- service ----------

export class EntriesService {
  async createEntry(data: {
    title?: string;
    body?: string;
    mood?: Mood;
    tags?: Tag[];
    photoUris?: string[];
    hasPhotos?: boolean;
    locationData?: LocationData;
    audioUri?: string;
    transcription?: string;
    sentiment?: any;
    themes?: string[];
    date?: string;
    createdAt?: string;
  }): Promise<Entry> {
    const userId = await uid();
    const now = new Date();
    const entry: Entry = {
      id: generateId(),
      createdAt: data.createdAt || now.toISOString(),
      updatedAt: now.toISOString(),
      date: data.date || formatDate(now),
      title: data.title?.trim(),
      body: data.body?.trim(),
      mood: data.mood ?? 3,
      tags: data.tags || [],
      photoUris: data.photoUris || [],
      hasPhotos: data.hasPhotos ?? ((data.photoUris?.length ?? 0) > 0),
      locationData: data.locationData,
      audioUri: data.audioUri,
      transcription: data.transcription,
      deleted: false,
    };

    console.log('🟢 createEntry -> Will upsert', {
      entryId: entry.id,
      userId,
      date: entry.date,
      title: entry.title,
      hasPhotos: entry.hasPhotos,
      tagsCount: entry.tags?.length || 0,
    });

    const payload = toRow(userId, entry);
    console.log('📦 FINAL ROW PAYLOAD (trimmed):', {
      id: payload.id,
      user_id: payload.user_id,
      entry_date: payload.entry_date,
      mood_score: payload.mood_score,
      has_photos: payload.has_photos,
      location_is_null: payload.location_data == null,
      blob_is_object: typeof payload.encrypted_blob === 'object',
      tombstoned: payload.tombstoned,
    });

    const { data: upserted, error } = await supabase
      .from(TABLE)
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single<EntryRow>();

    if (error) {
      console.warn('🔴 createEntry -> Supabase upsert error:', error.message);
      throw error;
    }

    console.log('🟢 createEntry -> Supabase upsert OK, db id:', upserted.id);
    return fromRow(upserted);
  }

  async updateEntry(id: string, updates: Partial<Entry>): Promise<Entry | null> {
    const userId = await uid();

    const { data: row, error: getErr } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle<EntryRow>();
    if (getErr) throw getErr;
    if (!row) return null;

    const current = fromRow(row);
    const merged: Entry = {
      ...current,
      ...updates,
      id: current.id,                  // avoid id changes
      createdAt: current.createdAt,    // preserve creation
      updatedAt: new Date().toISOString(),
      hasPhotos: updates.photoUris ? updates.photoUris.length > 0 : current.hasPhotos,
    };

    const { data: updated, error } = await supabase
      .from(TABLE)
      .upsert(toRow(userId, merged), { onConflict: 'id' })
      .select('*')
      .single<EntryRow>();
    if (error) throw error;

    return fromRow(updated);
  }

  async deleteEntry(id: string): Promise<void> {
    const userId = await uid();
    const { error } = await supabase
      .from(TABLE)
      .update({ tombstoned: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);

    if (error) throw error;
  }

  async getEntry(id: string): Promise<Entry | null> {
    const userId = await uid();
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle<EntryRow>();
    if (error) throw error;
    if (!data) return null;
    return fromRow(data);
  }

  async listEntries(): Promise<Entry[]> {
    const userId = await uid();
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('tombstoned', false)
      .order('entry_date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) throw error;
    return ((data as EntryRow[]) || []).map(fromRow).filter(e => !e.deleted);
  }

  async listByDateRange(startDate: Date, endDate: Date): Promise<Entry[]> {
    const userId = await uid();
    const start = formatDate(startDate);
    const end = formatDate(endDate);

    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .gte('entry_date', start)
      .lte('entry_date', end)
      .eq('tombstoned', false)
      .order('entry_date', { ascending: false });

    if (error) throw error;
    return ((data as EntryRow[]) || []).map(fromRow).filter(e => !e.deleted);
  }

  async searchEntries(query: string): Promise<Entry[]> {
    const q = query.trim();
    if (!q) return this.listEntries();

    const userId = await uid();
    const { data, error } = await supabase
      .from(TABLE)
      .select('*')
      .eq('user_id', userId)
      .eq('tombstoned', false)
      .or(
        // search inside the blob title/body
        `encrypted_blob->>title.ilike.%${q}%,encrypted_blob->>body.ilike.%${q}%`
      )
      .order('updated_at', { ascending: false });

    if (error) throw error;
    return ((data as EntryRow[]) || []).map(fromRow).filter(e => !e.deleted);
  }

  async groupEntriesByDay(): Promise<GroupedEntries> {
    const entries = await this.listEntries();
    const grouped: GroupedEntries = {};
    entries.forEach(e => {
      if (!grouped[e.date]) grouped[e.date] = [];
      grouped[e.date].push(e);
    });
    return grouped;
  }

  async groupEntriesByWeek(): Promise<GroupedEntries> {
    const entries = await this.listEntries();
    const grouped: GroupedEntries = {};
    entries.forEach(e => {
      const weekStart = formatDate(startOfWeek(new Date(e.date)));
      if (!grouped[weekStart]) grouped[weekStart] = [];
      grouped[weekStart].push(e);
    });
    return grouped;
  }

  async groupEntriesByMonth(): Promise<GroupedEntries> {
    const entries = await this.listEntries();
    const grouped: GroupedEntries = {};
    entries.forEach(e => {
        // e.date is 'YYYY-MM-DD'
        const [y, m] = e.date.split('-');       // no Date() here
        const monthKey = `${y}-${m}-01`;        // canonical month-start key
        if (!grouped[monthKey]) grouped[monthKey] = [];
        grouped[monthKey].push(e);
      });
    return grouped;
  }

  async getStats() {
    const entries = await this.listEntries();
    const totalEntries = entries.length;
    const avgMood =
      totalEntries === 0 ? 0 : entries.reduce((s, e) => s + (e.mood ?? 3), 0) / totalEntries;

    const tagCounts = new Map<string, number>();
    entries.forEach(e => (e.tags ?? []).forEach(t => tagCounts.set(t.name, (tagCounts.get(t.name) || 0) + 1)));

    const topTags = Array.from(tagCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name]) => name);

    return { totalEntries, avgMood: Math.round(avgMood * 10) / 10, topTags };
  }
}

export const entriesService = new EntriesService();