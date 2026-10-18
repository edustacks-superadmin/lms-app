const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkCount() {
    const { count: qCount } = await supabase.from('questions').select('*', { count: 'exact', head: true });
    const { count: linkCount } = await supabase.from('question_folder_items').select('*', { count: 'exact', head: true });
    const { count: examLinkCount } = await supabase.from('exam_questions').select('*', { count: 'exact', head: true });

    console.log('Total Questions:', qCount);
    console.log('Total Folder Links:', linkCount);
    console.log('Total Exam Links:', examLinkCount);
}

checkCount();
