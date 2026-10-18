require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function dump() {
    const { data: configs } = await supabase.from('exam_configurations').select('*').ilike('exam_tag', '%TNPSC%');
    const config = configs.find(c => c.vacancies?.groups) || configs[0];
    const group = config.vacancies.groups.find(g => g.post_codes.includes('3270'));

    if (group) {
        fs.writeFileSync('group_dump.json', JSON.stringify(group, null, 2));
        console.log('Dumped to group_dump.json');
    } else {
        console.log('Group not found');
    }
}
dump();
