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
    console.log('Inspecting Chapter 24...');

    const { data: chapter, error } = await supabase
        .from('chapters')
        .select('*')
        .eq('id', 24)
        .single();

    if (error) {
        console.error('Error fetching chapter 24:', error);
        return;
    }

    console.log(`Chapter 24: ${chapter.name}`);
    console.log(`Course ID: ${chapter.course_id}`);
    console.log(`Parent ID: ${chapter.parent_id}`);
    console.log(`Testpress ID: ${chapter.testpress_id}`);

    // Check if Course ID 5 matches this
    console.log(`Is it in Course 5? ${chapter.course_id === 5}`);
}

main();
