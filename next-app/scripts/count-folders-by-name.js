const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function countFolders() {
    try {
        const titleToSearch = "Question Paper Title 1";

        // Count exact matches
        const { count, error } = await supabase
            .from('question_folders')
            .select('*', { count: 'exact', head: true })
            .eq('name', titleToSearch);

        if (error) throw error;

        console.log(`Count of folders with name "${titleToSearch}": ${count}`);

        if (count > 0) {
            const { data } = await supabase
                .from('question_folders')
                .select('id, name, created_at, testpress_id')
                .eq('name', titleToSearch)
                .limit(5);
            console.log('Sample IDs:', data);
        }

    } catch (error) {
        console.error('Error:', error.message);
    }
}

countFolders();
