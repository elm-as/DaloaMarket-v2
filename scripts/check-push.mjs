import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wjanjnoxzizxxhtbwyqd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqYW5qbm94eml6eHhodGJ3eXFkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjUxMDMzNCwiZXhwIjoyMDk4MDg2MzM0fQ.vl0gz_0FHJwHZvHi7Y8XimfDaOvpu2sgFa-hEZcqh4Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function check() {
  const { data, error } = await supabase.from('push_subscriptions').select('*');
  if (error) {
    console.error('Error fetching subscriptions:', error);
    return;
  }
  console.log('Total subscriptions found:', data.length);
  for (const row of data) {
    console.log(`- User: ${row.user_id} | Created: ${row.created_at} | Endpoint: ${row.endpoint.slice(0, 70)}...`);
  }
}

check();
