import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import readline from 'readline';

// ==========================================
// CONFIGURATION
// ==========================================

const SUPABASE_URL = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c';
const INPUT_FILE = 'testpress_users.csv';
const DEFAULT_PASSWORD = 'TestpressUser123';

const TESTPRESS_BASE_URL = 'https://thapovaninstitute.testpress.in/';
const TESTPRESS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6MSwiZXhwIjoxNzY0ODU0MjI2LCJlbWFpbCI6Im1haGVzaGllc2FjYWRlbXlAZ21haWwuY29tIiwiaWQiOjEsImluc3RpdHV0ZSI6MTM2NX0.UdPdy10rR--SFCExJUp8eNyHz9EacR3lisGSPGjjFVQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function processLineByLine() {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║   MIGRATING USERS TO SUPABASE              ║');
    console.log('╚════════════════════════════════════════════╝\n');

    if (!fs.existsSync(INPUT_FILE)) {
        console.error(`❌ Input file ${INPUT_FILE} not found.`);
        return;
    }

    const fileStream = fs.createReadStream(INPUT_FILE);
    const rl = readline.createInterface({
        input: fileStream,
        crlfDelay: Infinity
    });

    let headers = [];
    let count = 0;
    const MAX_USERS = 5;

    const TARGET_EMAIL = 'logiarchitect@gmail.com';

    console.log(`🔍 Searching for ${TARGET_EMAIL} via API...`);

    // Fetch directly from API
    const searchUrl = `${TESTPRESS_BASE_URL}api/v2.5/admin/users/?email=${TARGET_EMAIL}`;

    try {
        const response = await fetch(searchUrl, {
            headers: { 'Authorization': `JWT ${TESTPRESS_TOKEN}` }
        });

        if (response.ok) {
            const data = await response.json();
            if (data.results && data.results.length > 0) {
                const user = data.results[0];
                console.log(`✅ Found user in API: ${user.username}`);
                await migrateUser(user);
            } else {
                console.log('❌ User not found in Testpress API.');
            }
        } else {
            console.log(`❌ API Error: ${response.status}`);
        }
    } catch (e) {
        console.error('API Fetch Error:', e);
    }

    return; // Stop here, don't read CSV

    for await (const line of rl) {
        // Parse CSV line
        const row = parseCSVLine(line);

        if (count === 0) {
            headers = row;
            count++;
            continue;
        }

        const userData = {};
        headers.forEach((h, i) => {
            userData[h] = row[i];
        });

        if (userData.email === TARGET_EMAIL) {
            console.log(`\n🎯 Found target user: ${TARGET_EMAIL}`);
            await migrateUser(userData);
            found = true;
            break;
        }

        count++;
    }

    if (!found) {
        console.log(`\n❌ User with email ${TARGET_EMAIL} not found in the CSV file.`);
    }
}

function parseCSVLine(text) {
    const result = [];
    let cell = '';
    let inQuotes = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(cell);
            cell = '';
        } else {
            cell += char;
        }
    }
    result.push(cell);
    return result.map(c => c.replace(/^"|"$/g, '').replace(/""/g, '"')); // Unquote
}

async function migrateUser(tpUser) {
    const email = tpUser.email;
    const username = tpUser.username;
    const name = (tpUser.first_name || '') + ' ' + (tpUser.last_name || '');
    const phone = tpUser.phone_number || tpUser.mobile || '';

    if (!email) {
        console.log(`⚠️ Skipping user ${username}: No email provided.`);
        return;
    }

    console.log(`\n👤 Processing: ${username} (${email})`);

    // 1. Sign Up User
    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: email,
        password: DEFAULT_PASSWORD,
        options: {
            data: {
                full_name: name.trim(),
                username: username,
                role: 'student'
            }
        }
    });

    if (authError) {
        console.log(`   ❌ Auth SignUp Failed: ${authError.message}`);
        // If user already exists, we might still want to update their profile in 'members'
        if (!authError.message.includes('already registered')) {
            return;
        }
        console.log(`   ℹ️ User might already exist. Attempting to update profile...`);
    } else {
        console.log(`   ✅ Auth Account Created (ID: ${authData.user?.id})`);
    }

    // 2. Update/Insert into Members table
    // We try to update first (in case trigger created it), if not, we insert.

    const memberData = {
        email: email,
        name: name.trim() || username,
        phone_number: phone,
        role: 'Student',
        status: 'Active',
        joining_date: new Date().toISOString(),
        // Add other fields if available and mapped
    };

    // Check if member exists
    const { data: existingMember } = await supabase
        .from('members')
        .select('id')
        .eq('email', email)
        .single();

    if (existingMember) {
        // Update
        const { error: updateError } = await supabase
            .from('members')
            .update(memberData)
            .eq('email', email);

        if (updateError) console.log(`   ❌ Member Update Failed: ${updateError.message}`);
        else console.log(`   ✅ Member Profile Updated`);
    } else {
        // Insert
        const { error: insertError } = await supabase
            .from('members')
            .insert([memberData]);

        if (insertError) console.log(`   ❌ Member Insert Failed: ${insertError.message}`);
        else console.log(`   ✅ Member Profile Inserted`);
    }
}

processLineByLine();
