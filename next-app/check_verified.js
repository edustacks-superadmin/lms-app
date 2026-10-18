
const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzQ1MzI0NywiZXhwIjoyMDc5MDI5MjQ3fQ.DeztVEiT5tc3KjIinCqi9TMzmt-nRr2PMv54taSvm98';

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkVerifiedStatus() {
    console.log("Checking is_verified stats...");

    // Just select the column
    const { data, error } = await supabase
        .from('external_exam_results')
        .select('is_verified')
        .limit(100);

    if (error) {
        console.error(error);
        return;
    }

    // Group by is_verified
    const stats = {};
    data.forEach(r => {
        const key = String(r.is_verified);
        stats[key] = (stats[key] || 0) + 1;
    });

    console.log("Status counts (Sample 100):", stats);
}

checkVerifiedStatus();
