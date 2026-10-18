
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    "https://xalbtjoykovnlbjeddtv.supabase.co",
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c"
);

async function getLogo() {
    const { data, error } = await supabase
        .from('institute_settings')
        .select('name, logo_url, slug')
        .eq('slug', 'maheshiesacademy')
        .single();

    if (error) {
        console.error('Error:', error);
    } else {
        console.log('Institute Data:', JSON.stringify(data, null, 2));
    }
}

getLogo();
