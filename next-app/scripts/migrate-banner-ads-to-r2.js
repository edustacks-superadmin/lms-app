/**
 * Migration Script: Supabase Storage → Cloudflare R2
 * Bucket: banner-ads
 * Table: banner_ads
 * Column: image_url
 * 
 * Run with: node scripts/migrate-banner-ads-to-r2.js --dry-run
 * Then: node scripts/migrate-banner-ads-to-r2.js
 * Finally: node scripts/migrate-banner-ads-to-r2.js --delete
 */

require('dotenv').config();
const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// ============ CONFIGURATION ============
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'banner-ads';
const DB_TABLE = 'banner_ads';
const DB_COLUMN = 'image_url';

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'lms-assets';
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN?.split('NEXT_PUBLIC')[0].trim();

// Options
const DRY_RUN = process.argv.includes('--dry-run');
const DELETE_AFTER = process.argv.includes('--delete');

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

// ============ HELPERS ============
async function listAllFiles(bucket, folder = '') {
    const allFiles = [];
    let offset = 0;
    const limit = 100;

    while (true) {
        const { data, error } = await supabase.storage
            .from(bucket)
            .list(folder, { limit, offset });

        if (error) {
            console.error('Error listing files:', error.message);
            break;
        }

        if (!data || data.length === 0) break;

        const files = data.filter(item => item.metadata);
        allFiles.push(...files.map(f => folder ? `${folder}/${f.name}` : f.name));

        const folders = data.filter(item => !item.metadata);
        for (const subFolder of folders) {
            const subPath = folder ? `${folder}/${subFolder.name}` : subFolder.name;
            const subFiles = await listAllFiles(bucket, subPath);
            allFiles.push(...subFiles);
        }

        if (data.length < limit) break;
        offset += limit;
    }

    return allFiles;
}

async function downloadFile(bucket, filePath) {
    const { data, error } = await supabase.storage
        .from(bucket)
        .download(filePath);

    if (error) throw error;
    return data;
}

async function uploadToR2(key, body, contentType) {
    const command = new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: Buffer.from(await body.arrayBuffer()),
        ContentType: contentType,
    });

    await r2Client.send(command);
    return `${R2_PUBLIC_DOMAIN}/${key}`;
}

async function updateDatabaseUrl(oldUrl, newUrl) {
    // Note: oldUrl might be a public URL, we match by exact string content
    const { data, error } = await supabase
        .from(DB_TABLE)
        .update({ [DB_COLUMN]: newUrl })
        .eq(DB_COLUMN, oldUrl)
        .select('id');

    if (error) {
        console.error('DB update error:', error.message);
        return 0;
    }
    return data?.length || 0;
}

async function deleteFromSupabase(bucket, filePath) {
    const { error } = await supabase.storage
        .from(bucket)
        .remove([filePath]);

    if (error) {
        console.error(`Delete error for ${filePath}:`, error.message);
        return false;
    }
    return true;
}

// ============ MAIN MIGRATION ============
async function migrate() {
    console.log('🚀 Starting Banner Ads Migration');
    console.log('=====================================');
    console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes)' : '⚡ LIVE MIGRATION'}`);
    console.log(`Delete after: ${DELETE_AFTER ? 'Yes' : 'No'}`);
    console.log(`Bucket: ${BUCKET_NAME}`);
    console.log('');

    // Validate config
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !R2_PUBLIC_DOMAIN) {
        console.error('❌ Missing credentials');
        process.exit(1);
    }

    // List all files
    console.log(`📂 Listing files in '${BUCKET_NAME}' bucket...`);
    const files = await listAllFiles(BUCKET_NAME);
    console.log(`Found ${files.length} files\n`);

    if (files.length === 0) {
        console.log('No files to migrate!');
        return;
    }

    let migrated = 0;
    let failed = 0;
    let dbUpdated = 0;

    for (const filePath of files) {
        const r2Key = `${BUCKET_NAME}/${filePath}`;
        // Construct the old Supabase URL pattern to search in DB
        const oldUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${filePath}`;
        const newUrl = `${R2_PUBLIC_DOMAIN}/${r2Key}`;

        console.log(`\n[${migrated + failed + 1}/${files.length}] ${filePath}`);

        if (DRY_RUN) {
            console.log(`  📁 Would migrate: ${oldUrl.substring(0, 60)}...`);
            console.log(`  📁 To: ${newUrl.substring(0, 60)}...`);
            migrated++;
            continue;
        }

        try {
            console.log('  ⬇️  Downloading...');
            const fileBlob = await downloadFile(BUCKET_NAME, filePath);

            console.log('  ⬆️  Uploading to R2...');
            const contentType = fileBlob.type || 'application/octet-stream';
            await uploadToR2(r2Key, fileBlob, contentType);

            console.log('  🔄 Updating database...');
            const updated = await updateDatabaseUrl(oldUrl, newUrl);
            dbUpdated += updated;
            console.log(`  ✅ Updated ${updated} DB records`);

            if (DELETE_AFTER) {
                console.log('  🗑️  Deleting from Supabase...');
                await deleteFromSupabase(BUCKET_NAME, filePath);
            }

            migrated++;
            console.log('  ✅ Done');
        } catch (error) {
            console.error(`  ❌ Error: ${error.message}`);
            failed++;
        }
    }

    // Summary
    console.log('\n=====================================');
    console.log('📊 MIGRATION SUMMARY');
    console.log('=====================================');
    console.log(`✅ Migrated: ${migrated}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`🔄 DB records updated: ${dbUpdated}`);

    if (DRY_RUN) {
        console.log('\n⚠️  This was a DRY RUN. No changes were made.');
        console.log('Run without --dry-run to perform actual migration.');
    }
}

migrate().catch(console.error);
