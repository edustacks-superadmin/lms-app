const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');

const supabaseUrl = 'https://xalbtjoykovnlbjeddtv.supabase.co';
// Using the key from check_photos.js
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c';

const supabase = createClient(supabaseUrl, supabaseKey);

async function listPhotos() {
    try {
        console.log('Reading member.xlsx...');
        const workbook = XLSX.readFile('member.xlsx');
        const firstSheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[firstSheetName];

        // Get members with headers
        const data = XLSX.utils.sheet_to_json(worksheet);

        // "mail id" seems to be the key based on previous inspection
        // Let's normalize keys just in case
        const members = data.map(row => {
            const keys = Object.keys(row);
            const emailKey = keys.find(k => k.trim().toLowerCase().includes('mail'));
            return emailKey ? row[emailKey] : null;
        }).filter(email => email);

        if (members.length === 0) {
            console.log('No members found in Excel.');
            return;
        }

        const top5 = members.slice(0, 5);
        console.log(`Checking photos for first ${top5.length} members:`, top5);

        const { data: dbMembers, error } = await supabase
            .from('members')
            .select('email, photo_url')
            .in('email', top5);

        if (error) {
            console.error('Error fetching members:', error);
            return;
        }

        console.log('\n--- PHOTO URLs ---');
        top5.forEach(email => {
            const member = dbMembers.find(m => m.email === email);
            if (member) {
                console.log(`[${email}]: ${member.photo_url || 'NULL'}`);
            } else {
                console.log(`[${email}]: NOT FOUND IN DB`);
            }
        });
        console.log('------------------\n');

    } catch (err) {
        console.error('Error:', err);
    }
}

listPhotos();
