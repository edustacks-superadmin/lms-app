
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const EXAM_TAG = 'TNPSC_CTSE_DIP_ITI_2025';

const targetCodes = [
    '3617', '3619', '3636', '3646', '3648', '3101', '3104', '3651', '3115', '1731',
    '3652', '3661', '3656', '3688', '3684', '3683', '3687', '3686', '3685', '3657',
    '3700', '3699', '3655', '3694', '3690', '3689', '3693', '3692', '3691', '3660',
    '3658', '3695', '3697', '3696', '3549', '3550', '3591', '3659'
];

async function run() {
    console.log(`🚀 Clearing vacancies for ${targetCodes.length} posts in ${EXAM_TAG}...`);

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

    const communities = ['gt', 'bc', 'bcm', 'mbc', 'sc', 'sca', 'st'];
    const suffixes = ['_gen', '_women_gen', '_pstm', '_women_pstm'];

    // 2. Reset JSON
    console.log("📝 Resetting JSON matrix values...");
    let resetCount = 0;
    posts.forEach(post => {
        if (targetCodes.includes(post.code)) {
            communities.forEach(c => {
                suffixes.forEach(s => {
                    post[`${c}${s}`] = 0;
                });
            });
            post.special_vacancies = [];
            resetCount++;
        }
    });

    const { error: updateConfigError } = await supabase
        .from('exam_configurations')
        .update({ vacancies: vacancies })
        .eq('id', configId);

    if (updateConfigError) {
        console.error("❌ Error updating config table:", updateConfigError.message);
        return;
    }

    console.log(`✅ JSON updated for ${resetCount} posts.`);

    // 3. Sync Relational Tables
    console.log("🔗 Deleting records from post_vacancies table...");

    const { data: examPosts, error: postsError } = await supabase
        .from('exam_posts')
        .select('id, post_code')
        .eq('config_id', configId)
        .in('post_code', targetCodes);

    if (postsError) {
        console.error("❌ Error fetching exam posts:", postsError.message);
        return;
    }

    const postIds = examPosts.map(p => p.id);

    if (postIds.length > 0) {
        const { error: deleteError } = await supabase
            .from('post_vacancies')
            .delete()
            .in('post_id', postIds);

        if (deleteError) {
            console.error("❌ Error deleting vacancies:", deleteError.message);
            return;
        }
        console.log(`✅ Deleted vacancy records for ${postIds.length} found post IDs.`);
    } else {
        console.log("⚠️ No matching rows found in exam_posts table for these codes.");
    }

    console.log("🎉 Cleanup complete.");
}

run();
