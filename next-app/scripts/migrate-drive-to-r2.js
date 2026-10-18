const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const axios = require('axios');
require('dotenv').config();
require('dotenv').config({ path: '.env.local' });

// ============ CONFIGURATION ============
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'lms-assets';
const R2_FOLDER = 'profiles'; // Folder in R2

// Handle potentially corrupted domain env var
let rawDomain = process.env.R2_PUBLIC_DOMAIN || '';
if (rawDomain.includes('NEXT_PUBLIC_SUPABASE_URL')) {
    rawDomain = rawDomain.split('NEXT_PUBLIC_SUPABASE_URL')[0];
}
const R2_PUBLIC_DOMAIN = rawDomain.trim();

// Options
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

// ============ HELPERS ============
function getDriveId(url) {
    if (!url) return null;
    const match = url.match(/[-\w]{25,}/);
    return match ? match[0] : null;
}

async function downloadFromDrive(fileId) {
    const url = `https://drive.google.com/uc?export=download&id=${fileId}`;
    console.log(`  ⬇️  Downloading from: ${url}`);

    const response = await axios.get(url, {
        responseType: 'arraybuffer',
        headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
    });

    const contentType = response.headers['content-type'];

    if (contentType?.includes('text/html')) {
        const snippet = Buffer.from(response.data).toString('utf8').substring(0, 500);
        console.log(`  ⚠️  Warning: Received HTML instead of image. Snippet: ${snippet}`);
        throw new Error('Received HTML instead of image (likely login page or permission issue)');
    }

    return {
        buffer: Buffer.from(response.data),
        contentType: contentType
    };
}

async function uploadToR2(key, buffer, contentType) {
    const command = new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: buffer,
        ContentType: contentType,
    });
    await r2Client.send(command);
    return `${R2_PUBLIC_DOMAIN}/${key}`;
}

// ============ MAIN ============
async function migratePhotos() {
    console.log('🚀 Starting Google Drive -> R2 Photo Migration');
    console.log(`Mode: ${DRY_RUN ? '🔍 DRY RUN' : '⚡ LIVE'}`);
    console.log('------------------------------------------------');

    if (!R2_ACCOUNT_ID || !R2_PUBLIC_DOMAIN) {
        console.error('❌ R2 Credentials or Domain missing in environment variables');
        return;
    }

    // 1. Fetch members with Drive URLs
    const { data: members, error } = await supabase
        .from('members')
        .select('id, photo_url, display_name')
        .ilike('photo_url', '%drive.google.com%');

    if (error) {
        console.error('❌ Error fetching members:', error.message);
        return;
    }

    console.log(`Found ${members.length} members with Drive photo links.\n`);

    let success = 0;
    let failed = 0;

    for (const member of members) {
        const driveId = getDriveId(member.photo_url);
        if (!driveId) {
            console.log(`⚠️ Skipping ${member.display_name} (${member.id}): Could not extract Drive ID from ${member.photo_url}`);
            continue;
        }

        console.log(`Processing [${success + failed + 1}/${members.length}]: ${member.display_name}`);

        if (DRY_RUN) {
            console.log(`  🔍 Would migrate: ${member.photo_url} -> profiles/member_${member.id}_...`);
            success++;
            continue;
        }

        try {
            // 2. Download
            const { buffer, contentType } = await downloadFromDrive(driveId);

            // 3. Upload
            const ext = contentType?.split('/')[1] || 'jpg';
            const r2Key = `profiles/member_${member.id}_${Date.now()}.${ext}`;
            const newUrl = await uploadToR2(r2Key, buffer, contentType);

            // 4. Update DB
            const { error: updateError } = await supabase
                .from('members')
                .update({ photo_url: newUrl })
                .eq('id', member.id);

            if (updateError) throw updateError;

            console.log(`  ✅ Successfully migrated to: ${newUrl}`);
            success++;
        } catch (err) {
            console.error(`  ❌ Failed: ${err.message}`);
            failed++;
        }
    }

    console.log('\n------------------------------------------------');
    console.log('🏁 Migration Summary:');
    console.log(`✅ Success: ${success}`);
    console.log(`❌ Failed: ${failed}`);
}

migratePhotos().catch(console.error);
