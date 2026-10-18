import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testMembersAccess() {
    console.log('Testing members table access...');

    const email = 'maheshiesacademy@gmail.com';

    try {
        console.log('Attempting to fetch role for:', email);

        const { data, error } = await supabase
            .from('members')
            .select('role')
            .eq('email', email)
            .single();

        if (error) {
            console.error('❌ Error:', error);
        } else {
            console.log('✅ Success! Role:', data?.role);
        }
    } catch (err) {
        console.error('❌ Catch error:', err);
    }
}

testMembersAccess();
