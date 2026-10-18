
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function checkBeforeTime() {
    const threshold = '2026-01-23T19:50:00Z';
    const { data: results, error } = await supabase
        .from('external_exam_results')
        .select('*')
        .lt('created_at', threshold)
        .order('created_at', { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    console.log(`Found ${results.length} records before ${threshold}.`);

    let md = '# Records Before Bulk Sync Session\n\n';
    md += '| # | Created At | Reg No | Name | Post |\n';
    md += '| :--- | :--- | :--- | :--- | :--- |\n';
    results.forEach((r, i) => {
        md += `| ${i + 1} | ${r.created_at} | ${r.registration_number} | ${r.full_name} | ${r.post_selected} |\n`;
    });

    fs.writeFileSync('scripts/pre_sync_records.md', md);
    console.log('Details saved to scripts/pre_sync_records.md');
}

checkBeforeTime();
