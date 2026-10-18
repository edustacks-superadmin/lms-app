const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

function loadEnv(filename) {
    try {
        const envPath = path.resolve(__dirname, '..', filename);
        if (!fs.existsSync(envPath)) return;
        const envFile = fs.readFileSync(envPath, 'utf8');
        envFile.split('\n').forEach(line => {
            const match = line.match(/^\s*([\w_.]+)\s*=\s*(.*)?\s*$/);
            if (match) {
                const key = match[1];
                let value = match[2] || '';
                if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
                    value = value.slice(1, -1);
                }
                process.env[key] = value;
            }
        });
    } catch (e) { }
}

// Load .env first, then .env.local to override
loadEnv('.env');
loadEnv('.env.local');

async function main() {
    if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
        console.error('Missing Supabase credentials in environment.');
        return;
    }

    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL,
        process.env.SUPABASE_SERVICE_ROLE_KEY
    );

    console.log('Checking counts via Supabase...');

    // Count chapters with testpress_id
    const { count: chaptersCount, error: chError } = await supabase
        .from('chapters')
        .select('*', { count: 'exact', head: true })
        .not('testpress_id', 'is', null);

    if (chError) console.error('Chapters error:', chError);
    else console.log(`Synced Chapters Count: ${chaptersCount}`);

    // Count courses with testpress_id
    const { count: coursesCount, error: coError } = await supabase
        .from('courses')
        .select('*', { count: 'exact', head: true })
        .not('testpress_id', 'is', null);

    if (coError) console.error('Courses error:', coError);
    else console.log(`Total Courses with Testpress ID: ${coursesCount}`);
}

main();
