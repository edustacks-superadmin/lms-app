
require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function generateReport() {
    const { data: results, error } = await supabase
        .from('external_exam_results')
        .select('post_selected, full_name, registration_number, overall_rank, communal_rank, total_marks')
        .eq('exam_tag', 'TNPSC_AE_2025')
        .order('overall_rank', { ascending: true });

    if (error) {
        console.error(error);
        return;
    }

    const posts = {};
    results.forEach(r => {
        if (!posts[r.post_selected]) posts[r.post_selected] = [];
        if (posts[r.post_selected].length < 10) { // Top 10 per post
            posts[r.post_selected].push(r);
        }
    });

    let md = '# TNPSC AE 2025 Top Rankers Report\n\n**Total Unique Students Processed**: ' + new Set(results.map(r => r.registration_number)).size + '\n\n';

    for (const [post, rankers] of Object.entries(posts)) {
        md += `## ${post}\n\n`;
        md += '| Rank | Name | Reg No | Marks | Comm Rank |\n';
        md += '| :--- | :--- | :--- | :--- | :--- |\n';
        rankers.forEach(r => {
            md += `| #${r.overall_rank} | ${r.full_name} | ${r.registration_number} | ${r.total_marks} | #${r.communal_rank} |\n`;
        });
        md += '\n---\n\n';
    }

    fs.writeFileSync('scripts/top_rankers_report.md', md);
    console.log('Report generated: scripts/top_rankers_report.md');
}

generateReport();
