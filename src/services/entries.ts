// src/services/entries.ts - Working encrypted version using crypto-js
import { supabase } from '@/services/supabase';
import { Entry, GroupedEntries, LocationData, Mood, Tag } from '@/types/journal';
import { generateId } from '@/utils/id';
import { formatDate, startOfWeek } from './dates';
import { ImageUploadService, isLocalUri } from './imageUpload';
import { EncryptionService } from './encryption';
import analytics from '@/utils/analytics';

const TABLE = 'entries';

type EntryRow = {
  id: string;
  user_id: string;
  entry_date: string;
  mood_score: number | null;
  has_photos: boolean | null;
  location_data: any | null;
  encrypted_blob: any; // Will be string when encrypted, object when legacy
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
  // Create sensitive data object to encrypt
  const sensitiveData = {
    title: e.title,
    body: e.body,
    photoUris: e.photoUris,
    tags: e.tags,
    audioUri: e.audioUri,
    transcription: e.transcription,
    // themes: e.themes,
    // sentiment: e.sentiment,
  };

  // Encrypt the sensitive data
  const encryptedBlob = await EncryptionService.encrypt(sensitiveData, userId);

  return {
    id: e.id,
    user_id: userId,
    entry_date: e.date,
    mood_score: e.mood ?? null,
    has_photos: e.hasPhotos ?? ((e.photoUris?.length ?? 0) > 0),
    location_data: e.locationData ?? null,
    encrypted_blob: encryptedBlob,
    created_at: e.createdAt,
    updated_at: e.updatedAt,
    tombstoned: !!e.deleted,
  };
}

