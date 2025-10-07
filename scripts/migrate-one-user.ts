import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function generateKey(): string {
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

function encrypt(data: any, key: string): string {
  const jsonString = JSON.stringify(data);
  let encrypted = '';
  for (let i = 0; i < jsonString.length; i++) {
    const keyChar = key.charCodeAt(i % key.length);
    const dataChar = jsonString.charCodeAt(i);
    encrypted += String.fromCharCode(dataChar ^ keyChar);
  }
  return Buffer.from(encrypted).toString('base64');
}

async function migrateOneUser(userId: string) {
  console.log(`\n=== Migrating user: ${userId} ===\n`);
  
  const { data: entries } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', userId);
  
  if (!entries || entries.length === 0) {
    console.log('No entries found');
    return;
  }
  
  console.log(`Found ${entries.length} entries`);
  const key = generateKey();
  console.log(`Generated key: ${key.substring(0, 10)}...`);
  
  // Store key first
  const { error: keyError } = await supabase
    .from('user_encryption_keys')
    .upsert({
      user_id: userId,
      encryption_key: key,
      created_at: new Date().toISOString()
    });
  
  if (keyError) {
    console.error('Failed to store encryption key:', keyError);
    return;
  }
  
  console.log('✓ Encryption key stored\n');
  
  let success = 0;
  let skipped = 0;
  let errors = 0;
  
  for (const entry of entries) {
    try {
      // Skip if already encrypted
      if (typeof entry.encrypted_blob === 'string') {
        console.log(`  - Skipped ${entry.id} (already encrypted)`);
        skipped++;
        continue;
      }
      
      const sensitiveData = {
        title: entry.encrypted_blob.title,
        body: entry.encrypted_blob.body,
        photoUris: entry.encrypted_blob.photoUris || [],
        tags: entry.encrypted_blob.tags || [],
        audioUri: entry.encrypted_blob.audioUri,
        transcription: entry.encrypted_blob.transcription,
        themes: entry.encrypted_blob.themes,
        sentiment: entry.encrypted_blob.sentiment,
      };
      
      const encrypted = encrypt(sensitiveData, key);
      
      // Update entry
      const { error } = await supabase
        .from('entries')
        .update({ encrypted_blob: encrypted })
        .eq('id', entry.id);
      
      if (error) {
        console.error(`  ✗ Error updating entry ${entry.id}:`, error);
        errors++;
      } else {
        console.log(`  ✓ Encrypted entry ${entry.id}`);
        success++;
      }
    } catch (e) {
      console.error(`  ✗ Failed to process entry ${entry.id}:`, e);
      errors++;
    }
  }
  
  console.log(`\n=== Summary ===`);
  console.log(`Success: ${success}`);
  console.log(`Skipped: ${skipped}`);
  console.log(`Errors: ${errors}`);
  
  if (errors === 0) {
    console.log('\n✅ Migration completed successfully!');
  } else {
    console.log('\n⚠️  Migration completed with some errors');
  }
}

// Get user ID from command line argument
const USER_ID = process.argv[2] || 'd506e965-b2b6-4e7d-b3cd-4f0d1325d493';

console.log('Starting migration for user:', USER_ID);
migrateOneUser(USER_ID).catch(console.error);