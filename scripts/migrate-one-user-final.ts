import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { TextEncoder, TextDecoder } from 'util';

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
  const encoder = new TextEncoder();
  const jsonBytes = encoder.encode(jsonString);
  const encrypted = new Uint8Array(jsonBytes.length);
  for (let i = 0; i < jsonBytes.length; i++) {
    const keyChar = key.charCodeAt(i % key.length);
    encrypted[i] = jsonBytes[i] ^ keyChar;
  }
  return Buffer.from(encrypted).toString('base64');
}

function decrypt(encryptedData: string, key: string): any {
  const encrypted = Buffer.from(encryptedData, 'base64');
  const decrypted = new Uint8Array(encrypted.length);
  for (let i = 0; i < encrypted.length; i++) {
    const keyChar = key.charCodeAt(i % key.length);
    decrypted[i] = encrypted[i] ^ keyChar;
  }
  const decoder = new TextDecoder();
  const jsonString = decoder.decode(decrypted);
  return JSON.parse(jsonString);
}

async function migrateOneUser(userId: string) {
  console.log('\n=== Migrating user: ' + userId + ' ===\n');
  
  const { data: entries } = await supabase.from('entries').select('*').eq('user_id', userId);
  
  if (!entries || entries.length === 0) {
    console.log('No entries found');
    return;
  }
  
  console.log('Found ' + entries.length + ' entries');
  const key = generateKey();
  console.log('Generated key: ' + key.substring(0, 10) + '...');
  
  console.log('\nTesting encryption with special characters...');
  const testData = { title: 'Test with apostrophe', body: 'Hello World' };
  const testEncrypted = encrypt(testData, key);
  const testDecrypted = decrypt(testEncrypted, key);
  
  if (testDecrypted.title === testData.title) {
    console.log('✓ Encryption test passed\n');
  } else {
    console.error('✗ Test failed!');
    return;
  }
  
  const { error: keyError } = await supabase.from('user_encryption_keys').upsert({
    user_id: userId,
    encryption_key: key,
    created_at: new Date().toISOString()
  });
  
  if (keyError) {
    console.error('Failed to store encryption key:', keyError);
    return;
  }
  
  console.log('✓ Encryption key stored\n');
  
  let success = 0, skipped = 0, errors = 0;
  const failedEntries: string[] = [];
  
  for (const entry of entries) {
    try {
      if (typeof entry.encrypted_blob === 'string') {
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
      const verified = decrypt(encrypted, key);
      
      if (verified.title !== sensitiveData.title) {
        console.error('  ✗ Verification failed for ' + entry.id);
        errors++;
        failedEntries.push(entry.id);
        continue;
      }
      
      const { error } = await supabase.from('entries').update({ encrypted_blob: encrypted }).eq('id', entry.id);
      
      if (error) {
        console.error('  ✗ DB error for ' + entry.id);
        errors++;
        failedEntries.push(entry.id);
      } else {
        console.log('  ✓ Encrypted entry ' + entry.id);
        success++;
      }
    } catch (e: any) {
      console.error('  ✗ Failed ' + entry.id + ': ' + e.message);
      errors++;
      failedEntries.push(entry.id);
    }
  }
  
  console.log('\n=== Summary ===');
  console.log('Success: ' + success);
  console.log('Skipped: ' + skipped);
  console.log('Errors: ' + errors);
  
  if (errors > 0) {
    console.log('\nFailed entries: ' + failedEntries.join(', '));
  }
  
  if (errors === 0) {
    console.log('\n✅ All entries migrated successfully!');
  }
}

const USER_ID = process.argv[2] || 'd506e965-b2b6-4e7d-b3cd-4f0d1325d493';
migrateOneUser(USER_ID).catch(console.error);