import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://wjanjnoxzizxxhtbwyqd.supabase.co';
const SUPABASE_SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndqYW5qbm94eml6eHhodGJ3eXFkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4MjUxMDMzNCwiZXhwIjoyMDk4MDg2MzM0fQ.vl0gz_0FHJwHZvHi7Y8XimfDaOvpu2sgFa-hEZcqh4Y';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function test() {
  const { data, count, error } = await supabase
    .from('listings')
    .select('*, user:users!listings_user_id_fkey(*)', { count: 'exact' })
    .order('created_at', { ascending: false })
    .range(0, 10);

  if (error) {
    console.error('Join error:', error);
  } else {
    console.log('Success! Total listings count:', count, 'Fetched rows:', data.length);
    if (data[0]) {
      console.log('Sample listing:', data[0].title, '| User:', data[0].user?.full_name);
    }
  }
}

test();
