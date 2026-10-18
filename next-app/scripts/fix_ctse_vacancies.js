
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const EXAM_TAG = 'TNPSC_CTSE_DIP_ITI_2025';

const csvData = `post_code,community,gender,is_pstm,special_category,seat_count
3662,GT,General,No,None,1
3662,GT,Women,No,None,1
3662,BC,General,No,None,1
3662,MBC,General,No,None,1
3662,SCA,Women,Yes,None,1
3617,GT,General,No,None,3
3617,GT,General,Yes,None,1
3617,GT,General,No,LV/VI,1
3617,GT,General,No,EXSER,1
3617,GT,Women,No,None,3
3617,BC,General,No,None,4
3617,BC,General,Yes,None,1
3617,BC,Women,No,None,3
3617,BCM,General,No,None,1
3617,MBC,General,No,None,3
3617,MBC,General,Yes,None,1
3617,MBC,Women,No,None,2
3617,SCA,Women,Yes,None,1
3617,SC,General,No,None,2
3617,SC,General,Yes,None,1
3617,SC,Women,No,None,2
3619,GT,General,No,None,15
3619,GT,General,Yes,None,4
3619,GT,General,No,LV/VI,1
3619,GT,General,No,EXSER,2
3619,GT,Women,No,None,7
3619,GT,Women,Yes,None,2
3619,GT,Women,No,HH/HI,1
3619,BC,General,No,None,13
3619,BC,General,Yes,None,3
3619,BC,General,No,ASD/ID/SLD/MI/MD,1
3619,BC,General,No,EXSER,1
3619,BC,Women,No,None,7
3619,BC,Women,Yes,None,1
3619,BCM,General,No,None,2
3619,BCM,General,Yes,None,1
3619,BCM,Women,No,None,1
3619,MBC,General,No,None,10
3619,MBC,General,Yes,None,3
3619,MBC,General,No,LD/CP/LC/DF/AC/MuD,1
3619,MBC,General,No,EXSER,1
3619,MBC,Women,No,None,5
3619,MBC,Women,Yes,None,1
3619,SCA,General,No,None,1
3619,SCA,General,Yes,None,1
3619,SCA,Women,Yes,None,1
3619,SC,General,No,None,7
3619,SC,General,Yes,None,2
3619,SC,General,No,EXSER,1
3619,SC,Women,No,None,4
3619,SC,Women,Yes,None,1
3619,ST,General,Yes,None,1
3620,GT,General,No,None,1
3620,MBC,General,No,None,1
3620,SCA,Women,Yes,None,1
3621,GT,General,No,None,8
3621,GT,General,Yes,None,2
3621,GT,General,No,LV/VI,1
3621,GT,General,No,EXSER,1
3621,GT,Women,No,None,4
3621,GT,Women,Yes,None,1
3621,BC,General,No,None,7
3621,BC,General,Yes,None,2
3621,BC,General,No,EXSER,1
3621,BC,Women,No,None,3
3621,BC,Women,Yes,None,1
3621,BCM,General,No,None,1
3621,BCM,Women,No,None,1
3621,MBC,General,No,None,5
3621,MBC,General,Yes,None,1
3621,MBC,General,No,LD/CP/LC/DF/AC/MuD,1
3621,MBC,General,No,EXSER,1
3621,MBC,Women,No,None,3
3621,SCA,General,Yes,None,1
3621,SCA,Women,Yes,None,1
3621,SC,General,No,None,5
3621,SC,General,Yes,None,1
3621,SC,Women,No,None,3
3621,ST,General,Yes,None,1
3621,ST,General,No,Shortfall (SF),1
3623,GT,General,No,None,3
3623,GT,General,Yes,None,1
3623,GT,Women,No,None,2
3623,BC,General,No,None,3
3623,BC,General,Yes,None,1
3623,BC,Women,No,None,2
3623,BCM,General,No,None,1
3623,MBC,General,No,None,2
3623,MBC,General,Yes,None,1
3623,MBC,Women,No,None,2
3623,SCA,Women,Yes,None,1
3623,SC,General,No,None,2
3623,SC,General,Yes,None,1
3623,SC,Women,No,None,1
3623,ST,General,No,Shortfall (SF),1
3625,GT,General,No,None,5
3625,GT,General,Yes,None,2
3625,GT,General,No,LV/VI,1
3625,GT,General,No,EXSER,1
3625,GT,Women,No,None,3
3625,GT,Women,Yes,None,1
3625,BC,General,No,None,5
3625,BC,General,Yes,None,1
3625,BC,General,No,EXSER,1
3625,BC,Women,No,None,3
3625,BCM,General,No,None,1
3625,BCM,Women,No,None,1
3625,MBC,General,No,None,4
3625,MBC,General,Yes,None,1
3625,MBC,General,No,LD/CP/LC/DF/AC/MuD,1
3625,MBC,Women,No,None,2
3625,SCA,General,Yes,None,1
3625,SCA,Women,Yes,None,1
3625,SC,General,No,None,3
3625,SC,General,Yes,None,1
3625,SC,Women,No,None,2
3625,ST,General,No,Shortfall (SF),1
3629,GT,General,No,None,14
3629,GT,General,Yes,None,4
3629,GT,General,No,LV/VI,1
3629,GT,General,No,EXSER,2
3629,GT,Women,No,None,6
3629,GT,Women,Yes,None,2
3629,GT,Women,No,HH/HI,1
3629,BC,General,No,None,13
3629,BC,General,Yes,None,3
3629,BC,General,No,ASD/ID/SLD/MI/MD,1
3629,BC,General,No,EXSER,1
3629,BC,Women,No,None,7
3629,BC,Women,Yes,None,1
3629,BCM,General,No,None,2
3629,BCM,General,Yes,None,1
3629,BCM,Women,No,None,1
3629,MBC,General,No,None,9
3629,MBC,General,Yes,None,3
3629,MBC,General,No,LD/CP/LC/DF/AC/MuD,1
3629,MBC,General,No,EXSER,1
3629,MBC,Women,No,None,5
3629,MBC,Women,Yes,None,1
3629,SCA,General,No,None,1
3629,SCA,General,Yes,None,1
3629,SCA,Women,Yes,None,1
3629,SC,General,No,None,7
3629,SC,General,Yes,None,2
3629,SC,General,No,EXSER,1
3629,SC,Women,No,None,4
3629,SC,Women,Yes,None,1
3629,ST,General,Yes,None,1
3631,GT,General,No,None,6
3631,GT,General,Yes,None,2
3631,GT,General,No,LV/VI,1
3631,GT,General,No,EXSER,1
3631,GT,Women,No,None,4
3631,GT,Women,Yes,None,1
3631,BC,General,No,None,6
3631,BC,General,Yes,None,2
3631,BC,General,No,EXSER,1
3631,BC,Women,No,None,3
3631,BC,Women,Yes,None,1
3631,BCM,General,No,None,1
3631,BCM,Women,No,None,1
3631,MBC,General,No,None,4
3631,MBC,General,Yes,None,1
3631,MBC,General,No,LD/CP/LC/DF/AC/MuD,1
3631,MBC,General,No,EXSER,1
3631,MBC,Women,No,None,3
3631,SCA,General,Yes,None,1
3631,SCA,Women,Yes,None,1
3631,SC,General,No,None,4
3631,SC,General,Yes,None,1
3631,SC,Women,No,None,2
3631,ST,General,Yes,None,1
3631,ST,General,No,Shortfall (SF),1
3634,GT,General,No,None,11
3634,GT,General,Yes,None,3
3634,GT,General,No,LV/VI,1
3634,GT,General,No,EXSER,1
3634,GT,Women,No,None,5
3634,GT,Women,Yes,None,1
3634,GT,Women,No,HH/HI,1
3634,BC,General,No,None,10
3634,BC,General,Yes,None,3
3634,BC,General,No,EXSER,1
3634,BC,Women,No,None,5
3634,BC,Women,Yes,None,1
3634,BCM,General,No,None,1
3634,BCM,Women,No,None,1
3634,MBC,General,No,None,6
3634,MBC,General,Yes,None,2
3634,MBC,General,No,LD/CP/LC/DF/AC/MuD,1
3634,MBC,General,No,EXSER,1
3634,MBC,Women,No,None,4
3634,MBC,Women,Yes,None,1
3634,SCA,General,No,None,1
3634,SCA,General,Yes,None,1
3634,SCA,Women,Yes,None,1
3634,SC,General,No,None,6
3634,SC,General,Yes,None,1
3634,SC,General,No,EXSER,1
3634,SC,Women,No,None,3
3634,ST,General,Yes,None,1
3636,GT,General,No,None,8
3636,GT,General,Yes,None,3
3636,GT,General,No,LV/VI,1
3636,GT,General,No,EXSER,1
3636,GT,Women,No,None,4`;

