/**
 * Migration Script: Supabase Storage → Cloudflare R2
 * Source Bucket: avatars
 * Target R2 Bucket: lms-assets
 * Target R2 Path: avatars/[filename]
 * DB Table: members
 * DB Column: photo_url
 * 
 * Run with: node scripts/migrate-avatars-to-r2.js --dry-run
 * Then: node scripts/migrate-avatars-to-r2.js
 * Finally: node scripts/migrate-avatars-to-r2.js --delete
 */

require('dotenv').config({ path: '.env.local' }); // Try loading .env.local explicitly if .env fails
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');

// ============ CONFIGURATION ============
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const BUCKET_NAME = 'avatars'; // Supabase bucket
const DB_TABLE = 'members';
const DB_COLUMN = 'photo_url';

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'lms-assets';

// Sanitize R2 public domain (handle the corrupted env var case)
let rawDomain = process.env.R2_PUBLIC_DOMAIN || '';
if (rawDomain.includes('NEXT_PUBLIC_SUPABASE_URL')) {
    rawDomain = rawDomain.split('NEXT_PUBLIC_SUPABASE_URL')[0];
}
const R2_PUBLIC_DOMAIN = rawDomain.trim();

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

    console.log(`Listing files in ${bucket} (offset ${offset})...`);

    while (true) {
        const { data, error } = await supabase.storage
            .from(bucket)
            .list(folder, { limit, offset });

        if (error) {
            console.error('Error listing files:', error.message);
            break;
        }

        if (!data || data.length === 0) break;

        const files = data.filter(item => item.metadata); // Files have metadata
        allFiles.push(...files.map(f => folder ? `${folder}/${f.name}` : f.name));

        // Recursively checking folders is not strictly needed for 'avatars' usually, 
        // but good to have if there are subfolders.
        const folders = data.filter(item => !item.metadata); // Folders don't have metadata (usually)
        for (const subFolder of folders) {
            // Skip empty placeholder folders if any
            if (subFolder.name === '.emptyFolderPlaceholder') continue;

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
    // Return the Clean Public URL
    return `${R2_PUBLIC_DOMAIN}/${key}`;
}

async function updateDatabaseUrl(oldUrl, newUrl) {
    // Note: oldUrl might be a public URL. 
    // Supabase Public URL format: https://[project].supabase.co/storage/v1/object/public/[bucket]/[file]

    // We update matches where the DB has the OLD URL exactly.
    const { data, error, count } = await supabase
        .from(DB_TABLE)
        .update({ [DB_COLUMN]: newUrl })
        .eq(DB_COLUMN, oldUrl)
        .select('id', { count: 'exact' });

    if (error) {
        return 0;
    }
    return count || data?.length || 0;
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
    console.log('🚀 Starting Avatars Migration');
    console.log('=====================================');
    console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN (no changes)' : '⚡ LIVE MIGRATION'}`);
    console.log(`Delete after: ${DELETE_AFTER ? 'Yes' : 'No'}`);
    console.log(`Source Bucket: ${BUCKET_NAME}`);
    console.log(`Target R2 Bucket: ${R2_BUCKET}`);
    console.log(`Target R2 Domain: ${R2_PUBLIC_DOMAIN}`);
    console.log(`Target DB Table: ${DB_TABLE}.${DB_COLUMN}`);
    console.log('');

    // Validate config
    if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY || !R2_PUBLIC_DOMAIN || !R2_ACCOUNT_ID) {
        console.error('❌ Missing credentials in .env or .env.local');
        console.log('SUPABASE_URL:', !!SUPABASE_URL);
        console.log('SUPABASE_SERVICE_KEY:', !!SUPABASE_SERVICE_KEY);
        console.log('R2_PUBLIC_DOMAIN:', !!R2_PUBLIC_DOMAIN);
        console.log('R2_ACCOUNT_ID:', !!R2_ACCOUNT_ID);
        process.exit(1);
    }

    // List all files
    console.log(`📂 Listing files in '${BUCKET_NAME}' bucket...`);
    const files = await listAllFiles(BUCKET_NAME);
    console.log(`\nFound ${files.length} files total.\n`);

    if (files.length === 0) {
        console.log('No files to migrate!');
        return;
    }

    let migrated = 0;
    let failed = 0;
    let dbUpdated = 0;

    for (const filePath of files) {
        // R2 Key: avatars/filename.png
        // We add 'avatars/' explicitly to keep them organized in the shared lms-assets bucket
        const r2Key = `avatars/${filePath}`;

        // Supabase URL pattern to search in DB
        // https://[project].supabase.co/storage/v1/object/public/avatars/[filePath]
        const oldUrl = `${SUPABASE_URL}/storage/v1/object/public/${BUCKET_NAME}/${filePath}`;
        const newUrl = `${R2_PUBLIC_DOMAIN}/${r2Key}`;

        console.log(`[${migrated + failed + 1}/${files.length}] ${filePath}`);

        if (DRY_RUN) {
            console.log(`  Target R2 Key: ${r2Key}`);
            console.log(`  Old URL: ${oldUrl}`);
            console.log(`  New URL: ${newUrl}`);
            migrated++;
            continue;
        }

        try {
            console.log('  ⬇️  Downloading...');
            const fileBlob = await downloadFile(BUCKET_NAME, filePath);

            console.log('  ⬆️  Uploading to R2...');
            // Detect mime type or default
            let contentType = fileBlob.type;
            if (!contentType) {
                if (filePath.endsWith('.png')) contentType = 'image/png';
                else if (filePath.endsWith('.jpg') || filePath.endsWith('.jpeg')) contentType = 'image/jpeg';
                else contentType = 'application/octet-stream';
            }

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
    console.log(`✅ Processed: ${migrated}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`🔄 DB records updated: ${dbUpdated}`);

    if (DRY_RUN) {
        console.log('\n⚠️  This was a DRY RUN. No changes were made.');
        console.log('Run without --dry-run to perform actual migration.');
    }
}

migrate().catch(console.error);
