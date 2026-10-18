const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://xalbtjoykovnlbjeddtv.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ1MzI0NywiZXhwIjoyMDc5MDI5MjQ3fQ.DeztVEiT5tc3KjIinCqi9TMzmt-nRr2PMv54taSvm98';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkR2Urls() {
    const { data, error, count } = await supabase
        .from('members')
        .select('photo_url', { count: 'exact', head: false })
        .ilike('photo_url', '%r2.dev%')
        .limit(5);

    if (error) {
        console.error('Error:', error);
        return;
    }

    console.log(`Found ${count} members with R2 URLs.`);
    if (data.length > 0) {
        console.log('Sample R2 URLs:', data);
    }
}

checkR2Urls();
