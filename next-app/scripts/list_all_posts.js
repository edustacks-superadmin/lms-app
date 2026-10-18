require('dotenv').config({ path: '.env.local' });
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function list() {
    const { data: configs } = await supabase.from('exam_configurations').select('*').ilike('exam_tag', '%TNPSC%');
    const config = configs.find(c => c.vacancies?.posts?.length > 0) || configs[0];
    const posts = config.vacancies?.posts || [];

    // List of known/seeded posts
    const seeded = [
        "3269", "3266", "1656", "1661", "1660", "1667", "3368", "3740", "3273", "3602", "3351", "1824",
        "3232", "3531", "3663", "3270", "3603"
    ];

    console.log('--- All Posts in DBConfig ---');
    const allCodes = posts.map(p => p.code);
    console.log(allCodes.join(', '));

    console.log('\n--- Potentially Unseeded/Missing ---');
    const missing = allCodes.filter(c => !seeded.includes(c));
    if (missing.length === 0) console.log("None! All posts in the DB seem to be covered.");
    else console.log(missing.join('\n'));
}

list();
