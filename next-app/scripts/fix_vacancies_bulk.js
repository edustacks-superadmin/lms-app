
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const EXAM_TAG = 'TNPSC_AE_2025';

const csvData = `post_code,community,gender,is_pstm,special_category,seat_count
1664,BC,General,Yes,None,1
1661,GT,General,No,None,16
1661,GT,General,Yes,None,4
1661,GT,General,No,HH,1
1661,GT,Women,No,None,5
1661,GT,Women,Yes,None,2
1661,GT,Women,No,HH,1
1661,BC,General,No,None,12
1661,BC,General,Yes,None,4
1661,BC,General,No,HH,1
1661,BC,Women,No,None,4
1661,BC,Women,Yes,None,3
1661,BCM,General,No,None,3
1661,BCM,Women,No,None,1
1661,MBC/DC,General,No,None,10
1661,MBC/DC,General,Yes,None,2
1661,MBC/DC,Women,No,None,5
1661,MBC/DC,Women,Yes,None,1
1661,SCA,General,No,None,2
1661,SC,General,No,None,7
1661,SC,General,Yes,None,2
1661,SC,General,No,HH,1
1661,SC,Women,No,None,3
1661,SC,Women,Yes,None,1
1661,ST,General,Yes,None,1
1660,GT,General,No,None,7
1660,GT,General,Yes,None,2
1660,GT,Women,No,None,3
1660,GT,Women,Yes,None,1
1660,BC,General,No,None,5
1660,BC,General,Yes,None,2
1660,BC,General,No,HH,1
1660,BC,Women,No,None,3
1660,BCM,General,No,None,1
1660,BCM,Women,No,None,1
1660,MBC/DC,General,No,None,4
1660,MBC/DC,General,Yes,None,2
1660,MBC/DC,Women,No,None,1
1660,MBC/DC,Women,Yes,None,1
1660,SCA,General,No,None,1
1660,SC,General,No,None,2
1660,SC,General,Yes,None,1
1660,SC,General,No,HH,1
1660,SC,Women,No,None,1
1660,SC,Women,Yes,None,1
3269,MBC/DC,General,No,Backlog (LV),1
3269,GT,General,No,None,7
3269,GT,General,Yes,None,2
3269,GT,Women,No,None,3
3269,GT,Women,Yes,None,1
3269,BC,General,No,None,3
3269,BC,General,No,HH,1
3269,BC,General,Yes,None,2
3269,BC,Women,No,None,2
3269,BC,Women,Yes,None,1
3269,BCM,General,No,None,1
3269,MBC/DC,General,No,None,4
3269,MBC/DC,General,Yes,None,2
3269,MBC/DC,Women,No,None,2
3269,SCA,General,Yes,None,1
3269,SC,General,No,None,4
3269,SC,General,Yes,None,1
3269,SC,Women,No,None,3
3269,ST,Women,Yes,None,1
1667,GT,General,No,None,19
1667,GT,General,Yes,None,5
1667,GT,General,No,LV,1
1667,GT,General,No,HH/HI,1
1667,GT,Women,No,None,9
1667,GT,Women,Yes,None,1
1667,BC,General,No,None,16
1667,BC,General,Yes,None,4
1667,BC,General,No,LD/LC/DF/AC,1
1667,BC,Women,No,None,8
1667,BC,Women,Yes,None,1
1667,BCM,General,No,None,3
1667,BCM,General,Yes,None,1
1667,BCM,Women,Yes,None,1
1667,MBC/DC,General,No,None,14
1667,MBC/DC,General,Yes,None,3
1667,MBC/DC,Women,No,None,4
1667,MBC/DC,Women,Yes,None,2
1667,SCA,General,No,None,1
1667,SCA,General,Yes,None,1
1667,SCA,Women,No,None,1
1667,SC,General,No,None,8
1667,SC,General,Yes,None,4
1667,SC,General,No,LV,1
1667,SC,Women,No,None,4
1667,SC,Women,Yes,None,1
1667,ST,General,No,None,1
1656,GT,General,No,Backlog (HH),1
1656,MBC/DC,General,No,Backlog (HH),1
1656,GT,General,No,None,12
1656,GT,General,No,HH,1
1656,GT,General,Yes,None,3
1656,GT,Women,No,None,5
1656,GT,Women,No,LD(OA,OL)/DF/AC,1
1656,GT,Women,Yes,None,2
1656,BC,General,No,None,11
1656,BC,General,No,LD(OA,OL)/DF/AC,1
1656,BC,General,Yes,None,3
1656,BC,Women,No,None,4
1656,BC,Women,Yes,None,2
1656,BCM,General,No,None,2
1656,BCM,Women,No,None,1
1656,MBC/DC,General,No,None,8
1656,MBC/DC,General,Yes,None,2
1656,MBC/DC,Women,No,None,4
1656,MBC/DC,Women,Yes,None,1
1656,SC,General,No,None,6
1656,SC,General,No,HH,1
1656,SC,General,Yes,None,1
1656,SC,Women,No,None,3
1656,SC,Women,Yes,None,1
1656,SCA,General,No,None,2
3273,GT,General,No,None,4
3273,GT,General,Yes,None,1
3273,GT,Women,No,None,1
3273,GT,Women,No,HH,1
3273,BC,General,No,None,4
3273,BC,General,Yes,None,1
3273,BC,Women,No,None,1
3273,BCM,General,No,None,1
3273,MBC/DC,General,No,None,2
3273,MBC/DC,General,Yes,None,1
3273,MBC/DC,Women,No,None,1
3273,SC,General,No,None,2
3273,SC,Women,Yes,None,1
3273,SCA,General,No,None,1
3266,BC,General,No,Backlog (HH),1
3266,SC,General,No,Backlog (HH),1
3266,SC,General,No,Backlog (LD/LC),1
3266,GT,General,No,None,63
3266,GT,General,Yes,None,17
3266,GT,General,No,HH,2
3266,GT,General,No,LD/LC/DF/AC,2
3266,GT,Women,No,None,27
3266,GT,Women,Yes,None,7
3266,GT,Women,No,HH,2
3266,BC,General,No,None,56
3266,BC,General,Yes,None,14
3266,BC,General,No,HH,1
3266,BC,General,No,LD/LC/DF/AC,1
3266,BC,Women,No,None,24
3266,BC,Women,Yes,None,6
3266,BC,Women,No,LD/LC/DF/AC,1
3266,BCM,General,No,None,7
3266,BCM,General,Yes,None,3
3266,BCM,Women,No,None,3
3266,MBC/DC,General,No,None,40
3266,MBC/DC,General,Yes,None,11
3266,MBC/DC,General,No,HH,1
3266,MBC/DC,General,No,LD/LC/DF/AC,2
3266,MBC/DC,Women,No,None,20
3266,MBC/DC,Women,Yes,None,4
3266,SCA,General,No,None,7
3266,SCA,General,Yes,None,1
3266,SCA,Women,No,None,3
3266,SC,General,No,None,33
3266,SC,General,Yes,None,8
3266,SC,General,No,HH,1
3266,SC,Women,No,None,12
3266,SC,Women,Yes,None,4
3266,SC,Women,No,LD/LC/DF/AC,1
3266,ST,General,No,None,1
3266,ST,General,Yes,None,1
3266,ST,General,No,LD/LC/DF/AC,1
3266,ST,Women,No,None,1
2069,GT,General,No,LV,1
2069,BC,General,No,None,1
2069,MBC/DC,Women,No,None,1
2069,SC,General,Yes,None,1
2069,SC,General,No,Shortfall,1
1824,GT,General,No,None,2
1824,GT,General,Yes,None,2
1824,GT,General,No,ASD/ID/SLD/MI/MD,1
1824,GT,General,No,EXSER,1
1824,GT,Women,Yes,None,1
1824,BC,General,No,None,4
1824,BC,General,Yes,None,1
1824,BC,Women,No,None,2
1824,BC,Women,Yes,None,1
1824,BCM,General,No,None,1
1824,MBC/DC,General,No,None,4
1824,MBC/DC,Women,No,None,2
1824,SCA,General,Yes,None,1
1824,SC,General,No,None,3
1824,SC,Women,Yes,None,1
1824,SC,General,No,Shortfall,1
1824,ST,General,No,Shortfall,4
2086,SC,General,No,Shortfall,1
3701,GT,General,Yes,None,1
3701,BC,General,Yes,None,1
3701,BC,Women,No,None,1
3701,BCM,General,No,None,1
3701,MBC/DC,General,No,None,1
3701,MBC/DC,General,Yes,None,1
3701,SC,General,No,None,1
3701,SC,Women,No,None,1
3701,SC,General,No,Shortfall,1
3604,ST,General,No,Shortfall,1
3609,GT,General,No,None,1
3609,MBC/DC,General,No,None,1
3609,SCA,Women,Yes,DW,1
3607,GT,General,No,None,1
3607,SCA,Women,Yes,DW,1
3702,GT,General,No,None,1
3702,GT,General,Yes,None,1
3702,BC,General,No,None,1
3702,SC,General,No,Shortfall,1`;

