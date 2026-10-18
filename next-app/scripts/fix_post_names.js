const { createClient } = require('@supabase/supabase-js');
require('dotenv').config();

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function fixPostNames() {
    console.log('Fixing Post Names...');

    const updates = [
        {
            old: 'Assistant Engineer (Civil)',
            new: 'Assistant Engineer (Civil) (3603)'
        },
        {
            old: 'Assistant Engineer (Agricultural Engineering)',
            new: 'Assistant Engineer (Agricultural Engineering) (1667)'
        },
        {
            old: 'Junior Planner',
            new: 'Junior Planner (3602)'
        }
    ];

    for (const item of updates) {
        const { error } = await supabase
            .from('external_exam_results')
            .update({ post_selected: item.new })
            .eq('post_selected', item.old);

        if (error) console.error(`Failed to update ${item.old}:`, error.message);
        else console.log(`Updated '${item.old}' -> '${item.new}'`);
    }
}

fixPostNames();
