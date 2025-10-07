// Create a test script: scripts/test-migration.ts
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const SUPABASE_URL = process.env.SUPABASE_URL!;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(
  SUPABASE_URL,
  SUPABASE_SERVICE_ROLE_KEY,
);

// Copy your exact encryption logic
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

function decrypt(encryptedData: string, key: string): any {
  const encrypted = Buffer.from(encryptedData, 'base64').toString('binary');
  let decrypted = '';
  for (let i = 0; i < encrypted.length; i++) {
    const keyChar = key.charCodeAt(i % key.length);
    const encryptedChar = encrypted.charCodeAt(i);
    decrypted += String.fromCharCode(encryptedChar ^ keyChar);
  }
  return JSON.parse(decrypted);
}

async function testOneEntry() {
  console.log('Fetching one test entry...');
  
  // Get ONE entry
  const { data: entries } = await supabase
    .from('entries')
    .select('*')
    .limit(1);
  
  if (!entries || entries.length === 0) {
    console.log('No entries found');
    return;
  }
  
  const entry = entries[0];
  console.log('\n--- Original Entry ---');
  console.log('ID:', entry.id);
  console.log('User:', entry.user_id);
  console.log('Blob type:', typeof entry.encrypted_blob);
  console.log('Blob preview:', JSON.stringify(entry.encrypted_blob).substring(0, 100));
  
  // Skip if already encrypted
  if (typeof entry.encrypted_blob === 'string') {
    console.log('\nEntry already encrypted!');
    return;
  }
  
  // Generate key
  const key = generateKey();
  console.log('\n--- Encryption Test ---');
  console.log('Generated key length:', key.length);
  
  // Encrypt
  const sensitiveData = {
    title: entry.encrypted_blob.title,
    body: entry.encrypted_blob.body,
    photoUris: entry.encrypted_blob.photoUris,
    tags: entry.encrypted_blob.tags,
  };
  
  const encrypted = encrypt(sensitiveData, key);
  console.log('Encrypted length:', encrypted.length);
  console.log('Encrypted preview:', encrypted.substring(0, 50) + '...');
  
  // Decrypt to verify
  const decrypted = decrypt(encrypted, key);
  console.log('\n--- Decryption Test ---');
  console.log('Decrypted title:', decrypted.title);
  console.log('Decrypted body:', decrypted.body?.substring(0, 50));
  
  // Verify integrity
  const originalTitle = entry.encrypted_blob.title;
  const decryptedTitle = decrypted.title;
  
  if (originalTitle === decryptedTitle) {
    console.log('\n✅ SUCCESS: Encryption/Decryption working correctly!');
    console.log('Data integrity verified.');
  } else {
    console.log('\n❌ ERROR: Data mismatch!');
    console.log('Original:', originalTitle);
    console.log('Decrypted:', decryptedTitle);
  }
}

testOneEntry().catch(console.error);