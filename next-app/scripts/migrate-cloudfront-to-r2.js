/**
 * Migration Script: Cloudfront → Cloudflare R2
 * Source Prefix: https://d102ewyqwv3qiv.cloudfront.net/...
 * Target R2 Bucket: lms-assets
 * Target R2 Path: avatars/migrated/[filename]
 * DB Table: members
 * DB Column: photo_url
 *
 * Usage:
 *   node scripts/migrate-cloudfront-to-r2.js              (Migrate all in batches)
 *   node scripts/migrate-cloudfront-to-r2.js --concurrency 50
 */

require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const https = require('https');

// ============ CONFIGURATION ============
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const PREFIX = 'https://d102ewyqwv3qiv.cloudfront.net/institute/thapovaninstitute/user_profiles/';

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'lms-assets';

// Sanitize R2 public domain
let rawDomain = process.env.R2_PUBLIC_DOMAIN || '';
if (rawDomain.includes('NEXT_PUBLIC_SUPABASE_URL')) {
    rawDomain = rawDomain.split('NEXT_PUBLIC_SUPABASE_URL')[0];
}
const R2_PUBLIC_DOMAIN = rawDomain.trim();

// Args
const args = process.argv.slice(2);
const concurrencyArgIndex = args.indexOf('--concurrency');
const CONCURRENCY = concurrencyArgIndex !== -1 ? parseInt(args[concurrencyArgIndex + 1]) : 50;
const BATCH_SIZE = 1000; // Supabase fetch limit

// Clients
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

function downloadFile(url) {
    return new Promise((resolve, reject) => {
        const req = https.get(url, (res) => {
            if (res.statusCode !== 200) {
                const err = new Error(`Status ${res.statusCode}`);
                err.statusCode = res.statusCode;
                resolve({ error: err }); // Resolve with error to avoid crashing Promise.all
            }
            const chunks = [];
            res.on('data', chunk => chunks.push(chunk));
            res.on('end', () => {
                const buffer = Buffer.concat(chunks);
                resolve({
                    buffer,
                    contentType: res.headers['content-type'] || 'image/jpeg'
                });
            });
        });

        req.on('error', (e) => resolve({ error: new Error(`Network: ${e.message}`) }));
        req.setTimeout(5000, () => { // 5 Second Timeout
            req.destroy();
            resolve({ error: new Error('Timeout') });
        });
    });
}

async function uploadToR2(key, body, contentType) {
    const command = new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
    });

    // Safety timeout for upload as well
    const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Upload Timeout')), 8000));

    await Promise.race([
        r2Client.send(command),
        timeoutPromise
    ]);

    return `${R2_PUBLIC_DOMAIN}/${key}`;
}

async function processMember(member) {
    const oldUrl = member.photo_url;
    const filename = oldUrl.split('/').pop().split('?')[0]; // Simple sanitization
    const r2Key = `avatars/migrated/${filename}`;

    try {
        // A. Download
        const { buffer, contentType, error: dlError } = await downloadFile(oldUrl);
        if (dlError) throw dlError;

        // B. Upload
        const newUrl = await uploadToR2(r2Key, buffer, contentType);

        // C. Update DB
        const { error: updateError } = await supabase
            .from('members')
            .update({ photo_url: newUrl })
            .eq('id', member.id);

        if (updateError) throw updateError;

        return { success: true };
    } catch (err) {
        return { success: false, error: err.message };
    }
}

async function processBatch(members) {
    console.log(`Processing batch of ${members.length}...`);
    let processedCount = 0;
    let successCount = 0;
    let failCount = 0;

    const queue = [...members];
    const updateProgress = () => {
        if (processedCount % 100 === 0 && processedCount > 0) {
            console.log(`   Progress: ${processedCount}/${members.length} (Success: ${successCount}, Failed: ${failCount})`);
        }
    };

    const worker = async () => {
        while (queue.length > 0) {
            const member = queue.shift();
            const result = await processMember(member);
            processedCount++;
            if (result.success) successCount++;
            else failCount++;
            updateProgress();
        }
    };

    const workers = [];
    for (let i = 0; i < CONCURRENCY; i++) workers.push(worker());
    await Promise.all(workers);

    return { successCount, failCount };
}

async function run() {
    console.log('🚀 Starting Cloudfront -> R2 Auto-Loop Migration');
    console.log(`Concurrency: ${CONCURRENCY}`);

    let totalSuccess = 0;
    let totalFailed = 0;
    let batchNum = 1;

    while (true) {
        console.log(`\n--- Fetching Batch ${batchNum} ---`);
        const { data: members, error } = await supabase
            .from('members')
            .select('id, email, photo_url')
            .ilike('photo_url', `${PREFIX}%`)
            .limit(BATCH_SIZE);

        if (error) {
            console.error('DB Fetch Error:', error);
            break;
        }

        if (!members || members.length === 0) {
            console.log('No more records found. Migration Complete.');
            break;
        }

        console.log(`Found ${members.length} records.`);
        const { successCount, failCount } = await processBatch(members);

        totalSuccess += successCount;
        totalFailed += failCount;
        console.log(`Batch ${batchNum} Complete. (+${successCount} success, +${failCount} failed)`);

        // Safety break if we failed EVERYONE in the batch to avoid infinite loop on hard errors
        if (failCount === members.length && successCount === 0) {
            console.error('❌ Critical Error: Entire batch failed. Stopping to prevent infinite loop.');
            break;
        }

        batchNum++;
    }

    console.log('\n=====================================');
    console.log('✅ FINAL SUMMARY');
    console.log(`Total Success: ${totalSuccess}`);
    console.log(`Total Failed: ${totalFailed}`);
    console.log('=====================================');
}

run();
