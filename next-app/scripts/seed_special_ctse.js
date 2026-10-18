
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const EXAM_TAG = 'TNPSC_CTSE_DIP_ITI_2025';

const csvData = `post_code,community,gender,is_pstm,special_category,seat_count
3617,GT,General,No,LV/VI,1
3617,GT,General,No,EXSER,1
3619,GT,General,No,LV/VI,1
3619,GT,General,No,EXSER,2
3619,GT,Women,No,HH/HI,1
3619,BC,General,No,ASD/ID/SLD/MI/MD,1
3619,BC,General,No,EXSER,1
3619,MBC,General,No,LD/CP/LC/DF/AC/MuD,1
3619,MBC,General,No,EXSER,1
3619,SC,General,No,EXSER,1
3621,GT,General,No,LV/VI,1
3621,GT,General,No,EXSER,1
3621,BC,General,No,EXSER,1
3621,MBC,General,No,LD/CP/LC/DF/AC/MuD,1
3621,MBC,General,No,EXSER,1
3625,GT,General,No,LV/VI,1
3625,GT,General,No,EXSER,1
3625,BC,General,No,EXSER,1
3625,MBC,General,No,LD/CP/LC/DF/AC/MuD,1
3629,GT,General,No,LV/VI,1
3629,GT,General,No,EXSER,2
3629,GT,Women,No,HH/HI,1
3629,BC,General,No,ASD/ID/SLD/MI/MD,1
3629,BC,General,No,EXSER,1
3629,MBC,General,No,LD/CP/LC/DF/AC/MuD,1
3620,MBC,General,No,EXSER,1
3629,SC,General,No,EXSER,1
3631,GT,General,No,LV/VI,1
3631,GT,General,No,EXSER,1
3631,BC,General,No,EXSER,1
3631,MBC,General,No,LD/CP/LC/DF/AC/MuD,1
3631,MBC,General,No,EXSER,1
3634,GT,General,No,LV/VI,1
3634,GT,General,No,EXSER,1
3634,GT,Women,No,HH/HI,1
3634,BC,General,No,EXSER,1
3634,MBC,General,No,LD/CP/LC/DF/AC/MuD,1
3634,MBC,General,No,EXSER,1
3634,SC,General,No,EXSER,1
3636,GT,General,No,LV/VI,1
3636,GT,General,No,EXSER,1
3636,BC,General,No,EXSER,1
3636,MBC,General,No,LD/CP/LC/DF/AC/MuD,1
3636,MBC,General,No,EXSER,1
3648,GT,General,No,LV/VI,1
3101,GT,General,No,LV/VI,1
3101,GT,General,No,EXSER,1
3101,BC,Women,No,DW,1
3101,MBC,General,No,LD/CP/LC/DF/AC/MuD,1
3101,MBC,General,No,EXSER,1
3101,SCA,General,No,EXSER,1
3104,BC,General,No,LV,1
3104,SC,Women,No,DW,1
3115,GT,General,No,ASD/ID/SLD/MI/MD,1
3115,GT,General,No,EXSER,1
3115,BC,General,No,LV/VI,1
3688,GT,Women,No,DW,1
3686,GT,General,No,LV/VI,1
3686,GT,Women,No,DW,1
3686,BC,Women,No,DW,1
3686,MBC,Women,No,DW,1
3686,SC,Women,No,DW,1
3694,GT,Women,No,DW,1
3694,BC,Women,No,DW,1
3694,MBC,Women,No,DW,1
3692,GT,Women,No,DW,1
3692,BC,Women,No,DW,1
3692,MBC,Women,No,DW,1
3696,GT,Women,No,DW,1
3696,BC,Women,No,DW,1
3696,MBC,Women,No,DW,1
3696,SC,Women,No,DW,1
3561,BC,General,No,EXSER,1
3561,MBC,General,No,LD/CP/LC/DF/AC/MuD,1
3549,GT,General,No,EXSER,1
3549,BC,Women,No,DW,1
3549,MBC,General,No,EXSER,1
3549,SC,General,No,LD/CP/LC/DF/AC/MuD,1
3550,BC,Women,No,DW,1
3591,GT,General,No,LV/VI,2
3591,GT,General,No,HH/HI,1
3591,GT,General,No,ASD/ID/SLD/MI/MD,1
3591,GT,General,No,EXSER,6
3591,GT,General,Yes,EXSER,1
3591,GT,Women,No,LD/CP/LC/DF/AC/MuD,1
3591,GT,Women,No,DW,4
3591,GT,Women,Yes,DW,1
3591,BC,General,No,LV/VI,1
3591,BC,General,No,LD/CP/LC/DF/AC/MuD,2
3591,BC,General,No,ASD/ID/SLD/MI/MD,1
3591,BC,General,No,EXSER,5
3591,BC,General,Yes,EXSER,1
3591,BC,Women,No,LV/VI,1
3591,BC,Women,No,HH/HI,1
3591,BC,Women,No,DW,3
3591,BC,Women,Yes,DW,1
3591,BCM,General,No,ASD/ID/SLD/MI/MD,1
3591,BCM,General,No,EXSER,1
3591,BCM,Women,No,DW,1
3591,MBC,General,No,LV/VI,1
3591,MBC,General,No,HH/HI,1
3591,MBC,General,No,ASD/ID/SLD/MI/MD,2
3591,MBC,General,No,EXSER,3
3591,MBC,General,Yes,EXSER,1
3591,MBC,Women,No,LD/CP/LC/DF/AC/MuD,1
3591,MBC,Women,No,DW,2
3591,MBC,Women,Yes,DW,1
3591,SCA,General,No,EXSER,1
3591,SC,General,No,HH/HI,1
3591,SC,General,No,EXSER,3
3591,SC,General,Yes,EXSER,1
3591,SC,Women,No,HH/HI,1
3591,SC,Women,No,DW,1
3591,SC,Women,Yes,DW,1
3591,ST,General,No,EXSER,1`;

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
        const seats = parseInt(parts[parts.length - 1]) || 0;
        const category = parts.slice(4, parts.length - 1).join(',');

        if (!code) return;

        if (!reservationsByPost[code]) reservationsByPost[code] = [];
        reservationsByPost[code].push({
            community: comm === 'MBC' ? 'MBC/DC' : (comm === 'MBC/DC' ? 'MBC/DC' : comm),
            gender: gender,
            is_pstm: pstm === 'Yes' || pstm === 'YES',
            special_category: category,
            seat_count: seats
        });
    });

    // 3. Update JSON
    console.log("📝 Updating local JSON...");
    posts.forEach(post => {
        if (reservationsByPost[post.code]) {
            post.special_vacancies = reservationsByPost[post.code];
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
