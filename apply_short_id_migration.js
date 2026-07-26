import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const envText = fs.readFileSync('.env', 'utf8');
const envVars = Object.fromEntries(
  envText.split('\n')
    .filter(line => line && !line.startsWith('#') && line.includes('='))
    .map(line => {
      const [key, ...val] = line.split('=');
      return [key.trim(), val.join('=').trim()];
    })
);

const supabaseUrl = envVars.VITE_SUPABASE_URL || 'https://wjanjnoxzizxxhtbwyqd.supabase.co';
const serviceRoleKey = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!serviceRoleKey) {
  console.error('SUPABASE_SERVICE_ROLE_KEY missing');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: { persistSession: false }
});

async function main() {
  const sql = fs.readFileSync('supabase/migrations/20260724_short_id_resolvers.sql', 'utf8');
  console.log('Applying migration SQL to Supabase...');

  // Execute SQL via Supabase REST RPC or raw SQL endpoint if configured
  const { data, error } = await supabase.rpc('exec_sql', { sql_query: sql });
  if (error) {
    console.log('RPC exec_sql error (expected if not present):', error.message);
  } else {
    console.log('Migration executed successfully:', data);
  }
}

main().catch(console.error);
