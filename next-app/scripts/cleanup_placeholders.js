require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const { S3Client, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');

// Config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'lms-assets';

// Sanitize domain
let rawDomain = process.env.R2_PUBLIC_DOMAIN || '';
if (rawDomain.includes('NEXT_PUBLIC_SUPABASE_URL')) {
    rawDomain = rawDomain.split('NEXT_PUBLIC_SUPABASE_URL')[0];
}
const R2_PUBLIC_DOMAIN = rawDomain.trim();

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

async function cleanup() {
    console.log('🚀 Starting Cleanup of Placeholder Avatars');
    const TARGET_SIZE = 11559;

    let continuationToken = undefined;
    let processed = 0;
    let deleted = 0;
    let dbUpdated = 0;

    let allSuspiciousKeys = [];

    // 1. Scan Phase
    console.log('Scanning R2 bucket for placeholders...');
    do {
        const command = new ListObjectsV2Command({
            Bucket: R2_BUCKET,
            Prefix: 'avatars/',
            ContinuationToken: continuationToken
        });

        try {
            const response = await r2Client.send(command);
            const contents = response.Contents || [];

            for (const file of contents) {
                if (file.Size === TARGET_SIZE) {
                    allSuspiciousKeys.push(file.Key);
                }
            }
            continuationToken = response.NextContinuationToken;
        } catch (err) {
            console.error('Error scanning:', err);
            process.exit(1);
        }
    } while (continuationToken);

    console.log(`Found ${allSuspiciousKeys.length} placeholder files to delete.\n`);

    // 2. Action Phase
    const BATCH_SIZE = 50;
    for (let i = 0; i < allSuspiciousKeys.length; i += BATCH_SIZE) {
        const batchKeys = allSuspiciousKeys.slice(i, i + BATCH_SIZE);
        console.log(`Processing batch ${i} - ${i + batchKeys.length}...`);

        await Promise.all(batchKeys.map(async (key) => {
            const fullUrl = `${R2_PUBLIC_DOMAIN}/${key}`;

            try {
                // A. Delete from R2
                await r2Client.send(new DeleteObjectCommand({
                    Bucket: R2_BUCKET,
                    Key: key
                }));

                // B. Update DB
                // Matching exactly the R2 URL we just created in the previous migration
                const { error, count } = await supabase
                    .from('members')
                    .update({ photo_url: null })
                    .eq('photo_url', fullUrl); // Match the R2 URL

                if (error) {
                    console.error(`DB Error for ${key}:`, error.message);
                } else {
                    // console.log(`Deleted ${key}, DB updated: ${count}`);
                    if (count > 0) dbUpdated++;
                }

                deleted++;
            } catch (e) {
                console.error(`Error processing ${key}:`, e.message);
            }
        }));
    }

    console.log('\n=====================================');
    console.log('✅ CLEANUP COMPLETE');
    console.log(`🗑️  Deleted Objects: ${deleted}`);
    console.log(`DATA  DB Records Nullified: ${dbUpdated}`);
    console.log('=====================================');
}

cleanup();
