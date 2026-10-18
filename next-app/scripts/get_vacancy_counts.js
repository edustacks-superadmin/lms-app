
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const EXAM_TAG = 'TNPSC_AE_2025';

async function run() {
    const { data: config, error } = await supabase
        .from('exam_configurations')
        .select('vacancies')
        .eq('exam_tag', EXAM_TAG)
        .single();

    if (error || !config) {
        console.error("Error fetching config:", error?.message);
        return;
    }

    const posts = config.vacancies.posts || [];
    console.log('post_code,total_vacancies');

    posts.forEach(p => {
        let total = 0;
        const communities = ['gt', 'bc', 'bcm', 'mbc', 'sc', 'sca', 'st'];
        const suffixes = ['_gen', '_women_gen', '_pstm', '_women_pstm'];

        communities.forEach(c => {
            suffixes.forEach(s => {
                total += parseInt(p[`${c}${s}`]) || 0;
            });
        });

        if (p.special_vacancies && Array.isArray(p.special_vacancies)) {
            p.special_vacancies.forEach(spec => {
                total += parseInt(spec.seat_count) || 0;
            });
        }

        console.log(`${p.code},${total}`);
    });
}

run();
