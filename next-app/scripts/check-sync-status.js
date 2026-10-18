const { createClient } = require('@supabase/supabase-js');
const path = require('path');
const fs = require('fs');

// Load environment variables
const envPath = path.join(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
        env[parts[0].trim()] = parts.slice(1).join('=').trim().replace(/(^"|"$)/g, '');
    }
});

const supabaseUrl = env['NEXT_PUBLIC_SUPABASE_URL'];
const supabaseKey = env['SUPABASE_SERVICE_ROLE_KEY'];

if (!supabaseUrl || !supabaseKey) {
    console.error('Supabase credentials not found in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStatus() {
    console.log('Checking Sync Status...');

    const { count: examCount, error: examError } = await supabase
        .from('exams')
        .select('*', { count: 'exact', head: true })
        .not('testpress_id', 'is', null);

    if (examError) console.error('Error fetching exams:', examError.message);
    else console.log(`Synced Exams: ${examCount}`);

    const { count: contentCount, error: contentError } = await supabase
        .from('chapter_contents')
        .select('*', { count: 'exact', head: true })
        .not('testpress_id', 'is', null);

    if (contentError) console.error('Error fetching contents:', contentError.message);
    else console.log(`Synced Chapter Contents: ${contentCount}`);

    // Also check course_exams links
    const { count: linkCount, error: linkError } = await supabase
        .from('course_exams')
        .select('*', { count: 'exact', head: true });

    if (linkError) console.error('Error fetching course_exams:', linkError.message);
    else console.log(`Course-Exam Links: ${linkCount}`);
}

checkStatus();
