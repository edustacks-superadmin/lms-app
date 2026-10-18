const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

function calculateGroupTotals(postCodes, postsList) {
    const selectedPosts = postsList.filter(p => postCodes.includes(p.code));
    const communities = ['GT', 'BC', 'BCM', 'MBC/DC', 'SC', 'SCA', 'ST'];
    const totals = {};

    communities.forEach(comm => {
        const key = comm.toLowerCase().replace('/', '');
        totals[comm] = {
            gen: selectedPosts.reduce((sum, p) => sum + (p[`${key}_gen`] || 0), 0),
            women: selectedPosts.reduce((sum, p) => sum + (p[`${key}_women_gen`] || 0) + (p[`${key}_women_pstm`] || 0), 0),
            pstm: selectedPosts.reduce((sum, p) => sum + (p[`${key}_pstm`] || 0), 0),
        };
        totals[comm].total = totals[comm].gen + totals[comm].women + totals[comm].pstm;
    });

    return {
        ...totals,
        post_breakdown: selectedPosts
    };
}

async function fixGroups() {
    console.log('Fetching Config...');
    const { data: config, error } = await supabase
        .from('exam_configurations')
        .select('*')
        .eq('portal_category', 'TNPSC_AE')
        .single();

    if (error || !config) {
        console.error('Config not found', error);
        return;
    }

    const posts = config.vacancies.posts || [];
    let groups = config.vacancies.groups || [];
    let modified = false;

    // 1. Fix Agricultural (1667)
    if (!groups.some(g => g.post_codes.includes('1667'))) {
        console.log('Adding Agricultural Group (1667)...');
        const newGroup = {
            name: 'Agricultural Engineering',
            post_codes: ['1667'],
            totals: calculateGroupTotals(['1667'], posts)
        };
        // Verify we actually found the post
        if (newGroup.totals.post_breakdown.length > 0) {
            groups.push(newGroup);
            modified = true;
        } else {
            console.error('Post 1667 not found in library, cannot create group.');
        }
    }

    // 2. Fix HRCE (3603)
    if (!groups.some(g => g.post_codes.includes('3603'))) {
        console.log('Adding HRCE Civil Group (3603)...');
        const newGroup = {
            name: 'HRCE Civil',
            post_codes: ['3603'],
            totals: calculateGroupTotals(['3603'], posts)
        };
        if (newGroup.totals.post_breakdown.length > 0) {
            groups.push(newGroup);
            modified = true;
        } else {
            console.warn('Post 3603 not found in library, skipping.');
        }
    }

    if (modified) {
        console.log('Updating Database...');
        const newVacancies = { ...config.vacancies, groups };
        const { error: updateError } = await supabase
            .from('exam_configurations')
            .update({ vacancies: newVacancies })
            .eq('id', config.id);

        if (updateError) console.error('Update Failed:', updateError);
        else console.log('Successfully updated groups!');
    } else {
        console.log('No changes needed.');
    }
}

fixGroups();
