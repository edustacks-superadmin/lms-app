
const { createClient } = require('@supabase/supabase-js');

// Use the env vars from .env.local (hardcoded here for the script as I can't load them easily without dotenv in this env)
const supabaseUrl = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ1MzI0NywiZXhwIjoyMDc5MDI5MjQ3fQ.DeztVEiT5tc3KjIinCqi9TMzmt-nRr2PMv54taSvm98';

const supabase = createClient(supabaseUrl, supabaseKey);

async function findMembers() {
    const dob = '1991-07-11';
    console.log(`Searching for members with DOB: ${dob}`);

    const { data, error } = await supabase
        .from('members')
        .select('id, email, display_name, birth_date')
        .eq('birth_date', dob);

    if (error) {
        console.error('Error:', error);
        return;
    }

    if (data && data.length > 0) {
        console.log(`Found ${data.length} members:`);
        data.forEach(m => {
            console.log(`- ${m.display_name} (${m.email})`);
        });
    } else {
        console.log('No members found with this DOB.');
    }
}

findMembers();
