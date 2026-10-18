const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

async function run() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !supabaseKey) {
            console.error('Missing env vars. NEXT_PUBLIC_SUPABASE_URL:', !!supabaseUrl, 'SUPABASE_SERVICE_ROLE_KEY:', !!supabaseKey);
            return;
        }

        const supabase = createClient(supabaseUrl, supabaseKey);

        console.log('--- Debugging Subject Question Counts ---');

        // 1. Search for "382 Arch U1"
        console.log('Searching for "382 Arch U1"...');
        const { data: subjects, error: subError } = await supabase
            .from('subjects')
            .select('id, name, institute_id, parent_id')
            .ilike('name', '%382 Arch U1%'); // Exact match from screenshot

        if (subError) throw subError;

        if (subjects.length > 0) {
            for (const sub of subjects) {
                console.log(`\nFound Subject: ID=${sub.id}, Name="${sub.name}", InstituteID=${sub.institute_id}, ParentID=${sub.parent_id}`);

                // Count questions for this subject
                const { count, error: qError } = await supabase
                    .from('questions')
                    .select('*', { count: 'exact', head: true })
                    .eq('subject_id', sub.id);

                console.log(`-> Direct Questions Count: ${count} (Error: ${qError?.message})`);

                // Check institute_id of first 5 questions for this subject
                const { data: qs } = await supabase
                    .from('questions')
                    .select('id, institute_id')
                    .eq('subject_id', sub.id)
                    .limit(5);

                if (qs && qs.length > 0) {
                    console.log(`-> Sample Questions Institute IDs: ${qs.map(q => q.institute_id).join(', ')}`);
                } else {
                    console.log('-> No questions found for this subject.');
                }
            }
        } else {
            console.log('Subject "382 Arch U1" not found.');
        }

        // 2. Check "Strength of Materials" (ID 2 in screenshot)
        console.log('\nChecking "Strength of Materials" (ID 2)...');
        const { data: smSub } = await supabase
            .from('subjects')
            .select('*')
            .eq('name', 'Strength of Materials')
            .limit(1);

        if (smSub && smSub.length > 0) {
            const sub = smSub[0];
            console.log(`Found Subject: ID=${sub.id}, Name="${sub.name}", InstituteID=${sub.institute_id}`);
            const { count } = await supabase
                .from('questions')
                .select('*', { count: 'exact', head: true })
                .eq('subject_id', sub.id);
            console.log(`-> Direct Questions Count: ${count}`);
        } else {
            console.log('Subject "Strength of Materials" not found.');
        }

    } catch (e) {
        console.error('Script Error:', e);
    }
}

run();
