
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const EXAM_TAG = 'TNPSC_AE_2025';

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

async function run() {
    console.log(`🚀 Starting update for ${EXAM_TAG}...`);

    // 1. Fetch Config
    const { data: config, error: fetchError } = await supabase
        .from('exam_configurations')
        .select('*')
        .eq('exam_tag', EXAM_TAG)
        .single();

    if (fetchError || !config) {
        console.error("❌ Config not found:", fetchError?.message);
        return;
    }

    const configId = config.id;
    const vacancies = config.vacancies || { posts: [], groups: [], community_mapping: [] };
    const posts = vacancies.posts || [];

    // 2. Parse CSV
    const rows = csvData.split('\n').slice(1);
    const reservationsByPost = {};

    rows.forEach(row => {
        const parts = row.split(',').map(v => v.trim());
        if (parts.length < 5) return;

        const code = parts[0];
        const comm = parts[1];
        const gender = parts[2];
        const pstm = parts[3];
        // The last part is seat_count, everything in between is category
        const seats = parts[parts.length - 1];
        const category = parts.slice(4, parts.length - 1).join(',');

        if (!code) return;

        if (!reservationsByPost[code]) reservationsByPost[code] = [];
        reservationsByPost[code].push({
            community: comm === 'MBC' ? 'MBC/DC' : (comm === 'MBC/DC' ? 'MBC/DC' : comm),
            gender: gender,
            is_pstm: pstm === 'Yes' || pstm === 'YES',
            special_category: category,
            seat_count: parseInt(seats) || 0
        });
    });

    // 3. Update JSON
    console.log("📝 Updating local JSON...");
    posts.forEach(post => {
        if (reservationsByPost[post.code]) {
            post.special_vacancies = reservationsByPost[post.code];
        } else if (post.special_vacancies) {
            // Option: Clear if not in CSV? 
            // User said "Update it to table" - usually implies fresh data.
            // I'll keep existing ones for posts NOT in CSV to be safe?
            // Actually, for the posts in CSV, I replace.
        }
    });

    // Update config table
    const { error: updateConfigError } = await supabase
        .from('exam_configurations')
        .update({ vacancies: vacancies })
        .eq('id', configId);

    if (updateConfigError) {
        console.error("❌ Error updating config table:", updateConfigError.message);
        return;
    }

    console.log("✅ Config JSON updated.");

    // 4. Sync Relational Tables
    console.log("🔗 Syncing relational tables...");

    // Fetch all exam_posts for this config
    const { data: examPosts, error: postsError } = await supabase
        .from('exam_posts')
        .select('id, post_code')
        .eq('config_id', configId);

    if (postsError) {
        console.error("❌ Error fetching exam posts:", postsError.message);
        return;
    }

    const updatedPostIds = [];
    const newVacancyRows = [];

    for (const postCode of Object.keys(reservationsByPost)) {
        const postRecord = examPosts.find(p => p.post_code === postCode);
        if (!postRecord) {
            console.warn(`⚠️ Warning: Post code ${postCode} not found in exam_posts table.`);
            continue;
        }

        updatedPostIds.push(postRecord.id);

        reservationsByPost[postCode].forEach(res => {
            newVacancyRows.push({
                post_id: postRecord.id,
                community: res.community,
                gender: res.gender,
                is_pstm: res.is_pstm,
                special_category: res.special_category,
                seat_count: res.seat_count,
                vacancy_type: 'Special'
            });
        });
    }

    if (updatedPostIds.length > 0) {
        // Delete existing special vacancies for these specific posts
        const { error: deleteError } = await supabase
            .from('post_vacancies')
            .delete()
            .eq('vacancy_type', 'Special')
            .in('post_id', updatedPostIds);

        if (deleteError) {
            console.error("❌ Error deleting old special vacancies:", deleteError.message);
            return;
        }

        // Insert new ones
        if (newVacancyRows.length > 0) {
            const { error: insertError } = await supabase
                .from('post_vacancies')
                .insert(newVacancyRows);

            if (insertError) {
                console.error("❌ Error inserting new special vacancies:", insertError.message);
                return;
            }
        }
    }

    console.log(`✅ Success! Updated ${updatedPostIds.length} posts with ${newVacancyRows.length} special reservations.`);
}

run();
