const { PrismaClient } = require('@prisma/client');
const { S3Client, ListObjectsV2Command, DeleteObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });

// Import R2 config logic manually since we are in a script context and want direct control
const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'lms-assets';
const R2_DOMAIN = process.env.R2_PUBLIC_DOMAIN;

if (!accountId || !accessKeyId || !secretAccessKey) {
    console.error('R2 credentials missing.');
    process.exit(1);
}

const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
});

const prisma = new PrismaClient();

function extractKey(url) {
    if (!url) return null;
    if (url.includes('NEXT_PUBLIC_SUPABASE_URL')) {
        const parts = url.split('NEXT_PUBLIC_SUPABASE_URL');
        if (parts.length > 1) {
            const suffix = parts[1];
            const match = suffix.match(/"(\/[^"]+)/);
            if (match) return match[1].substring(1);
        }
    }
    // Standard extraction
    if (R2_DOMAIN && url.startsWith(R2_DOMAIN)) {
        return url.replace(`${R2_DOMAIN}/`, '');
    }
    const r2Pattern = /r2\.cloudflarestorage\.com\/[^/]+\/(.+)$/;
    const match = url.match(r2Pattern);
    if (match) return match[1];

    // Fallback: if url contains /testimonials/
    const idx = url.indexOf('/testimonials/');
    if (idx !== -1) return url.substring(idx + 1);

    return null;
}

async function main() {
    console.log('Starting cleanup of orphaned testimonial images in R2...');

    // 1. Get all file keys from R2 in 'testimonials/' folder
    const r2Keys = new Set();
    try {
        let isTruncated = true;
        let continuationToken = undefined;
        while (isTruncated) {
            const command = new ListObjectsV2Command({
                Bucket: R2_BUCKET,
                Prefix: 'testimonials/',
                ContinuationToken: continuationToken,
            });
            const response = await r2Client.send(command);
            response.Contents?.forEach(file => {
                r2Keys.add(file.Key);
            });
            isTruncated = response.IsTruncated;
            continuationToken = response.NextContinuationToken;
        }
        console.log(`Found ${r2Keys.size} files in R2 'testimonials/' folder.`);
    } catch (e) {
        console.error('Error listing R2 objects:', e);
        return;
    }

    // 2. Get active keys from DB
    const dbKeys = new Set();
    const testimonials = await prisma.testimonials.findMany({
        select: { image_url: true }
    });

    for (const t of testimonials) {
        if (t.image_url) {
            const key = extractKey(t.image_url);
            if (key) {
                dbKeys.add(key);
            }
        }
    }
    console.log(`Found ${dbKeys.size} active images in DB.`);

    // 3. Find Orphans
    const orphans = [];
    for (const key of r2Keys) {
        if (!dbKeys.has(key)) {
            orphans.push(key);
        }
    }

    console.log(`Found ${orphans.length} orphaned files.`);

    // 4. Delete Orphans
    for (const key of orphans) {
        console.log(`Deleting orphan: ${key}`);
        try {
            await r2Client.send(new DeleteObjectCommand({
                Bucket: R2_BUCKET,
                Key: key
            }));
            console.log('  Deleted.');
        } catch (e) {
            console.error('  Failed to delete:', e);
        }
    }

    console.log('Cleanup complete.');
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
