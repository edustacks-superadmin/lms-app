require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const newPostsData = [
    {
        "code": "3232",
        "post_name": "Assistant Engineer (Civil)",
        "dept": "Chennai Metropolitan Development Authority (CMDA)",
        "gt_gen": 1,
        "gt_women_gen": 0,
        "gt_pstm": 0,
        "gt_women_pstm": 0,
        "bc_gen": 0,
        "bc_women_gen": 0,
        "bc_pstm": 0,
        "bc_women_pstm": 0,
        "bcm_gen": 0,
        "bcm_women_gen": 0,
        "bcm_pstm": 0,
        "bcm_women_pstm": 0,
        "mbc_gen": 1,
        "mbc_women_gen": 0,
        "mbc_pstm": 0,
        "mbc_women_pstm": 0,
        "sc_gen": 0,
        "sc_women_gen": 0,
        "sc_pstm": 0,
        "sc_women_pstm": 0,
        "sca_gen": 0,
        "sca_women_gen": 0,
        "sca_pstm": 1,
        "sca_women_pstm": 0,
        "st_gen": 0,
        "st_women_gen": 0,
        "st_pstm": 0,
        "st_women_pstm": 0
    },
    {
        "code": "3531",
        "post_name": "Assistant Engineer (Civil)",
        "dept": "Tamil Nadu Housing Board",
        "gt_gen": 2,
        "gt_women_gen": 1,
        "gt_pstm": 0,
        "gt_women_pstm": 0,
        "bc_gen": 2,
        "bc_women_gen": 0,
        "bc_pstm": 0,
        "bc_women_pstm": 1,
        "bcm_gen": 0,
        "bcm_women_gen": 0,
        "bcm_pstm": 0,
        "bcm_women_pstm": 0,
        "mbc_gen": 1,
        "mbc_women_gen": 0,
        "mbc_pstm": 1,
        "mbc_women_pstm": 0,
        "sc_gen": 0,
        "sc_women_gen": 0,
        "sc_pstm": 0,
        "sc_women_pstm": 1,
        "sca_gen": 0,
        "sca_women_gen": 0,
        "sca_pstm": 0,
        "sca_women_pstm": 0,
        "st_gen": 0,
        "st_women_gen": 0,
        "st_pstm": 0,
        "st_women_pstm": 0
    },
    {
        "code": "3663",
        "post_name": "Assistant Engineer (Civil)",
        "dept": "Tamil Nadu Maritime Board",
        "gt_gen": 0,
        "gt_women_gen": 0,
        "gt_pstm": 0,
        "gt_women_pstm": 0,
        "bc_gen": 0,
        "bc_women_gen": 0,
        "bc_pstm": 0,
        "bc_women_pstm": 0,
        "bcm_gen": 0,
        "bcm_women_gen": 0,
        "bcm_pstm": 0,
        "bcm_women_pstm": 0,
        "mbc_gen": 0,
        "mbc_women_gen": 1,
        "mbc_pstm": 0,
        "mbc_women_pstm": 0,
        "sc_gen": 1,
        "sc_women_gen": 0,
        "sc_pstm": 0,
        "sc_women_pstm": 0,
        "sca_gen": 0,
        "sca_women_gen": 0,
        "sca_pstm": 0,
        "sca_women_pstm": 0,
        "st_gen": 0,
        "st_women_gen": 0,
        "st_pstm": 0,
        "st_women_pstm": 0
    },
    {
        "code": "3270",
        "post_name": "Assistant Engineer (Civil)",
        "dept": "Tamil Nadu Water Supply and Drainage Board (Backlog)",
        // 0 seats for normal categories as per schema
        "gt_gen": 0,
        "gt_women_gen": 0,
        "gt_pstm": 0,
        "gt_women_pstm": 0,
        "bc_gen": 0,
        "bc_women_gen": 0,
        "bc_pstm": 0,
        "bc_women_pstm": 0,
        "bcm_gen": 0,
        "bcm_women_gen": 0,
        "bcm_pstm": 0,
        "bcm_women_pstm": 0,
        "mbc_gen": 0,
        "mbc_women_gen": 0,
        "mbc_pstm": 0,
        "mbc_women_pstm": 0,
        "sc_gen": 0,
        "sc_women_gen": 0,
        "sc_pstm": 0,
        "sc_women_pstm": 0,
        "sca_gen": 0,
        "sca_women_gen": 0,
        "sca_pstm": 0,
        "sca_women_pstm": 0,
        "st_gen": 0,
        "st_women_gen": 0,
        "st_pstm": 0,
        "st_women_pstm": 0
    },
    {
        "code": "3603",
        "post_name": "Assistant Engineer (Civil)",
        "dept": "Hindu Religious and Charitable Endowments (HR&CE)",
        "gt_gen": 6,
        "gt_women_gen": 3,
        "gt_pstm": 2,
        "gt_women_pstm": 1,
        "bc_gen": 7,
        "bc_women_gen": 3,
        "bc_pstm": 1,
        "bc_women_pstm": 0,
        "bcm_gen": 0,
        "bcm_women_gen": 0,
        "bcm_pstm": 0,
        "bcm_women_pstm": 0,
        "mbc_gen": 5,
        "mbc_women_gen": 2,
        "mbc_pstm": 1,
        "mbc_women_pstm": 0,
        "sc_gen": 3,
        "sc_women_gen": 2,
        "sc_pstm": 1,
        "sc_women_pstm": 0,
        "sca_gen": 0,
        "sca_women_gen": 0,
        "sca_pstm": 1,
        "sca_women_pstm": 1,
        "st_gen": 0,
        "st_women_gen": 0,
        "st_pstm": 0,
        "st_women_pstm": 0
    }
];

async function seed() {
    console.log('🚀 Seeding Remaining 5 Posts...');

    // Fetch relevant config
    const { data: configs } = await supabase
        .from('exam_configurations')
        .select('*')
        .ilike('exam_tag', '%TNPSC%');

    if (!configs || configs.length === 0) return console.error('No config found');

    const targetConfig = configs.find(c => c.vacancies?.posts?.length > 0) || configs[0];
    const vacancies = targetConfig.vacancies || { posts: [], groups: [] };
    let currentPosts = vacancies.posts || [];

    // Update Logic: Upsert
    let updatedCount = 0;

    newPostsData.forEach(newPost => {
        const idx = currentPosts.findIndex(p => p.code === newPost.code);
        if (idx >= 0) {
            currentPosts[idx] = { ...currentPosts[idx], ...newPost };
        } else {
            currentPosts.push(newPost);
        }
        updatedCount++;
    });

    // Save
    const { error } = await supabase
        .from('exam_configurations')
        .update({ vacancies: { ...vacancies, posts: currentPosts } })
        .eq('id', targetConfig.id);

    if (error) console.error('❌ Update failed:', error);
    else console.log(`✅ Successfully synced ${updatedCount} remaining posts!`);
}

seed();
