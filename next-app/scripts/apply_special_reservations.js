
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const CONFIG_ID = 1;

const csvData = `post_code,community,gender,is_pstm,special_category,seat_count
1678,ST,General,No,LV,1
1661,GT,General,No,HH,1
1661,GT,Women,No,HH,1
1661,BC,General,No,HH,1
1661,SC,General,No,HH,1
1660,BC,General,No,HH,1
1660,SC,General,No,HH,1
3269,MBC/DC,General,No,LV (Backlog),1
3269,BC,General,No,HH,1
1667,GT,General,No,LV,1
1667,GT,General,No,HH/HI,1
1667,BC,General,No,LD/LC/DF/AC,1
1667,SC,General,No,LV,1
3270,GT,General,No,SLD (Backlog),1
1656,GT,General,No,HH (Backlog),1
1656,MBC/DC,General,No,HH (Backlog),1
1656,GT,General,No,HH,1
1656,GT,Women,No,LD(OA,OL)/DF/AC,1
1656,BC,General,No,LD(OA,OL)/DF/AC,1
1656,SC,General,No,HH,1
1759,BC,General,No,LC/DF (Backlog),1
2069,GT,General,No,LV,1
3609,SCA,Women,Yes,DW,1
3607,SCA,Women,Yes,DW,1
3266,BC,General,No,HH (Backlog),1
3266,SC,General,No,HH (Backlog),1
3266,SC,General,No,LD(OA,OL)/LC/DF/AC (Backlog),1
3266,GT,General,No,HH,2
3266,GT,General,No,LD(OA,OL)/LC/DF/AC,2
3266,GT,Women,No,HH,2
3266,BC,General,No,HH,1
3266,BC,General,No,LD(OA,OL)/LC/DF/AC,1
3266,BC,Women,No,LD(OA,OL)/LC/DF/AC,1
3266,MBC/DC,General,No,HH,1
3266,MBC/DC,General,No,LD(OA,OL)/LC/DF/AC,2
3266,SC,General,No,HH,1
3266,SC,Women,No,LD(OA,OL)/LC/DF/AC,1
3266,ST,General,No,LD(OA,OL)/LC/DF/AC,1
1824,GT,General,No,ASD/ID/SLD/MI/MD,1
1824,GT,General,No,EXSER,1
3273,GT,Women,No,HH,1`;

async function updateSpecialReservations() {
    try {
        console.log('--- STARTING UPDATE ---');

        // 1. Fetch Config
        const { data: config, error: fetchError } = await supabase
            .from('exam_configurations')
            .select('*')
            .eq('id', CONFIG_ID)
            .single();

        if (fetchError) throw fetchError;
        if (!config) throw new Error('Config not found');

        let vacancies = config.vacancies || {};
        let posts = vacancies.posts || [];

        // 2. Parse CSV
        const rows = csvData.trim().split('\n').slice(1);
        const updates = rows.map(line => {
            const parts = line.split(',');
            return {
                post_code: parts[0]?.trim(),
                community: parts[1]?.trim(),
                gender: parts[2]?.trim(),
                is_pstm: parts[3]?.trim().toLowerCase() === 'yes',
                special_category: parts[4]?.trim(),
                seat_count: parseInt(parts[5]?.trim()) || 0
            };
        });

        const postCodesToUpdate = [...new Set(updates.map(u => u.post_code))];

        // 3. Update JSON locally
        const updatedPostsJson = posts.map(post => {
            const code = post.code?.toString();
            if (postCodesToUpdate.includes(code)) {
                const postUpdates = updates.filter(u => u.post_code === code);
                return {
                    ...post,
                    special_vacancies: postUpdates.map(u => ({
                        community: u.community,
                        gender: u.gender,
                        is_pstm: u.is_pstm,
                        special_category: u.special_category,
                        seat_count: u.seat_count
                    }))
                };
            }
            return post;
        });

        vacancies.posts = updatedPostsJson;

        // 4. Update exam_configurations JSON
        const { error: jsonError } = await supabase
            .from('exam_configurations')
            .update({ vacancies })
            .eq('id', CONFIG_ID);

        if (jsonError) throw jsonError;
        console.log('Updated JSON column in exam_configurations.');

        // 5. Relational Sync (only for the posts we touched)
        // A. Get post IDs
        const { data: examPosts, error: postsError } = await supabase
            .from('exam_posts')
            .select('id, post_code')
            .eq('config_id', CONFIG_ID)
            .in('post_code', postCodesToUpdate);

        if (postsError) throw postsError;

        console.log(`Syncing relational data for ${examPosts.length} posts...`);

        for (const postRecord of examPosts) {
            const code = postRecord.post_code;
            const postUpdates = updates.filter(u => u.post_code === code);

            // Delete existing Special vacancies for this post
            const { error: delError } = await supabase
                .from('post_vacancies')
                .delete()
                .eq('post_id', postRecord.id)
                .eq('vacancy_type', 'Special');

            if (delError) throw delError;

            // Insert new ones
            const rowsToInsert = postUpdates.map(u => ({
                post_id: postRecord.id,
                community: u.community,
                gender: u.gender,
                is_pstm: u.is_pstm,
                special_category: u.special_category,
                vacancy_type: 'Special',
                seat_count: u.seat_count
            }));

            if (rowsToInsert.length > 0) {
                const { error: insError } = await supabase
                    .from('post_vacancies')
                    .insert(rowsToInsert);
                if (insError) throw insError;
            }
            console.log(`Synced post ${code}.`);
        }

        console.log('--- SUCCESS ---');

    } catch (err) {
        console.error('FAILED:', err);
    }
}

updateSpecialReservations();
