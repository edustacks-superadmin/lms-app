
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debug() {
  console.log("Fetching posts with batches...");
  const { data, error } = await supabase
    .from('posts')
    .select(`
      id,
      title,
      post_batches (
        batch_id
      )
    `)
    .limit(5);

  if (error) {
    console.error("Error fetching posts:", error);
  } else {
    console.log("Posts Data:", JSON.stringify(data, null, 2));
  }
}

debug();
