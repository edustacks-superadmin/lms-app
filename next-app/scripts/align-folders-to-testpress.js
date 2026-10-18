const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function alignFolders() {
    try {
        console.log('🔄 Aligning Question Folders to Testpress ID...\n');

        // 1. Fetch all folders
        let allFolders = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        process.stdout.write('📥 Fetching folders');
        while (hasMore) {
            const { data: folders, error: fetchError } = await supabase
                .from('question_folders')
                .select('id, name, testpress_id, created_at')
                .range(page * pageSize, (page + 1) * pageSize - 1);

            if (fetchError) throw fetchError;

            if (folders.length > 0) {
                allFolders = [...allFolders, ...folders];
                process.stdout.write('.');
                page++;
            } else {
                hasMore = false;
            }
        }
        console.log(`\n📚 Total folders: ${allFolders.length}`);

        // 2. Filter for those with testpress_id
        const tpFolders = allFolders.filter(f => f.testpress_id);
        console.log(`🎯 Folders with Testpress ID: ${tpFolders.length}`);

        if (tpFolders.length === 0) {
            console.log('⚠️ No folders with Testpress ID found.');
            return;
        }

        // 3. Extract all timestamps and sort them DESC (Newest to Oldest)
        // We want the First Source Item (Lowest ID) to be the Newest (Top of List)
        const timestamps = tpFolders.map(f => f.created_at).sort((a, b) => new Date(b) - new Date(a));

        // 4. Sort folders by Testpress ID ASC (Order 1, 2, 3...)
        tpFolders.sort((a, b) => a.testpress_id - b.testpress_id);

        console.log('\nSample Alignment:');
        console.log(`Top Folder (Lowest TP ID: ${tpFolders[0].testpress_id}) -> Will get Newest Time (${timestamps[0]})`);
        console.log(`Bottom Folder (Highest TP ID: ${tpFolders[tpFolders.length - 1].testpress_id}) -> Will get Oldest Time (${timestamps[timestamps.length - 1]})`);

        // 5. Update
        console.log('\n⏳ Updating folders...');
        let updatedCount = 0;

        // Process in chunks to avoid overwhelming the DB
        for (let i = 0; i < tpFolders.length; i++) {
            const folder = tpFolders[i];
            const newTimestamp = timestamps[i];

            // Only update if changed (optional optimization, but strict alignment is safer)
            if (folder.created_at !== newTimestamp) {
                const { error: updateError } = await supabase
                    .from('question_folders')
                    .update({ created_at: newTimestamp })
                    .eq('id', folder.id);

                if (updateError) {
                    console.error(`❌ Error updating folder ${folder.id}:`, updateError);
                } else {
                    updatedCount++;
                }
            } else {
                updatedCount++; // Count as processed
            }

            if (updatedCount % 50 === 0) {
                process.stdout.write(`\r   Processed ${updatedCount}/${tpFolders.length}`);
            }
        }

        console.log(`\n\n✅ Successfully aligned ${updatedCount} folders!`);

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

alignFolders();
