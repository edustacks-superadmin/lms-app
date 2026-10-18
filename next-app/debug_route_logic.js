const { createClient } = require('@supabase/supabase-js');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '.env.local') });

async function run() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
        const supabaseAdmin = createClient(supabaseUrl, supabaseKey);

        const instituteId = 10; // Known from debug
        const pageSize = 20;
        const from = 0;
        const to = 19;

        console.log(`Fetching subjects for Institute ${instituteId}...`);

        // 1. Get Top Level
        const { data: topLevelSubjects, error: topError } = await supabaseAdmin
            .from('subjects')
            .select('id, name, parent_id')
            .is('parent_id', null)
            .eq('institute_id', instituteId)
            .range(from, to)
            .order('name', { ascending: true });

        if (topError) throw topError;
        console.log(`Top Level Subjects: ${topLevelSubjects.length}`);

        // 2. Get All Children
        const { data: allChildren, error: childError } = await supabaseAdmin
            .from('subjects')
            .select('id, name, parent_id')
            .not('parent_id', 'is', null)
            .eq('institute_id', instituteId)
            .order('name', { ascending: true });

        if (childError) throw childError;
        console.log(`All Children: ${allChildren.length}`);

        // 3. Collect IDs
        const allSubjectIds = [
            ...(topLevelSubjects || []).map(s => s.id),
            ...(allChildren || []).map(s => s.id)
        ];
        console.log(`Total Subject IDs to check: ${allSubjectIds.length}`);

        // 4. Fetch Question Counts
        let questionCounts = {};
        if (allSubjectIds.length > 0) {
            console.log('Fetching questions with .in() query...');

            // Supabase default limit is 1000. 
            // If we have > 1000 questions total for these subjects, we will miss some!
            // THIS is likely the bug. We need to paginate or verify the limit.

            const { data: countData, error: countError, count: totalQ } = await supabaseAdmin
                .from('questions')
                .select('subject_id', { count: 'exact' }) // Added count to check total matches
                .eq('institute_id', instituteId)
                .in('subject_id', allSubjectIds); // No limit specified, defaults to 1000?

            if (countError) console.error(countError);

            console.log(`Fetched Question Rows: ${countData?.length}`);
            console.log(`Total Real Matches (count: exact): ${totalQ}`);

            if (countData) {
                countData.forEach(q => {
                    if (q.subject_id) {
                        questionCounts[q.subject_id] = (questionCounts[q.subject_id] || 0) + 1;
                    }
                });
            }
        }

        // Check our specific subject "382 Arch U1"
        const target = topLevelSubjects.find(s => s.name.includes('382 Arch U1'));
        if (target) {
            console.log(`\nTarget Subject "${target.name}" (ID: ${target.id})`);
            console.log(`Direct Count in Map: ${questionCounts[target.id] || 0}`);

            // Perform recursive aggregation logic
            const subjectMap = {};
            [...(topLevelSubjects || []), ...(allChildren || [])].forEach(s => {
                subjectMap[s.id] = {
                    ...s,
                    own_count: questionCounts[s.id] || 0,
                    total_count: 0,
                    children: []
                };
            });

            Object.values(subjectMap).forEach(node => {
                if (node.parent_id && subjectMap[node.parent_id]) {
                    subjectMap[node.parent_id].children.push(node);
                }
            });

            const computeTotalCount = (nodeId) => {
                const node = subjectMap[nodeId];
                if (!node) return 0;
                let sum = node.own_count;
                node.children.forEach(child => sum += computeTotalCount(child.id));
                node.total_count = sum;
                return sum;
            };

            const total = computeTotalCount(target.id);
            console.log(`Recursive Total Count: ${total}`);
        } else {
            console.log('Target subject not in top level list (maybe pagination?).');
        }

    } catch (e) {
        console.error(e);
    }
}

run();
