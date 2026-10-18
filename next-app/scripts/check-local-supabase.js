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
                process.env[match[1]] = match[2]?.replace(/^['"]|['"]$/g, '');
            }
        });
    } catch (e) { }
}
loadEnv('.env');
loadEnv('.env.local');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
    console.log('Checking hierarchy with Supabase client...');

    // 1. Find Course
    const { data: courses, error: cErr } = await supabase
        .from('courses')
        .select('*')
        .ilike('title', '%398%');

    if (cErr || !courses.length) {
        console.error('Course not found:', cErr);
        return;
    }
    const course = courses[0];
    console.log(`Course: ${course.title} (ID: ${course.id})`);

    // 2. Fetch all chapters for course
    const { data: chapters, error: chErr } = await supabase
        .from('chapters')
        .select('id, name, parent_id, testpress_id')
        .eq('course_id', course.id);

    if (chErr) {
        console.error('Error fetching chapters:', chErr);
        return;
    }
    console.log(`Total chapters: ${chapters.length}`);

    // List all chapters to inspect IDs
    console.log('\n--- All Chapters ---');
    chapters.forEach(c => {
        console.log(`[${c.id}] TP:${c.testpress_id} | PID:${c.parent_id} | ${c.name}`);
    });

    const som = chapters.find(c => c.name.includes('Strength of Materials'));
    if (som) {
        console.log(`\n"Strength of Materials" points to parent: ${som.parent_id}`);
        // Find who is parent 24 (if that was the case)
        const parentWhoIs24 = chapters.find(c => c.id === som.parent_id);
        if (parentWhoIs24) {
            console.log(`The parent (${som.parent_id}) is: ${parentWhoIs24.name} (TP: ${parentWhoIs24.testpress_id})`);
        } else {
            console.log(`Parent ID ${som.parent_id} not found in this course list.`);
        }
    }
}

main();
