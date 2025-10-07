// scripts/rollback-migration.ts
import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function rollback(userId: string) {
  console.log('Rolling back migration...');
  
  // Restore from backup
  const { data: backup } = await supabase
    .from('entries_backup')
    .select('*')
    .eq('user_id', userId);
  
  if (!backup) {
    console.log('No backup found');
    return;
  }
  
  console.log(`Restoring ${backup.length} entries`);
  
  for (const entry of backup) {
    await supabase
      .from('entries')
      .update({ encrypted_blob: entry.encrypted_blob })
      .eq('id', entry.id);
  }
  
  // Delete the encryption key
  await supabase
    .from('user_encryption_keys')
    .delete()
    .eq('user_id', userId);
  
  console.log('✅ Rollback complete');
}

rollback('c43ebaba-985e-4693-b0ba-ef96e242665a').catch(console.error);