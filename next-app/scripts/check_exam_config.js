
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ1MzI0NywiZXhwIjoyMDc5MDI5MjQ3fQ.DeztVEiT5tc3KjIinCqi9TMzmt-nRr2PMv54taSvm98';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkConfig() {
    const { data, error } = await supabase
        .from('exam_configurations')
        .select('*')
        .eq('exam_tag', 'TNPSC_AE_2024');

    if (error) {
        console.error('Error fetching config:', error);
        return;
    }

    console.log('Current Exam Configurations:');
    console.log(JSON.stringify(data, null, 2));
}

checkConfig();
