// scripts/migrate-all-entries.ts
// Run this as a Node.js script on your server/local machine

import { createClient } from '@supabase/supabase-js';

// You'll need your Supabase service role key for this (not the anon key)
const SUPABASE_URL = 'your-supabase-url';
const SUPABASE_SERVICE_ROLE_KEY = 'your-service-role-key'; // Has admin access

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// Import your encryption service (you may need to adapt it for Node.js)
// For now, we'll include a simplified version here

class ServerEncryptionService {
  private static keys: Map<string, string> = new Map();

  private static generateSimpleKey(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let key = '';
    
    const timestamp = Date.now().toString();
    const random1 = Math.random().toString(36).substring(2);
    const random2 = Math.random().toString(36).substring(2);
    
    const combined = timestamp + random1 + random2;
    
    for (let i = 0; i < 64; i++) {
      const index = (combined.charCodeAt(i % combined.length) + i) % chars.length;
      key += chars[index];
    }
    
    return key;
  }

  static async getOrCreateKey(userId: string): Promise<string> {
    if (this.keys.has(userId)) {
      return this.keys.get(userId)!;
    }

    // Try to get existing key from user's AsyncStorage equivalent
    // For migration, we'll generate new keys since we can't access AsyncStorage
    const key = this.generateSimpleKey();
    this.keys.set(userId, key);
    
    console.log(`Generated migration key for user: ${userId}`);
    return key;
  }

  static encrypt(data: any, key: string): string {
    const jsonString = JSON.stringify(data);
    
    let encrypted = '';
    for (let i = 0; i < jsonString.length; i++) {
      const keyChar = key.charCodeAt(i % key.length);
      const dataChar = jsonString.charCodeAt(i);
      encrypted += String.fromCharCode(dataChar ^ keyChar);
    }
    
    return Buffer.from(encrypted).toString('base64');
  }
}

interface LegacyEntry {
  id: string;
  user_id: string;
  entry_date: string;
  mood_score: number | null;
  has_photos: boolean | null;
  location_data: any | null;
  encrypted_blob: any;
  created_at: string;
  updated_at: string;
  tombstoned: boolean | null;
}

async function migrateAllEntries() {
  console.log('Starting migration of all entries...');
  
  try {
    // Get all users first
    const { data: users, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      console.error('Error fetching users:', usersError);
      return;
    }

    console.log(`Found ${users.users.length} users to migrate`);

    let totalProcessed = 0;
    let totalEncrypted = 0;
    let totalErrors = 0;

    for (const user of users.users) {
      const userId = user.id;
      console.log(`\nMigrating entries for user: ${userId}`);

      try {
        // Get all entries for this user
        const { data: entries, error: entriesError } = await supabase
          .from('entries')
          .select('*')
          .eq('user_id', userId);

        if (entriesError) {
          console.error(`Error fetching entries for user ${userId}:`, entriesError);
          continue;
        }

        if (!entries || entries.length === 0) {
          console.log(`No entries found for user ${userId}`);
          continue;
        }

        console.log(`Found ${entries.length} entries for user ${userId}`);

        const userKey = await ServerEncryptionService.getOrCreateKey(userId);

        for (const entry of entries as LegacyEntry[]) {
          totalProcessed++;

          try {
            // Skip if already encrypted (string instead of object)
            if (typeof entry.encrypted_blob === 'string') {
              console.log(`Entry ${entry.id} already encrypted, skipping`);
              continue;
            }

            // Extract sensitive data from legacy format
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

            // Encrypt the data
            const encryptedBlob = ServerEncryptionService.encrypt(sensitiveData, userKey);

            // Update the entry
            const { error: updateError } = await supabase
              .from('entries')
              .update({
                encrypted_blob: encryptedBlob,
                updated_at: new Date().toISOString()
              })
              .eq('id', entry.id);

            if (updateError) {
              console.error(`Failed to update entry ${entry.id}:`, updateError);
              totalErrors++;
            } else {
              totalEncrypted++;
              console.log(`Encrypted entry ${entry.id}`);
            }

          } catch (entryError) {
            console.error(`Error processing entry ${entry.id}:`, entryError);
            totalErrors++;
          }
        }

        // Store the encryption key for this user (you'll need a way to sync this back to client)
        // Option 1: Store in a separate table
        await supabase
          .from('user_encryption_keys')
          .upsert({
            user_id: userId,
            encryption_key: userKey,
            created_at: new Date().toISOString()
          });

        console.log(`Completed migration for user ${userId}`);

      } catch (userError) {
        console.error(`Error migrating user ${userId}:`, userError);
        totalErrors++;
      }
    }

    console.log('\n=== Migration Summary ===');
    console.log(`Total entries processed: ${totalProcessed}`);
    console.log(`Total entries encrypted: ${totalEncrypted}`);
    console.log(`Total errors: ${totalErrors}`);
    console.log('Migration completed!');

  } catch (error) {
    console.error('Migration failed:', error);
  }
}

// Run the migration
if (require.main === module) {
  migrateAllEntries()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error('Migration script failed:', error);
      process.exit(1);
    });
}

export { migrateAllEntries };