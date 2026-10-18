const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Missing Supabase credentials in .env.local');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function migrate() {
    console.log('Starting migration...');

    // 1. Fetch all exam configurations
    const { data: configs, error: configError } = await supabase
        .from('exam_configurations')
        .select('id, exam_tag, vacancies');

    if (configError) {
        console.error('Error fetching configs:', configError);
        return;
    }

    console.log(`Found ${configs.length} configurations to process.`);

    for (const config of configs) {
        console.log(`Processing configuration: ${config.exam_tag} (${config.id})`);

        const vacancies = config.vacancies || {};
        const posts = vacancies.posts || vacancies.CivilAE_Group?.post_breakdown || [];

        if (!Array.isArray(posts) || posts.length === 0) {
            console.log(`No posts found for ${config.exam_tag}.`);
            continue;
        }

        for (const post of posts) {
            console.log(`  Migrating post: ${post.code} - ${post.post_name || post.dept}`);

            // 2. Insert into exam_posts
            const { data: postRecord, error: postError } = await supabase
                .from('exam_posts')
                .upsert({
                    config_id: config.id,
                    post_code: post.code,
                    post_name: post.post_name || '',
                    dept: post.dept || ''
                }, { onConflict: 'config_id, post_code' })
                .select()
                .single();

            if (postError) {
                console.error(`    Error upserting post ${post.code}:`, postError);
                continue;
            }

            // 3. Clear existing vacancies for this post to avoid duplicates on re-run
            await supabase.from('post_vacancies').delete().eq('post_id', postRecord.id);

            // 4. Map legacy fields to normalized vacancies
            const communities = ['gt', 'bc', 'bcm', 'mbc', 'sc', 'sca', 'st'];
            const vacancyRows = [];

            communities.forEach(comm => {
                // Generic Community Name Mapping
                const commName = comm.toUpperCase() === 'MBC' ? 'MBC/DC' : comm.toUpperCase();

                const mappings = [
                    { field: `${comm}_gen`, gender: 'General', pstm: false },
                    { field: `${comm}_women_gen`, gender: 'Women', pstm: false },
                    { field: `${comm}_pstm`, gender: 'General', pstm: true },
                    { field: `${comm}_women_pstm`, gender: 'Women', pstm: true }
                ];

                mappings.forEach(m => {
                    const count = parseInt(post[m.field]) || 0;
                    if (count > 0) {
                        vacancyRows.push({
                            post_id: postRecord.id,
                            community: commName,
                            gender: m.gender,
                            is_pstm: m.pstm,
                            seat_count: count,
                            vacancy_type: 'Regular'
                        });
                    }
                });
            });

            if (vacancyRows.length > 0) {
                const { error: vacancyError } = await supabase
                    .from('post_vacancies')
                    .insert(vacancyRows);

                if (vacancyError) {
                    console.error(`    Error inserting vacancies for post ${post.code}:`, vacancyError);
                } else {
                    console.log(`    Successfully migrated ${vacancyRows.length} vacancy rules.`);
                }
            }
        }
    }

    console.log('Migration complete!');
}

migrate();
