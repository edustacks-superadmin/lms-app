import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

// ==========================================
// CONFIGURATION
// ==========================================

const SUPABASE_URL = 'https://xalbtjoykovnlbjeddtv.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhhbGJ0am95a292bmxiamVkZHR2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjM0NTMyNDcsImV4cCI6MjA3OTAyOTI0N30.lcVDOTikpLEhVSW33yt7_JCWNlceGHaEAaBguGRVT_c';

const TESTPRESS_BASE_URL = 'https://thapovaninstitute.testpress.in/';
const TESTPRESS_TOKEN = 'eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJ1c2VyX2lkIjoxLCJ1c2VybmFtZSI6MSwiZXhwIjoxNzY0ODU0MjI2LCJlbWFpbCI6Im1haGVzaGllc2FjYWRlbXlAZ21haWwuY29tIiwiaWQiOjEsImluc3RpdHV0ZSI6MTM2NX0.UdPdy10rR--SFCExJUp8eNyHz9EacR3lisGSPGjjFVQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchFromTestpress(url, token) {
    console.log(`Fetching: ${url}...`);
    try {
        const response = await fetch(url, {
            headers: { 'Authorization': `JWT ${token}` }
        });
        if (!response.ok) throw new Error(`Fetch failed: ${response.statusText}`);
        return await response.json();
    } catch (error) {
        console.error(`Error fetching ${url}:`, error.message);
        return null;
    }
}

// Helper function to add delay between requests
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

async function migrateBatchesWithMapping(token) {
    console.log('\n╔════════════════════════════════════════════╗');
    console.log('║   MIGRATING ALL BATCHES FROM TESTPRESS     ║');
    console.log('║    WITH ID MAPPING FOR FUTURE USE          ║');
    console.log('╚════════════════════════════════════════════╝\n');

    // Fetch ALL batches from Testpress with pagination
    const batchesUrl = `${TESTPRESS_BASE_URL}api/v2.5/admin/batches/`;
    console.log(`Fetching batches from: ${batchesUrl}\n`);

    let allBatches = [];
    let currentUrl = batchesUrl;
    let pageNum = 1;

    // Loop through all pages
    while (currentUrl) {
        console.log(`📄 Fetching page ${pageNum}...`);
        const batchesData = await fetchFromTestpress(currentUrl, token);

        if (!batchesData || !batchesData.results) {
            console.error('❌ Failed to fetch batches from Testpress');
            break;
        }

        console.log(`   ✅ Got ${batchesData.results.length} batches from page ${pageNum}`);
        allBatches = allBatches.concat(batchesData.results);

        // Check if there's a next page
        currentUrl = batchesData.next;
        pageNum++;

        // Add small delay between page requests
        if (currentUrl) {
            await delay(300);
        }
    }

    console.log(`\n📚 Total batches found: ${allBatches.length}\n`);

    // Save all batches for reference
    fs.writeFileSync('debug_all_batches.json', JSON.stringify(allBatches, null, 2));

    let totalImported = 0;
    let totalSkipped = 0;
    let totalErrors = 0;
    let batchMapping = []; // This will store Testpress ID → LMS ID mapping

    console.log('='.repeat(60));
    console.log('Processing batches...\n');

    for (let i = 0; i < allBatches.length; i++) {
        const tpBatch = allBatches[i];

        try {
            const batchName = tpBatch.name || tpBatch.title || 'Untitled Batch';
            console.log(`\n[${i + 1}/${allBatches.length}] 📦 ${batchName}`);
            console.log(`   🆔 Testpress ID: ${tpBatch.id}`);

            // Check if batch already exists
            const searchName = `${batchName} [TP-${tpBatch.id}]`;
            const { data: existing } = await supabase
                .from('batches')
                .select('id, name')
                .eq('name', searchName)
                .single();

            if (existing) {
                console.log(`   ⏭️  Skipped (already exists - LMS ID: ${existing.id})`);
                // Still add to mapping
                batchMapping.push({
                    testpress_id: tpBatch.id,
                    lms_id: existing.id,
                    name: batchName,
                    testpress_url: tpBatch.url,
                    created: tpBatch.created,
                    modified: tpBatch.modified
                });
                totalSkipped++;
                continue;
            }

            // Include Testpress ID in name for easy reference
            const batchData = {
                name: `${batchName} [TP-${tpBatch.id}]`,
                created_at: tpBatch.created || new Date().toISOString(),
            };

            // Insert batch
            const { data: batch, error } = await supabase
                .from('batches')
                .insert(batchData)
                .select()
                .single();

            if (error) {
                console.error(`   ❌ Error:`, error.message);
                totalErrors++;
            } else {
                console.log(`   ✅ Imported (LMS ID: ${batch.id})`);
                console.log(`   🔗 Mapping: TP-${tpBatch.id} → LMS-${batch.id}`);

                // Store the mapping for future migrations
                batchMapping.push({
                    testpress_id: tpBatch.id,
                    lms_id: batch.id,
                    name: batchName,
                    testpress_url: tpBatch.url,
                    created: tpBatch.created,
                    modified: tpBatch.modified
                });

                totalImported++;
            }

            // Add delay to avoid rate limiting
            if (i < allBatches.length - 1) {
                await delay(200);
            }

        } catch (error) {
            console.error(`   ❌ Exception:`, error.message);
            totalErrors++;
        }
    }

    // Save the mapping file for future use (e.g., user/member migrations)
    fs.writeFileSync('batch_id_mapping.json', JSON.stringify(batchMapping, null, 2));
    console.log('\n💾 Saved batch ID mapping to batch_id_mapping.json');
    console.log('   This file maps Testpress batch IDs to LMS batch IDs');
    console.log('   Use this for future user/member migrations!\n');

    console.log('='.repeat(60));
    console.log('╔════════════════════════════════════════════╗');
    console.log('║           MIGRATION SUMMARY                ║');
    console.log('╚════════════════════════════════════════════╝');
    console.log(`\n✅ Successfully imported: ${totalImported} batches`);
    console.log(`⏭️  Skipped (duplicates):  ${totalSkipped} batches`);
    console.log(`❌ Errors:                ${totalErrors} batches`);
    console.log(`📊 Total processed:       ${totalImported + totalSkipped + totalErrors} batches`);
    console.log(`🗺️  Batch mappings saved: ${batchMapping.length}\n`);
}

async function runBatchMigration() {
    console.log('Starting FULL batch migration from Testpress...\n');
    await migrateBatchesWithMapping(TESTPRESS_TOKEN);
    console.log('\n✨ Batch migration complete!\n');
}

runBatchMigration();
