require('dotenv').config({ path: '.env.local' });
const { PrismaClient } = require('@prisma/client');

// --- Testpress Setup ---
const TESTPRESS_BASE_URL = process.env.TESTPRESS_BASE_URL;
const TESTPRESS_USERNAME = process.env.TESTPRESS_USERNAME;
const TESTPRESS_PASSWORD = process.env.TESTPRESS_PASSWORD;

const prisma = new PrismaClient();

async function getTestpressToken() {
    const loginUrl = `${TESTPRESS_BASE_URL}/api/v2.5/auth-token/`;
    console.log(`Authenticating with ${loginUrl}...`);

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

async function runSync() {
    try {
        console.log('🚀 Starting Prisma Raw Sync...');
        const token = await getTestpressToken();
        console.log('✅ Auth successful.');

        let url = `${TESTPRESS_BASE_URL}/api/v2.5/admin/question_sets/`;
        let count = 0;

        while (url) {
            console.log(`Fetching ${url}...`);
            const response = await fetch(url, { headers: { 'Authorization': `JWT ${token}` } });

            if (!response.ok) {
                const txt = await response.text();
                throw new Error(`Fetch failed: ${response.status} ${txt}`);
            }

            const data = await response.json();
            const sets = data.results || [];

            for (const set of sets) {
                const name = set.title || set.name || "Untitled Folder";
                const testpress_id = set.id;
                const institute_id = 10;
                const description = set.tree_path || ""; // Flattening path into description

                // Raw Upsert for question_folders
                // Ensure table name is exactly as in DB (usually lowercase)
                const sql = `
                    INSERT INTO "question_folders" (name, testpress_id, institute_id, description)
                    VALUES ($1, $2, $3, $4)
                    ON CONFLICT (testpress_id) DO UPDATE SET
                    name = EXCLUDED.name,
                    description = EXCLUDED.description;
                `;

                try {
                    await prisma.$executeRawUnsafe(sql, name, testpress_id, institute_id, description);
                    // console.log(`Processed ${testpress_id}`);
                } catch (sqlErr) {
                    console.error(`Failed to save ${testpress_id}:`, sqlErr.message);
                }
                count++;
            }
            console.log(`Processed batch of ${sets.length}. Total so far: ${count}`);
            url = data.next;
        }

        console.log(`✅ Complete. Total synced: ${count}`);

    } catch (err) {
        console.error('CRASH:', err);
    } finally {
        await prisma.$disconnect();
    }
}

runSync();
