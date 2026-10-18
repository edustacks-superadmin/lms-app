const { createClient } = require('@supabase/supabase-js');
const XLSX = require('xlsx');
const path = require('path');
require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const FILES = [
    'CTSE 10_2025 (Diploma_ITI Level) (Responses).xlsx',
    'CTSE 09_2025 (Non-Interview Posts) (Responses).xlsx'
];

async function fix() {
    console.log('🔍 Identifying members with corrupted .html URLs...');
    const { data: members, error } = await supabase
        .from('members')
        .select('id, email, photo_url')
        .ilike('photo_url', '%.html%');

    if (error) {
        console.error(error);
        return;
    }

    if (members.length === 0) {
        console.log('No corrupted members found.');
        return;
    }

    console.log(`Found ${members.length} members to fix.`);

    // Load Excel data into a map: email -> drive_url
    const driveMap = new Map();
    for (const fileName of FILES) {
        const filePath = path.join(process.cwd(), fileName);
        if (!require('fs').existsSync(filePath)) {
            console.log(`File not found: ${fileName}`);
            continue;
        }
        const workbook = XLSX.readFile(filePath);
        const sheet = workbook.Sheets[workbook.SheetNames[0]];
        const data = XLSX.utils.sheet_to_json(sheet);
        for (const row of data) {
            const email = row['email']?.trim();
            const photoUrl = (row['Passport size photo'] || row['photo_url'])?.trim();
            if (email && photoUrl && photoUrl.includes('drive.google.com')) {
                driveMap.set(email.toLowerCase(), photoUrl);
            }
        }
    }

    console.log(`Mapped ${driveMap.size} emails to Drive URLs from Excel.`);

    let fixed = 0;
    for (const member of members) {
        const originalUrl = driveMap.get(member.email.toLowerCase());
        if (originalUrl) {
            console.log(`Restoring ${member.email}: ${originalUrl}`);
            const { error: updateError } = await supabase
                .from('members')
                .update({ photo_url: originalUrl })
                .eq('id', member.id);

            if (updateError) {
                console.error(`Failed to restore ${member.email}:`, updateError.message);
            } else {
                fixed++;
            }
        } else {
            console.log(`⚠️ Could not find original URL for ${member.email} in Excel files.`);
        }
    }

    console.log(`\nFixed ${fixed} records. Now re-run migrate-drive-to-r2.js`);
}

fix().catch(console.error);
