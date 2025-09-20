// src/services/entries.ts - Updated with proper encryption
import { supabase } from '@/services/supabase';
import { Entry, GroupedEntries, LocationData, Mood, Tag } from '@/types/journal';
import { generateId } from '@/utils/id';
import { formatDate, startOfWeek } from './dates';
import { ImageUploadService, isLocalUri } from './imageUpload';
import { EncryptionService } from './encryption';

const TABLE = 'entries';

type EntryRow = {
  id: string;
  user_id: string;
  entry_date: string;         // YYYY-MM-DD
  mood_score: number | null;
  has_photos: boolean | null;
  location_data: any | null;  // jsonb
  encrypted_blob: string;     // 🔐 NOW ACTUALLY ENCRYPTED!
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

async function toRow(userId: string, e: Entry): Promise<EntryRow> {
  // 🔐 Create sensitive data object to encrypt
  const sensitiveData = {
    title: e.title,
    body: e.body,
    photoUris: e.photoUris,
    tags: e.tags,
    audioUri: e.audioUri,
    transcription: e.transcription,
    themes: e.themes,
    sentiment: e.sentiment,
    // Include any other sensitive fields
  };

  // 🔐 Encrypt the sensitive data
  const encryptedBlob = await EncryptionService.encrypt(sensitiveData, userId);

  return {
    id: e.id,
    user_id: userId,
    entry_date: e.date,
    mood_score: e.mood ?? null,
    has_photos: e.hasPhotos ?? ((e.photoUris?.length ?? 0) > 0),
    location_data: e.locationData ?? null, // Location might be OK unencrypted for search
    encrypted_blob: encryptedBlob, // 🔐 Actually encrypted now!
    created_at: e.createdAt,
    updated_at: e.updatedAt,
    tombstoned: !!e.deleted,
  };
}

async function fromRow(r: EntryRow, userId: string): Promise<Entry> {
  let decryptedData: any = {};
  
  try {
    // 🔐 Decrypt the sensitive data
    if (r.encrypted_blob) {
      decryptedData = await EncryptionService.decrypt(r.encrypted_blob, userId);
    }
  } catch (error) {
    console.error('🔐 Failed to decrypt entry data:', error);
    // Fallback to empty object if decryption fails
    // This might happen if the user's encryption key is lost
    decryptedData = {};
  }

  return {
    id: r.id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    date: r.entry_date,
    title: decryptedData.title,
    body: decryptedData.body,
    mood: (r.mood_score ?? decryptedData.mood ?? undefined) as any,
    tags: decryptedData.tags ?? [],
    photoUris: decryptedData.photoUris ?? [],
    hasPhotos: r.has_photos ?? ((decryptedData.photoUris?.length ?? 0) > 0),
    locationData: (r.location_data as any) ?? decryptedData.locationData,
    audioUri: decryptedData.audioUri,
    transcription: decryptedData.transcription,
    deleted: !!r.tombstoned,
  };
}

// ---------- service ----------

export class EntriesService {
  /**
   * Upload local images and return remote URLs
   */
  private async processImages(photoUris: string[], entryId: string): Promise<string[]> {
    if (!photoUris.length) return [];

    const userId = await uid();
    const processedUris: string[] = [];

    for (const uri of photoUris) {
      if (isLocalUri(uri)) {
        try {
          // Upload local image to Supabase Storage
          const remoteUrl = await ImageUploadService.uploadImage(uri, userId, entryId);
          processedUris.push(remoteUrl);
          console.log('✅ Uploaded image:', uri, '->', remoteUrl);
        } catch (error) {
          console.error('❌ Failed to upload image:', uri, error);
          // Decide: skip failed uploads or throw error
          // For now, we'll skip failed uploads but log them
        }
      } else {
        // Already a remote URL, keep as-is
        processedUris.push(uri);
      }
    }

    return processedUris;
  }

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
    const entryId = generateId();
    const uploadedPhotoUris = await this.processImages(data.photoUris || [], entryId);

    const entry: Entry = {
      id: entryId,
      createdAt: data.createdAt || now.toISOString(),
      updatedAt: now.toISOString(),
      date: data.date || formatDate(now),
      title: data.title?.trim(),
      body: data.body?.trim(),
      mood: data.mood ?? 3,
      tags: data.tags || [],
      photoUris: uploadedPhotoUris,
      hasPhotos: uploadedPhotoUris.length > 0,
      locationData: data.locationData,
      audioUri: data.audioUri,
      transcription: data.transcription,
      deleted: false,
    };

    console.log('🟢 createEntry -> Will upsert (encrypted)', {
      entryId: entry.id,
      userId,
      date: entry.date,
      title: entry.title ? '[ENCRYPTED]' : undefined,
      hasPhotos: entry.hasPhotos,
      tagsCount: entry.tags?.length || 0,
    });

    const payload = await toRow(userId, entry);
    console.log('📦 FINAL ROW PAYLOAD (encrypted):', {
      id: payload.id,
      user_id: payload.user_id,
      entry_date: payload.entry_date,
      mood_score: payload.mood_score,
      has_photos: payload.has_photos,
      location_is_null: payload.location_data == null,
      blob_is_encrypted: payload.encrypted_blob.length > 0,
      blob_length: payload.encrypted_blob.length,
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
    return fromRow(upserted, userId);
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

    const current = await fromRow(row, userId);
    let finalPhotoUris = current.photoUris || [];
  
    if (updates.photoUris) {
      // Upload any new local images
      const processedUris = await this.processImages(updates.photoUris, id);
      
      // Find images that were removed (to clean them up)
      const removedImages = (current.photoUris || []).filter(uri => 
        !processedUris.includes(uri) && !isLocalUri(uri)
      );
      
      // Clean up removed images from Supabase Storage
      if (removedImages.length > 0) {
        await ImageUploadService.deleteImages(removedImages);
      }
      
      finalPhotoUris = processedUris;
    }

    const merged: Entry = {
      ...current,
      ...updates,
      id: current.id,                  // avoid id changes
      createdAt: updates.createdAt || current.createdAt,    // preserve creation
      updatedAt: new Date().toISOString(),
      photoUris: finalPhotoUris, 
      hasPhotos: finalPhotoUris.length > 0,
    };

    const { data: updated, error } = await supabase
      .from(TABLE)
      .upsert(await toRow(userId, merged), { onConflict: 'id' })
      .select('*')
      .single<EntryRow>();
    if (error) throw error;

    return fromRow(updated, userId);
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
    return fromRow(data, userId);
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
    
    // 🔐 Decrypt all entries
    const entries: Entry[] = [];
    for (const row of (data as EntryRow[]) || []) {
      try {
        const entry = await fromRow(row, userId);
        if (!entry.deleted) {
          entries.push(entry);
        }
      } catch (error) {
        console.error('🔐 Failed to decrypt entry:', row.id, error);
        // Skip corrupted entries rather than failing completely
      }
    }
    
    return entries;
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
    
    // 🔐 Decrypt all entries
    const entries: Entry[] = [];
    for (const row of (data as EntryRow[]) || []) {
      try {
        const entry = await fromRow(row, userId);
        if (!entry.deleted) {
          entries.push(entry);
        }
      } catch (error) {
        console.error('🔐 Failed to decrypt entry:', row.id, error);
        // Skip corrupted entries rather than failing completely
      }
    }
    
    return entries;
  }

  async searchEntries(query: string): Promise<Entry[]> {
    // 🔐 NOTE: Since content is encrypted, we can't search it server-side
    // We need to decrypt all entries client-side and search locally
    const q = query.trim().toLowerCase();
    if (!q) return this.listEntries();

    console.log('🔍 Performing client-side encrypted search for:', q);
    
    const allEntries = await this.listEntries();
    
    return allEntries.filter(entry => {
      const titleMatch = entry.title?.toLowerCase().includes(q) ?? false;
      const bodyMatch = entry.body?.toLowerCase().includes(q) ?? false;
      const tagMatch = entry.tags?.some(tag => tag.name.toLowerCase().includes(q)) ?? false;
      
      return titleMatch || bodyMatch || tagMatch;
    });
  }

  async groupEntriesByDay(): Promise<GroupedEntries> {
    const entries = await this.listEntries();
    const grouped: GroupedEntries = {};
    entries.forEach(e => {
      if (!grouped[e.date]) grouped[e.date] = [];
      grouped[e.date].push(e);
    });

    console.log('=== DEBUG DATE ISSUE ===');
    console.log('Raw grouped keys:', Object.keys(grouped));
    console.log('Current entries from context:', entries.map(e => ({
      id: e.id,
      date: e.date,
      title: e.title ? '[ENCRYPTED]' : undefined,
      createdAt: e.createdAt
    })));
    return grouped;
  }

  async groupEntriesByWeek(): Promise<GroupedEntries> {
    const entries = await this.listEntries();
    const grouped: GroupedEntries = {};
    entries.forEach(e => {
      // Parse the date string manually to avoid timezone issues
      const [y, m, d] = e.date.split('-').map(n => parseInt(n, 10));
      const entryDate = new Date(y, m - 1, d); // Local date at midnight
      const weekStart = formatDate(startOfWeek(entryDate));
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

  /**
   * 🔐 Clear encryption key on logout
   */
  static clearEncryption(): void {
    EncryptionService.clearKey();
  }
}

export const entriesService = new EntriesService();