async function run() {
    try {
        console.log(`🚀 Starting correction for ${EXAM_TAG}...`);

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

        // 2. Parse CSV into structured map
        const lines = csvData.trim().split('\n').filter(l => l.trim() !== '');
        const rows = lines.slice(1);
        const correctedData = {};

        rows.forEach(row => {
            const parts = row.split(',').map(v => v.trim());
            if (parts.length < 6) return; // Basic validation

            const code = parts[0];
            const comm = parts[1];
            const gender = parts[2];
            const pstm = parts[3];
            const category = parts[4];
            const seats = parseInt(parts[5]) || 0;

            if (!correctedData[code]) {
                correctedData[code] = {
                    regular: {
                        gt_gen: 0, gt_women_gen: 0, gt_pstm: 0, gt_women_pstm: 0,
                        bc_gen: 0, bc_women_gen: 0, bc_pstm: 0, bc_women_pstm: 0,
                        bcm_gen: 0, bcm_women_gen: 0, bcm_pstm: 0, bcm_women_pstm: 0,
                        mbc_gen: 0, mbc_women_gen: 0, mbc_pstm: 0, mbc_women_pstm: 0,
                        sc_gen: 0, sc_women_gen: 0, sc_pstm: 0, sc_women_pstm: 0,
                        sca_gen: 0, sca_women_gen: 0, sca_pstm: 0, sca_women_pstm: 0,
                        st_gen: 0, st_women_gen: 0, st_pstm: 0, st_women_pstm: 0
                    },
                    special: []
                };
            }

            const isRegular = category.toLowerCase() === 'none';
            const isShortfall = category.toLowerCase().includes('shortfall');

            if (isRegular || isShortfall) {
                const commKey = comm.toLowerCase().replace('/dc', '');
                let suffix = '';
                if (gender === 'Women') {
                    suffix = pstm === 'Yes' ? '_women_pstm' : '_women_gen';
                } else {
                    suffix = pstm === 'Yes' ? '_pstm' : '_gen';
                }
                const key = `${commKey}${suffix}`;
                correctedData[code].regular[key] = (correctedData[code].regular[key] || 0) + seats;
            } else {
                correctedData[code].special.push({
                    community: comm === 'MBC' ? 'MBC/DC' : comm,
                    gender: gender,
                    is_pstm: pstm === 'Yes',
                    special_category: category,
                    seat_count: seats
                });
            }
        });

        // 3. Update JSON posts
        const targetCodes = Object.keys(correctedData);
        console.log(`📝 Correcting ${targetCodes.length} posts in JSON...`);

        posts.forEach(post => {
            if (targetCodes.includes(post.code)) {
                const data = correctedData[post.code];
                // Reset regular matrix first to avoid stale data
                communities.forEach(comm => {
                    mappings.forEach(m => {
                        post[`${comm}${m.suffix}`] = 0;
                    });
                });
                // Assign new regular matrix values
                Object.assign(post, data.regular);
                // Assign special vacancies (completely replace)
                post.special_vacancies = data.special;
            }
        });

        // Save config
        const { error: updateConfigError } = await supabase
            .from('exam_configurations')
            .update({ vacancies: vacancies })
            .eq('id', configId);

        if (updateConfigError) {
            console.error("❌ Error updating config table:", updateConfigError.message);
            return;
        }

        // 4. Sync Relational Tables
        console.log("🔗 Syncing relational tables (post_vacancies)...");
        const { data: examPosts, error: postsError } = await supabase
            .from('exam_posts')
            .select('id, post_code')
            .eq('config_id', configId);

        if (postsError) {
            console.error("❌ Error fetching exam posts:", postsError.message);
            return;
        }

        for (const code of targetCodes) {
            const postRecord = examPosts.find(p => p.post_code === code);
            if (!postRecord) {
                console.warn(`⚠️ Warning: Post code ${code} not found in exam_posts table.`);
                continue;
            }

            const data = correctedData[code];

            // 1. Delete ALL old vacancies for this post
            const { error: delErr } = await supabase.from('post_vacancies').delete().eq('post_id', postRecord.id);
            if (delErr) {
                console.error(`❌ Error deleting for post ${code}:`, delErr.message);
                continue;
            }

            const newRows = [];

            // 2. Add Regular Vacancies
            communities.forEach(comm => {
                const commName = comm.toUpperCase() === 'MBC' ? 'MBC/DC' : comm.toUpperCase();
                mappings.forEach(m => {
                    const count = data.regular[`${comm}${m.suffix}`];
                    if (count > 0) {
                        newRows.push({
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

            // 3. Add Special Vacancies
            data.special.forEach(spec => {
                newRows.push({
                    post_id: postRecord.id,
                    community: spec.community === 'MBC' ? 'MBC/DC' : spec.community,
                    gender: spec.gender,
                    is_pstm: spec.is_pstm,
                    special_category: spec.special_category,
                    seat_count: spec.seat_count,
                    vacancy_type: 'Special'
                });
            });

            if (newRows.length > 0) {
                const { error: insErr } = await supabase.from('post_vacancies').insert(newRows);
                if (insErr) console.error(`❌ Error inserting for post ${code}:`, insErr.message);
            }
        }

        console.log(`✅ Success! Corrected ${targetCodes.length} posts.`);
    } catch (e) {
        console.error("❌ Runtime Exception:", e);
    }
}

const communities = ['gt', 'bc', 'bcm', 'mbc', 'sc', 'sca', 'st'];
const mappings = [
    { suffix: '_gen', gender: 'General', pstm: false },
    { suffix: '_women_gen', gender: 'Women', pstm: false },
    { suffix: '_pstm', gender: 'General', pstm: true },
    { suffix: '_women_pstm', gender: 'Women', pstm: true }
];

run();
