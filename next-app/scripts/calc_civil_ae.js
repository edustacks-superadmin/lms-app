require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function calc() {
    const { data: configs } = await supabase.from('exam_configurations').select('*').ilike('exam_tag', '%TNPSC%');
    const config = configs.find(c => c.vacancies?.groups) || configs[0];
    const group = config.vacancies.groups.find(g => g.post_codes.includes('3270'));

    if (!group) { return console.log('No group.'); }

    let gt_total = 0; // Gen + Women
    let bc_total = 0; // Gen + Women

    // Access the totals pre-calculated in the group object if available, OR sum the breakdown
    // The previous log showed "totals": { ... } structure in the group object?
    // Let's look at the group structure again or just sum the `items` if `totals` isn't granular enough.
    // The log showed "items": [ ... ]. 

    // Let's sum from items
    const items = group.items || [];

    items.forEach(p => {
        // GT
        gt_total += (p.gt_gen || 0) + (p.gt_women_gen || 0); // Exclude PSTM/WPSTM for now unless she is eligible? She is NOT PSTM.

        // BC
        bc_total += (p.bc_gen || 0) + (p.bc_women_gen || 0);
    });

    console.log(`GT Eligible (Gen+W): ${gt_total}`);
    console.log(`BC Eligible (Gen+W): ${bc_total}`);
    console.log(`Total Eligible: ${gt_total + bc_total}`);
}

calc();
