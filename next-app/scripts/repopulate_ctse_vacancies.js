
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const EXAM_TAG = 'TNPSC_CTSE_DIP_ITI_2025';

const csvData = `post_code,community,gender,is_pstm,special_category,seat_count
3617,GT,General,No,None,4
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
3636,GT,General,No,None,6
3636,GT,General,Yes,None,2
3636,GT,General,No,LV/VI,1
3636,GT,General,No,EXSER,1
3636,GT,Women,No,None,4
3636,GT,Women,Yes,None,1
3636,BC,General,No,None,6
3636,BC,General,Yes,None,2
3636,BC,General,No,EXSER,1
3636,BC,Women,No,None,3
3636,BC,Women,Yes,None,1
3636,BCM,General,No,None,1
3636,BCM,Women,No,None,1
3636,MBC,General,No,None,4
3636,MBC,General,Yes,None,1
3636,MBC,General,No,LD/CP/LC/DF/AC/MuD,1
3636,MBC,General,No,EXSER,1
3636,MBC,Women,No,None,3
3636,SCA,General,Yes,None,1
3636,SCA,Women,Yes,None,1
3636,SC,General,No,None,4
3636,SC,General,Yes,None,1
3636,SC,Women,No,None,2
3646,GT,General,No,None,2
3646,GT,General,Yes,None,1
3646,GT,Women,No,None,1
3646,BC,General,No,None,2
3646,BC,General,Yes,None,1
3646,BC,Women,No,None,1
3646,MBC,General,No,None,2
3646,MBC,Women,No,None,1
3646,SCA,Women,Yes,None,1
3646,SC,General,No,None,1
3646,SC,Women,No,None,1
3648,GT,General,No,None,3
3648,GT,General,Yes,None,1
3648,GT,General,No,LV/VI,1
3648,GT,Women,No,None,2
3648,BC,General,No,None,4
3648,BC,General,Yes,None,1
3648,BC,Women,No,None,2
3648,BCM,General,No,None,1
3648,MBC,General,No,None,2
3648,MBC,General,Yes,None,1
3648,MBC,Women,No,None,2
3648,SCA,Women,Yes,None,1
3648,SC,General,No,None,2
3648,SC,General,Yes,None,1
3648,SC,Women,No,None,1
3101,GT,General,No,None,3
3101,GT,General,Yes,None,2
3101,GT,General,No,LV/VI,1
3101,GT,General,No,EXSER,1
3101,GT,Women,No,None,2
3101,BC,General,No,None,3
3101,BC,General,Yes,None,1
3101,BC,Women,No,None,1
3101,BC,Women,No,DW,1
3101,BCM,Women,No,None,1
3101,MBC,General,No,None,1
3101,MBC,General,Yes,None,1
3101,MBC,General,No,LD/CP/LC/DF/AC/MuD,1
3101,MBC,General,No,EXSER,1
3101,MBC,Women,No,None,1
3101,SCA,General,No,EXSER,1
3101,SC,General,No,None,2
3101,SC,Women,No,None,1
3101,ST,General,Yes,None,1
3104,GT,General,No,Backlog (HH),1
3104,BC,General,No,Backlog (HH),1
3104,BC,General,No,Backlog (ASD/SLD/MI),1
3104,BCM,General,No,Backlog,15
3104,MBC,General,No,Backlog (LD/CP/LC/DF/AC/MuD),1
3104,MBC,General,No,Backlog (ASD/SLD/MI),1
3104,SC,General,No,Backlog (LV),1
3104,GT,General,No,None,3
3104,GT,General,Yes,None,1
3104,GT,Women,Yes,None,1
3104,BC,General,No,None,1`;

async function run() {
    try {
        console.log(`🚀 Repopulating vacancies for ${EXAM_TAG}...`);

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
        const rowsByCode = {};
        const lines = csvData.trim().split('\n').filter(l => l.trim() !== '');
        const dataLines = lines.slice(1);

        dataLines.forEach(line => {
            const parts = line.split(',').map(v => v.trim());
            if (parts.length < 6) return;

            const code = parts[0];
            const comm = parts[1];
            const gender = parts[2];
            const pstm = parts[3];
            const category = parts[4];
            const seats = parseInt(parts[5]) || 0;

            if (!rowsByCode[code]) {
                rowsByCode[code] = {
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
                const key = `${commKey}${suffix}`;
                rowsByCode[code].regular[key] = (rowsByCode[code].regular[key] || 0) + seats;
            } else {
                rowsByCode[code].special.push({
                    community: comm === 'MBC' ? 'MBC/DC' : comm,
                    gender: gender,
                    is_pstm: pstm === 'Yes',
                    special_category: category,
                    seat_count: seats
                });
            }
        });

        const targetCodes = Object.keys(rowsByCode);
        console.log(`📝 Updating JSON for ${targetCodes.length} posts...`);

        posts.forEach(post => {
            if (targetCodes.includes(post.code)) {
                const data = rowsByCode[post.code];
                // Since we already cleared these in the previous turn, we just assign
                Object.assign(post, data.regular);
                post.special_vacancies = data.special;
            }
        });

        // Save JSON
        const { error: updateConfigError } = await supabase
            .from('exam_configurations')
            .update({ vacancies: vacancies })
            .eq('id', configId);

        if (updateConfigError) {
            console.error("❌ Error updating config table:", updateConfigError.message);
            return;
        }

        // 3. Update Sync Relational Tables
        console.log("🔗 Syncing post_vacancies table...");
        const { data: examPosts, error: postsError } = await supabase
            .from('exam_posts')
            .select('id, post_code')
            .eq('config_id', configId)
            .in('post_code', targetCodes);

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

            const data = rowsByCode[code];
            // Clear again just in case (though already cleared in previous turn)
            await supabase.from('post_vacancies').delete().eq('post_id', postRecord.id);

            const newRows = [];
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
                if (insErr) console.error(`❌ Error inserting for post ${code}:`, insErr.message);
            }
        }

        console.log("🎉 Repopulation of first batch complete.");
    } catch (e) {
        console.error("❌ Runtime Exception:", e);
    }
}

run();
