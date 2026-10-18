import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function setAdminRole() {
    const email = 'maheshiesacademy@gmail.com';

    console.log(`Setting admin role for: ${email}`);

    const { data, error } = await supabase
        .from('members')
        .update({ role: 'admin' })
        .eq('email', email)
        .select();

    if (error) {
        console.error('Error updating role:', error);
    } else {
        console.log('✅ Successfully updated to admin:', data);
    }
}

setAdminRole();