async function run() {
    console.log(`🚀 Starting bulk correction for ${EXAM_TAG}...`);

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
    const rows = csvData.split('\n').slice(1);
    const correctedData = {};

    rows.forEach(row => {
        const parts = row.split(',').map(v => v.trim());
        if (parts.length < 5) return;

        const code = parts[0];
        const comm = parts[1];
        const gender = parts[2];
        const pstm = parts[3];
        const seats = parseInt(parts[parts.length - 1]) || 0;
        const category = parts.slice(4, parts.length - 1).join(',');

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

        if (category.toLowerCase() === 'none') {
            const commKey = comm.toLowerCase().replace('/dc', '');
            let suffix = '';
            if (gender === 'Women') {
                suffix = pstm === 'Yes' ? '_women_pstm' : '_women_gen';
            } else {
                suffix = pstm === 'Yes' ? '_pstm' : '_gen';
            }
            correctedData[code].regular[`${commKey}${suffix}`] += seats;
        } else {
            correctedData[code].special.push({
                community: comm,
                gender: gender,
                is_pstm: pstm === 'Yes',
                special_category: category,
                seat_count: seats
            });
        }
    });

    // 3. Update JSON posts
    console.log("📝 Updating Config JSON...");
    const targetCodes = Object.keys(correctedData);
    posts.forEach(post => {
        if (targetCodes.includes(post.code)) {
            const data = correctedData[post.code];
            // Update regular matrix
            Object.assign(post, data.regular);
            // Update special vacancies
            post.special_vacancies = data.special;
        }
    });

    // Save config
    const { error: updateConfigError } = await supabase
        .from('exam_configurations')
        .update({ vacancies: vacancies })
        .eq('id', configId);

    if (updateConfigError) {
        console.error("❌ Error updating configuration table:", updateConfigError.message);
        return;
    }

    // 4. Sync Relational Tables
    console.log("🔗 Syncing relational tables (exam_posts & post_vacancies)...");

    const { data: examPosts, error: postsError } = await supabase
        .from('exam_posts')
        .select('id, post_code')
        .eq('config_id', configId);

    if (postsError) {
        console.error("❌ Error fetching exam posts:", postsError.message);
        return;
    }

    const communities = ['gt', 'bc', 'bcm', 'mbc', 'sc', 'sca', 'st'];
    const mappings = [
        { suffix: '_gen', gender: 'General', pstm: false },
        { suffix: '_women_gen', gender: 'Women', pstm: false },
        { suffix: '_pstm', gender: 'General', pstm: true },
        { suffix: '_women_pstm', gender: 'Women', pstm: true }
    ];

    for (const code of targetCodes) {
        const postRecord = examPosts.find(p => p.post_code === code);
        if (!postRecord) continue;

        const data = correctedData[code];

        // 1. Delete ALL old vacancies for this post
        await supabase.from('post_vacancies').delete().eq('post_id', postRecord.id);

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
                community: spec.community,
                gender: spec.gender,
                is_pstm: spec.is_pstm,
                special_category: spec.special_category,
                seat_count: spec.seat_count,
                vacancy_type: 'Special'
            });
        });

        if (newRows.length > 0) {
            const { error: insErr } = await supabase.from('post_vacancies').insert(newRows);
            if (insErr) console.error(`❌ Error inserting rows for post ${code}:`, insErr.message);
        }
    }

    console.log(`✅ Success! Corrected ${targetCodes.length} posts.`);
}

run();
