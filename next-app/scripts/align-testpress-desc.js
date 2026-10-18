const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function fetchAll(table, columns) {
    let allItems = [];
    let page = 0;
    const pageSize = 1000;
    let hasMore = true;

    process.stdout.write(`📥 Fetching ${table}`);
    while (hasMore) {
        const { data, error } = await supabase
            .from(table)
            .select(columns)
            .range(page * pageSize, (page + 1) * pageSize - 1);

        if (error) throw error;

        if (data.length > 0) {
            allItems = [...allItems, ...data];
            process.stdout.write('.');
            page++;
        } else {
            hasMore = false;
        }
    }
    console.log(`\n📚 Total ${table}: ${allItems.length}`);
    return allItems;
}

async function alignTable(table, labelField) {
    try {
        console.log(`\n🔄 Aligning ${table} to Testpress ID (Largest ID First)...\n`);

        const columns = `id, testpress_id, created_at, ${labelField}`;
        const allItems = await fetchAll(table, columns);

        // Filter for those with testpress_id
        const tpItems = allItems.filter(f => f.testpress_id);
        console.log(`🎯 Items with Testpress ID: ${tpItems.length}`);

        if (tpItems.length === 0) {
            console.log('⚠️ No items with Testpress ID found.');
            return;
        }

        // 1. Sort timestamps DESC (Newest to Oldest)
        const timestamps = tpItems.map(f => f.created_at).sort((a, b) => new Date(b) - new Date(a));

        // 2. Sort items by Testpress ID DESC (Largest to Smallest)
        // We want Largest ID to match Newest Time
        tpItems.sort((a, b) => b.testpress_id - a.testpress_id);

        console.log('\nSample Alignment:');
        const topItem = tpItems[0];
        const bottomItem = tpItems[tpItems.length - 1];

        console.log(`Top Item (Largest TP ID: ${topItem.testpress_id} - ${topItem[labelField]}) 
            -> Will get Newest Time (${timestamps[0]})`);

        console.log(`Bottom Item (Smallest TP ID: ${bottomItem.testpress_id} - ${bottomItem[labelField]}) 
            -> Will get Oldest Time (${timestamps[timestamps.length - 1]})`);

        // 3. Update
        console.log('\n⏳ Updating...');
        let updatedCount = 0;

        for (let i = 0; i < tpItems.length; i++) {
            const item = tpItems[i];
            const newTimestamp = timestamps[i];

            if (item.created_at !== newTimestamp) {
                const { error: updateError } = await supabase
                    .from(table)
                    .update({ created_at: newTimestamp })
                    .eq('id', item.id);

                if (updateError) {
                    console.error(`❌ Error updating item ${item.id}:`, updateError);
                } else {
                    updatedCount++;
                }
            } else {
                updatedCount++;
            }

            if (updatedCount % 50 === 0) {
                process.stdout.write(`\r   Processed ${updatedCount}/${tpItems.length}`);
            }
        }

        console.log(`\n✅ Successfully aligned ${table}!`);

    } catch (error) {
        console.error(`❌ Error in ${table}:`, error.message);
    }
}

async function run() {
    // Determine title field for logging
    // Question Folders use 'name'
    await alignTable('question_folders', 'name');

    // Courses use 'title'
    await alignTable('courses', 'title');

    process.exit(0);
}

run();
