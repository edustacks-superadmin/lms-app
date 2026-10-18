
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function restoreToCsv() {
    const preSyncContent = fs.readFileSync('scripts/pre_sync_records.md', 'utf-8');
    const lines = preSyncContent.split('\n').filter(l => l.match(/^\| \d+ \|/));

    const preSyncRecords = lines.map(line => {
        const parts = line.split('|').map(p => p.trim());
        return {
            reg: parts[3],
            name: parts[4]
        };
    });

    console.log(`Extracted ${preSyncRecords.length} records from MD.`);

    const csvLines = [];

    for (const record of preSyncRecords) {
        // Search in members by username (which often is the reg no) or email/name
        const { data: members, error } = await supabase
            .from('members')
            .select('birth_date, email, phone_number, display_name, username')
            .or(`username.eq.${record.reg},display_name.ilike.${record.name}`);

        if (error) {
            console.error(`Error for ${record.reg}:`, error);
            continue;
        }

        let dob = '';
        let email = '';
        let phone = '';
        let name = record.name;

        if (members && members.length > 0) {
            // Prefer exact username match or the first entry with a DOB
            const bestMatch = members.find(m => m.username === record.reg) || members.find(m => m.birth_date) || members[0];
            if (bestMatch.birth_date) {
                const date = new Date(bestMatch.birth_date);
                dob = `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
            }
            email = bestMatch.email || '';
            phone = bestMatch.phone_number || '';
            name = bestMatch.display_name || record.name;
        }

        csvLines.push(`${record.reg},${dob},${name},${email},${phone}`);
    }

    fs.writeFileSync('scripts/restored_students.csv', 'registration_number,dob,name,email,whatsapp_number\n' + csvLines.join('\n'));
    console.log('Restoration CSV created: scripts/restored_students.csv');
}

restoreToCsv();
