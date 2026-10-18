require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
    console.log('🌱 Seeding Post 3269 Vacancies...');

    // 1. Fetch Config
    // We target the latest config that looks like TNPSC AE
    // Or simpler, fetch ALL and update ANY that have a 'vacancies' object, 
    // but safer to target specific tag if possible.
    const { data: configs } = await supabase
        .from('exam_configurations')
        .select('*')
        .ilike('exam_tag', '%TNPSC%');

    if (!configs || configs.length === 0) {
        console.error('❌ No TNPSC configurations found.');
        return;
    }

    // Use the most likely active one (or all)
    // Let's update the first matching one for now, or the one with existing posts
    const targetConfig = configs.find(c => c.vacancies?.posts) || configs[0];
    console.log(`Targeting Config: ${targetConfig.exam_name} (${targetConfig.exam_tag})`);

    const vacancies = targetConfig.vacancies || { posts: [], groups: [] };
    const posts = vacancies.posts || [];

    // 2. Define New Data
    // Total should be 42
    const newPostData = {
        code: "3269",
        dept: "Tamil Nadu Pollution Control Board (Revised via Addendum 9C)",
        // GT: 7, 3W, 2P, 1WP = 13
        gt_gen: 7,
        gt_women_gen: 3,
        gt_pstm: 2,
        gt_women_pstm: 1,

        // BC: 3+1(HH)=4, 2W, 2P, 1WP = 9
        bc_gen: 4,
        bc_women_gen: 2,
        bc_pstm: 2,
        bc_women_pstm: 1,

        // BCM: 1 = 1
        bcm_gen: 1,

        // MBC: 4, 2W, 2P = 8 (Excluding 1 BL LV)
        mbc_gen: 4,
        mbc_women_gen: 2,
        mbc_pstm: 2,
        mbc_women_pstm: 0,

        // SC: 4, 3W, 1P = 8
        sc_gen: 4,
        sc_women_gen: 3,
        sc_pstm: 1,
        sc_women_pstm: 0,

        // SCA: 1P = 1
        sca_gen: 0,
        sca_pstm: 1,

        // ST: 1WP = 1
        st_gen: 0,
        st_women_pstm: 1
    };

    // 3. Update or Add
    const idx = posts.findIndex(p => p.code === "3269");
    if (idx >= 0) {
        console.log('Updating existing post 3269...');
        posts[idx] = { ...posts[idx], ...newPostData };
    } else {
        console.log('Adding new post 3269...');
        posts.push(newPostData);
    }

    // 4. Save Back
    const { error } = await supabase
        .from('exam_configurations')
        .update({ vacancies: { ...vacancies, posts } })
        .eq('id', targetConfig.id);

    if (error) console.error('❌ Update failed:', error);
    else console.log('✅ Successfully seeded Post 3269 data! (Total 42 seats)');
}

seed();
