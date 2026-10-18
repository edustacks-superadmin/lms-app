/**
 * Cleanup Orphaned Banner Ads in R2
 * 
 * Identifies and deletes images in R2 'banner-ads/' folder
 * that are NOT referenced in the 'banner_ads' database table.
 * 
 * Run with: node scripts/cleanup-orphaned-r2-banners.js --dry-run
 * Then: node scripts/cleanup-orphaned-r2-banners.js
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { S3Client, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// ============ CONFIGURATION ============
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'lms-assets';
const R2_PREFIX = 'banner-ads/';

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

const DRY_RUN = process.argv.includes('--dry-run');

// ============ CLIENTS ============
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

async function cleanupOrphans() {
    console.log('🧹 Cleaning Orphaned R2 Banner Ads');
    console.log('====================================');
    console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '⚡ LIVE DELETION'}`);
    console.log('');

    // 1. Get all used image paths from Database
    console.log('Fetching database records...');
    const { data: banners, error } = await supabase
        .from('banner_ads')
        .select('image_url')
        .not('image_url', 'is', null);

    if (error) {
        console.error('❌ DB Error:', error.message);
        return;
    }

    // Extract filenames/keys from URLs
    const usedKeys = new Set();
    banners.forEach(b => {
        if (b.image_url && b.image_url.includes('/banner-ads/')) {
            const match = b.image_url.match(/banner-ads\/(.+)$/);
            if (match) {
                // Determine if URL encoded or not. 
                // R2 List usually returns raw keys. DB might store encoded.
                // We'll store both to be safe or decode.
                // Usually keys are not url encoded in S3 List output.
                const key = `banner-ads/${match[1]}`;
                usedKeys.add(key);
                usedKeys.add(decodeURIComponent(key));
            }
        }
    });

    console.log(`Found ${banners.length} valid banners in database.`);
    console.log(`Current Used Keys:`, Array.from(usedKeys));
    console.log('');

    // 2. List all files in R2 banner-ads folder
    console.log('Listing R2 files...');
    const r2Files = [];
    let continuationToken = undefined;

    do {
        const command = new ListObjectsV2Command({
            Bucket: R2_BUCKET,
            Prefix: R2_PREFIX,
            ContinuationToken: continuationToken
        });
        const response = await r2Client.send(command);
        if (response.Contents) {
            r2Files.push(...response.Contents);
        }
        continuationToken = response.NextContinuationToken;
    } while (continuationToken);

    console.log(`Found ${r2Files.length} files in R2.\n`);

    // 3. Find Orphans
    const orphans = r2Files.filter(file => !usedKeys.has(file.Key));

    if (orphans.length === 0) {
        console.log('✅ No orphaned files found! R2 is clean.');
        return;
    }

    console.log(`⚠️  Found ${orphans.length} ORPHANED files:`);
    orphans.forEach(f => console.log(`   - ${f.Key} (${(f.Size / 1024).toFixed(2)} KB)`));

    // 4. Delete Orphans
    console.log(`\nDeleting ${orphans.length} orphans...`);

    let deleted = 0;
    let failed = 0;

    for (const file of orphans) {
        if (DRY_RUN) {
            console.log(`   🗑️  Would delete: ${file.Key}`);
            deleted++; // Count as "would delete"
            continue;
        }

        try {
            await r2Client.send(new DeleteObjectCommand({
                Bucket: R2_BUCKET,
                Key: file.Key
            }));
            console.log(`   ✅ Deleted: ${file.Key}`);
            deleted++;
        } catch (err) {
            console.error(`   ❌ Failed to delete ${file.Key}:`, err.message);
            failed++;
        }
    }

    console.log('\n====================================');
    console.log('📊 SUMMARY');
    console.log('====================================');
    console.log(`Files in DB: ${banners.length}`);
    console.log(`Files in R2: ${r2Files.length}`);
    console.log(`Orphans: ${orphans.length}`);
    console.log(`Deleted: ${deleted}`);
    console.log(`Failed: ${failed}`);

    if (DRY_RUN) {
        console.log('\n⚠️  This was a DRY RUN. No files deleted.');
        console.log('Run without --dry-run to execute cleanup.');
    }
}

cleanupOrphans().catch(console.error);
