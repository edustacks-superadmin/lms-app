const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function reverseQuestionFoldersOrder() {
    try {
        console.log('🔄 Reversing Question Folders order...\n');

        // 1. Fetch all folders ordered by created_at (ASC)
        let allFolders = [];
        let page = 0;
        const pageSize = 1000;
        let hasMore = true;

        process.stdout.write('📥 Fetching folders');
        while (hasMore) {
            const { data: folders, error: fetchError } = await supabase
                .from('question_folders')
                .select('id, name, created_at')
                .order('created_at', { ascending: true })
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
        console.log('\n');

        const folders = allFolders;
        console.log(`📚 Found ${folders.length} folders (Total)`);

        if (folders.length === 0) {
            console.log('⚠️  No folders found to reverse');
            return;
        }

        // 2. Extract timestamps
        const timestamps = folders.map(f => f.created_at);

        // 3. Reverse the timestamps array
        // The first folder (oldest) will get the last timestamp (newest)
        const reversedTimestamps = [...timestamps].reverse();

        console.log('\nReversing order via timestamps:');
        console.log(`First folder (Name: ${folders[0].name})`);
        console.log(`   Current Created At: ${folders[0].created_at}`);
        console.log(`   New Created At:     ${reversedTimestamps[0]}`);
        console.log('');
        console.log(`Last folder (Name: ${folders[folders.length - 1].name})`);
        console.log(`   Current Created At: ${folders[folders.length - 1].created_at}`);
        console.log(`   New Created At:     ${reversedTimestamps[reversedTimestamps.length - 1]}`);
        console.log('');

        // 4. Update each folder with its new timestamp
        console.log('⏳ Updating folders...');

        let updatedCount = 0;
        for (let i = 0; i < folders.length; i++) {
            const folder = folders[i];
            const newCreatedAt = reversedTimestamps[i];

            const { error: updateError } = await supabase
                .from('question_folders')
                .update({ created_at: newCreatedAt })
                .eq('id', folder.id);

            if (updateError) {
                console.error(`❌ Error updating folder ${folder.name}:`, updateError);
            } else {
                updatedCount++;
                if (updatedCount % 20 === 0) {
                    console.log(`   Updated ${updatedCount}/${folders.length} folders...`);
                }
            }
        }

        console.log(`\n✅ Successfully reversed order of ${updatedCount} folders!`);
        console.log('\n💡 Refresh your browser to see the new order.');

    } catch (error) {
        console.error('❌ Error:', error.message);
        process.exit(1);
    }
}

reverseQuestionFoldersOrder();
