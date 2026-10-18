const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function deleteDuplicateFolders() {
    try {
        const titleToDelete = "Question Paper Title 1";

        console.log(`🗑️ Deleting folders with title "${titleToDelete}"...\n`);

        const { count, error: countError } = await supabase
            .from('question_folders')
            .select('*', { count: 'exact', head: true })
            .eq('name', titleToDelete);

        if (countError) throw countError;

        console.log(`Found ${count} folders to delete.`);

        if (count === 0) {
            console.log('No folders found.');
            return;
        }

        // Deleting in the background ( Supabase delete without ID is allowed if RLS policies permit or if using Service Role)
        // With Service Role, we can delete by 'name'.

        const { error: deleteError, data } = await supabase
            .from('question_folders')
            .delete()
            .eq('name', titleToDelete)
            .select('id'); // Select ID to confirm deletion count

        if (deleteError) throw deleteError;

        console.log(`\n✅ Successfully deleted ${data.length} folders!`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
}

deleteDuplicateFolders();