async function fromRow(r: EntryRow, userId: string): Promise<Entry> {
  let decryptedData: any = {};
  
  // Check if this is legacy format (object) or encrypted format (string)
  if (typeof r.encrypted_blob === 'string') {
    // Encrypted format - try to decrypt but don't fail if it's corrupted
    try {
      decryptedData = await EncryptionService.decrypt(r.encrypted_blob, userId);
    } catch (decryptError) {
      // Corrupted encrypted entry - return a placeholder entry
      console.warn(`⚠️ Corrupted encrypted entry ${r.id} - skipping`);
      return {
        id: r.id,
        createdAt: r.created_at,
        updatedAt: r.updated_at,
        date: r.entry_date,
        title: '⚠️ Corrupted Entry',
        body: 'This entry was encrypted with a lost key and cannot be recovered.',
        mood: (r.mood_score ?? 3) as any,
        tags: [],
        photoUris: [],
        hasPhotos: false,
        locationData: r.location_data as any,
        deleted: !!r.tombstoned,
      };
    }
  } else if (typeof r.encrypted_blob === 'object' && r.encrypted_blob !== null) {
    // Legacy unencrypted format
    console.log(`Reading legacy unencrypted entry: ${r.id}`);
    decryptedData = r.encrypted_blob;
  } else {
    // Neither encrypted string nor object - corrupted data
    console.warn(`⚠️ Invalid entry format ${r.id}`);
    return {
      id: r.id,
      createdAt: r.created_at,
      updatedAt: r.updated_at,
      date: r.entry_date,
      title: '⚠️ Invalid Entry',
      body: 'This entry has an invalid format.',
      mood: (r.mood_score ?? 3) as any,
      tags: [],
      photoUris: [],
      hasPhotos: false,
      locationData: r.location_data as any,
      deleted: !!r.tombstoned,
    };
  }

  return {
    id: r.id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
    date: r.entry_date,
    title: decryptedData.title || 'Untitled',
    body: decryptedData.body,
    mood: (r.mood_score ?? decryptedData.mood ?? 3) as any,
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
          const remoteUrl = await ImageUploadService.uploadImage(uri, userId, entryId);
          processedUris.push(remoteUrl);
          console.log('Uploaded image:', uri, '->', remoteUrl);
        } catch (error) {
          console.error('Failed to upload image:', uri, error);
        }
      } else {
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

    console.log('Creating encrypted entry:', {
      entryId: entry.id,
      userId,
      date: entry.date,
      hasContent: !!(entry.title || entry.body),
      hasPhotos: entry.hasPhotos,
      tagsCount: entry.tags?.length || 0,
    });

    const payload = await toRow(userId, entry);
    
    console.log('FINAL ROW PAYLOAD (encrypted):', {
      id: payload.id,
      user_id: payload.user_id,
      entry_date: payload.entry_date,
      mood_score: payload.mood_score,
      has_photos: payload.has_photos,
      location_is_null: payload.location_data == null,
      blob_is_encrypted: typeof payload.encrypted_blob === 'string',
      blob_length: payload.encrypted_blob.length,
      tombstoned: payload.tombstoned,
    });

    const { data: upserted, error } = await supabase
      .from(TABLE)
      .upsert(payload, { onConflict: 'id' })
      .select('*')
      .single<EntryRow>();

    if (error) {
      console.warn('createEntry -> Supabase upsert error:', error.message);
      throw error;
    }

    console.log('createEntry -> Supabase upsert OK, db id:', upserted.id);

    console.log('🎤 Entry creation debug:', {
      hasAudioUri: !!entry.audioUri,
      hasTranscription: !!entry.transcription,
      transcription: entry.transcription?.substring(0, 50) + '...',
      detectedMethod: entry.transcription ? 'voice' : 'manual'
    });

    analytics.logEntryCreated(
      entry.id,
      (entry.title?.length || 0) + (entry.body?.length || 0),
      entry.date,
      entry.transcription ? 'voice' : 'manual',
      entry.createdAt,
      entry.hasPhotos || false,
      !!entry.locationData,
      entry.tags?.length || 0
    );

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
      const processedUris = await this.processImages(updates.photoUris, id);
      
      const removedImages = (current.photoUris || []).filter(uri => 
        !processedUris.includes(uri) && !isLocalUri(uri)
      );
      
      if (removedImages.length > 0) {
        await ImageUploadService.deleteImages(removedImages);
      }
      
      finalPhotoUris = processedUris;
    }

    const merged: Entry = {
      ...current,
      ...updates,
      id: current.id,
      createdAt: updates.createdAt || current.createdAt,
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

    const updatedEntry = await fromRow(updated, userId);
    analytics.logTrack('entry_updated', {
      entry_id: updatedEntry.id,
      entry_date: updatedEntry.date,
      entry_length: (updatedEntry.title?.length || 0) + (updatedEntry.body?.length || 0),
      has_photos: updatedEntry.hasPhotos,
      tags_count: updatedEntry.tags?.length || 0
    });
  
    return updatedEntry
  }

  async deleteEntry(id: string): Promise<void> {
    const userId = await uid();
    // Get entry details before deleting for analytics
    const entryToDelete = await this.getEntry(id);

    const { error } = await supabase
      .from(TABLE)
      .update({ tombstoned: true, updated_at: new Date().toISOString() })
      .eq('id', id)
      .eq('user_id', userId);
    
    analytics.logTrack('entry_deleted', {
      entry_id: id,
      entry_date: entryToDelete?.date,
      entry_length: entryToDelete ? (entryToDelete.title?.length || 0) + (entryToDelete.body?.length || 0) : 0,
      had_photos: entryToDelete?.hasPhotos || false,
      tags_count: entryToDelete?.tags?.length || 0
    });

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

    const entry = await fromRow(data, userId);
    analytics.logEntryOpened(entry.id, entry.date);

    return entry;
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
    
    const entries: Entry[] = [];
    for (const row of (data as EntryRow[]) || []) {
      try {
        const entry = await fromRow(row, userId);
        if (!entry.deleted) {
          entries.push(entry);
        }
      } catch (error) {
        console.error('Failed to process entry:', row.id, error);
        // Continue processing other entries rather than failing completely
      }
    }

    // // 🚀 ADD ANALYTICS HERE - Only track when it's likely a full list view
    // if (entries.length > 0) {
    //   analytics.logTrack('all_entries_viewed', {
    //     total_entries: entries.length,
    //     date_range_days: this.calculateDateRange(entries),
    //     avg_entry_length: this.calculateAvgLength(entries)
    //   });
    // }
    
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
    
    const entries: Entry[] = [];
    for (const row of (data as EntryRow[]) || []) {
      try {
        const entry = await fromRow(row, userId);
        if (!entry.deleted) {
          entries.push(entry);
        }
      } catch (error) {
        console.error('Failed to process entry:', row.id, error);
      }
    }
    
    return entries;
  }

  async searchEntries(query: string): Promise<Entry[]> {
    // Since content is encrypted, we need to search client-side
    const q = query.trim().toLowerCase();
    if (!q) return this.listEntries();

    console.log('Performing client-side encrypted search for:', q);
    
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

    return grouped;
  }

  async groupEntriesByWeek(): Promise<GroupedEntries> {
    const entries = await this.listEntries();
    const grouped: GroupedEntries = {};
    entries.forEach(e => {
      const [y, m, d] = e.date.split('-').map(n => parseInt(n, 10));
      const entryDate = new Date(y, m - 1, d);
      const weekStart = formatDate(startOfWeek(entryDate));
      if (!grouped[weekStart]) grouped[weekStart] = [];
      grouped[weekStart].push(e);
    });

    analytics.logTrack('weekly_entries_viewed', {
      total_weeks: Object.keys(grouped).length,
      total_entries: entries.length,
      avg_entries_per_week: entries.length / Math.max(Object.keys(grouped).length, 1)
    });
  
    return grouped;
  }

  async groupEntriesByMonth(): Promise<GroupedEntries> {
    const entries = await this.listEntries();
    const grouped: GroupedEntries = {};
    entries.forEach(e => {
      const [y, m] = e.date.split('-');
      const monthKey = `${y}-${m}-01`;
      if (!grouped[monthKey]) grouped[monthKey] = [];
      grouped[monthKey].push(e);
    });

    analytics.logTrack('weekly_entries_viewed', {
      total_weeks: Object.keys(grouped).length,
      total_entries: entries.length,
      avg_entries_per_month: entries.length / Math.max(Object.keys(grouped).length, 1)
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
   * Clear encryption key on logout
   */
  static clearEncryption(): void {
    EncryptionService.clearKey();
  }

  // Helper methods to add to the class
  private calculateDateRange(entries: Entry[]): number {
    if (entries.length === 0) return 0;
    const dates = entries.map(e => new Date(e.date)).sort((a, b) => a.getTime() - b.getTime());
    const diffTime = dates[dates.length - 1].getTime() - dates[0].getTime();
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  }

  private calculateAvgLength(entries: Entry[]): number {
    const totalLength = entries.reduce((sum, e) => sum + (e.title?.length || 0) + (e.body?.length || 0), 0);
    return Math.round(totalLength / entries.length);
  }
}

export const entriesService = new EntriesService();