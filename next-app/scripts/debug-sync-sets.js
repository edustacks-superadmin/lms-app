const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const { createClient } = require('@supabase/supabase-js');

// --- Supabase Setup ---
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('❌ Missing Supabase credentials.');
    console.error('Tried loading from:', path.join(__dirname, '..', '.env.local'));
    console.log('NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? 'Found' : 'Missing');
    console.log('SUPABASE_SERVICE_ROLE_KEY:', supabaseServiceKey ? 'Found' : 'Missing');
    process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});

// --- Testpress Setup ---
const TESTPRESS_BASE_URL = process.env.TESTPRESS_BASE_URL;
const TESTPRESS_USERNAME = process.env.TESTPRESS_USERNAME;
const TESTPRESS_PASSWORD = process.env.TESTPRESS_PASSWORD;

async function getTestpressToken() {
    const loginUrl = `${TESTPRESS_BASE_URL}/api/v2.5/auth-token/`;
    console.log(`Authenticating with ${loginUrl}...`);

    // Using simple fetch here
    const response = await fetch(loginUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: TESTPRESS_USERNAME, password: TESTPRESS_PASSWORD })
    });

    if (!response.ok) {
        throw new Error(`Auth failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.token;
}

// --- Sync Logic ---
async function runSync() {
    try {
        console.log('🚀 Starting Debug Sync...');
        const token = await getTestpressToken();
        console.log('✅ Auth successful.');

        let url = `${TESTPRESS_BASE_URL}/api/v2.5/admin/question_sets/`;

        while (url) {
            console.log(`fetching ${url}...`);
            const response = await fetch(url, { headers: { 'Authorization': `JWT ${token}` } });

            if (!response.ok) {
                const txt = await response.text();
                throw new Error(`Fetch failed: ${response.status} ${txt}`);
            }

            const data = await response.json();
            const sets = data.results || [];
            console.log(`Found ${sets.length} sets.`);

            for (const set of sets) {
                console.log(`Processing set: ${set.id} - ${set.title || set.name}`);

                const folderData = {
                    name: set.title || set.name || "Untitled Folder",
                    testpress_id: set.id,
                    institute_id: 10,
                    description: set.tree_path || ""
                };

                // Try upsert
                // Note: supabase-js upsert works if there is a unique constraint on testpress_id
                const { error } = await supabaseAdmin
                    .from('question_folders')
                    .upsert(folderData, { onConflict: 'testpress_id' });

                if (error) {
                    console.error('SQL Error:', error);
                    // If it is the UUID vs Int issue, we will see it here
                } else {
                    console.log(`Saved ${set.id}`);
                }
            }

            url = data.next;
        }
        console.log('Done.');

    } catch (err) {
        console.error('CRASH:', err);
    }
}

runSync();
