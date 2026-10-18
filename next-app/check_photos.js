const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkEmails() {
    const emails = ['kajies2015@gmail.com', 'partha.bods91@gmail.com'];
    const { data, error } = await supabase
        .from('members')
        .select('email, photo_url')
        .in('email', emails);

    if (error) {
        console.error('Error fetching members:', error);
        return;
    }

    console.log('Results:', JSON.stringify(data, null, 2));

    if (data.length < 2 && data.length > 0) {
        console.log('Only found one of the emails.');
    } else if (data.length === 0) {
        console.log('Found neither of the emails.');
        return;
    }

    const user1 = data.find(r => r.email === emails[0]);
    const user2 = data.find(r => r.email === emails[1]);

    if (user1) {
        console.log(`${user1.email}: ${user1.photo_url}`);
    } else {
        console.log(`${emails[0]}: NOT FOUND`);
    }

    if (user2) {
        console.log(`${user2.email}: ${user2.photo_url}`);
    } else {
        console.log(`${emails[1]}: NOT FOUND`);
    }

    if (user1 && user2) {
        if (user1.photo_url === user2.photo_url) {
            console.log('MATCH: The photo URLs are the SAME.');
        } else {
            console.log('MISMATCH: The photo URLs are DIFFERENT.');
        }
    }
}

checkEmails();
