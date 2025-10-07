// src/services/migrationService.ts
import { supabase } from '@/services/supabase';
import { EncryptionService } from './encryption';
import AsyncStorage from '@react-native-async-storage/async-storage';

const MIGRATION_KEY = 'encryption_migration_completed';

interface LegacyEntryRow {
  id: string;
  user_id: string;
  entry_date: string;
  mood_score: number | null;
  has_photos: boolean | null;
  location_data: any | null;
  encrypted_blob: any;  // This could be object (legacy) or string (encrypted)
  created_at: string;
  updated_at: string;
  tombstoned: boolean | null;
}

export class MigrationService {
  /**
   * Check if migration is needed and run it
   */
  static async runMigrationIfNeeded(userId: string): Promise<void> {
    const migrationKey = `${MIGRATION_KEY}_${userId}`;
    const completed = await AsyncStorage.getItem(migrationKey);
    
    if (completed === 'true') {
      console.log('Migration already completed for user:', userId);
      return;
    }

    console.log('Starting encryption migration for user:', userId);
    await this.migrateUserEntries(userId);
    
    // Mark migration as completed
    await AsyncStorage.setItem(migrationKey, 'true');
    console.log('Migration completed for user:', userId);
  }

  /**
   * Migrate all entries for a user from unencrypted to encrypted format
   */
  private static async migrateUserEntries(userId: string): Promise<void> {
    try {
      // Get all entries for this user
      const { data: entries, error } = await supabase
        .from('entries')
        .select('*')
        .eq('user_id', userId)
        .eq('tombstoned', false);

      if (error) throw error;
      if (!entries || entries.length === 0) {
        console.log('No entries to migrate for user:', userId);
        return;
      }

      console.log(`Migrating ${entries.length} entries...`);
      let migratedCount = 0;
      let errorCount = 0;

      for (const entry of entries as LegacyEntryRow[]) {
        try {
          // Check if this entry is already encrypted
          if (this.isAlreadyEncrypted(entry.encrypted_blob)) {
            console.log(`Entry ${entry.id} already encrypted, skipping`);
            continue;
          }

          // Extract legacy data and encrypt it
          const legacyData = entry.encrypted_blob;
          const sensitiveData = {
            title: legacyData.title,
            body: legacyData.body,
            photoUris: legacyData.photoUris,
            tags: legacyData.tags,
            audioUri: legacyData.audioUri,
            transcription: legacyData.transcription,
            themes: legacyData.themes,
            sentiment: legacyData.sentiment,
          };

          // Encrypt the sensitive data
          const encryptedBlob = await EncryptionService.encrypt(sensitiveData, userId);

          // Update the entry with encrypted blob
          const { error: updateError } = await supabase
            .from('entries')
            .update({
              encrypted_blob: encryptedBlob,
              updated_at: new Date().toISOString()
            })
            .eq('id', entry.id)
            .eq('user_id', userId);

          if (updateError) {
            console.error(`Failed to migrate entry ${entry.id}:`, updateError);
            errorCount++;
          } else {
            migratedCount++;
          }

        } catch (entryError) {
          console.error(`Error migrating entry ${entry.id}:`, entryError);
          errorCount++;
        }
      }

      console.log(`Migration summary: ${migratedCount} successful, ${errorCount} failed`);

      if (errorCount > 0) {
        console.warn(`${errorCount} entries failed to migrate - they may be inaccessible`);
      }

    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  }

  /**
   * Check if an encrypted_blob is already in encrypted format
   */
  private static isAlreadyEncrypted(blob: any): boolean {
    // If it's a string, it's likely already encrypted
    if (typeof blob === 'string' && blob.length > 50) {
      return true;
    }
    
    // If it's an object with typical journal properties, it's legacy format
    if (typeof blob === 'object' && blob !== null) {
      const hasLegacyProps = 'title' in blob || 'body' in blob || 'tags' in blob;
      return !hasLegacyProps;
    }
    
    return false;
  }

  /**
   * Force re-run migration (for testing or fixing issues)
   */
  static async resetMigration(userId: string): Promise<void> {
    const migrationKey = `${MIGRATION_KEY}_${userId}`;
    await AsyncStorage.removeItem(migrationKey);
    console.log('Migration reset for user:', userId);
  }
}