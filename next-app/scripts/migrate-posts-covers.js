const { PrismaClient } = require('@prisma/client');
const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });

// Config
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'lms-assets';
// Sanitize R2 domain
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN?.includes('NEXT_PUBLIC')
    ? process.env.R2_PUBLIC_DOMAIN.split('NEXT_PUBLIC')[0].trim()
    : process.env.R2_PUBLIC_DOMAIN;

if (R2_PUBLIC_DOMAIN && R2_PUBLIC_DOMAIN.endsWith('"')) {
    // strip trailing quote if present from sanitizer
} // actually sanitizer handled above roughly but clearer to be safe

const DRY_RUN = process.argv.includes('--dry-run');

const prisma = new PrismaClient();
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: R2_ACCESS_KEY_ID, secretAccessKey: R2_SECRET_ACCESS_KEY },
});

async function main() {
    console.log('Starting Posts Cover Image Migration...');
    console.log(`Dry Run: ${DRY_RUN}`);

    // 1. Find posts with Supabase URLs
    const posts = await prisma.posts.findMany({
        where: {
            cover_image: {
                contains: 'supabase.co/storage/v1/object/public/icons'
            }
        }
    });

    console.log(`Found ${posts.length} posts with Supabase images.`);

    for (const post of posts) {
        const oldUrl = post.cover_image;
        console.log(`Processing Post ID ${post.id}: ${oldUrl}`);

        // Extract path: .../icons/Custom/filename.jpg -> Custom/filename.jpg
        // The URL format is .../icons/<path>
        // We know bucket is 'icons'
        const marker = '/icons/';
        const partIndex = oldUrl.indexOf(marker);
        if (partIndex === -1) {
            console.warn('  Could not parse URL structure.');
            continue;
        }

        const relativePath = oldUrl.substring(partIndex + marker.length); // e.g., "Custom/filename.jpg"
        const r2Key = `icons/${relativePath}`; // e.g., "icons/Custom/filename.jpg"
        const newUrl = `${R2_PUBLIC_DOMAIN}/${r2Key}`;

        if (DRY_RUN) {
            console.log(`  Would migrate to: ${newUrl}`);
            continue;
        }

        try {
            // Download from Supabase 'icons' bucket
            const { data: fileBlob, error: dlError } = await supabase.storage
                .from('icons')
                .download(relativePath);

            if (dlError) {
                console.error(`  Download failed: ${dlError.message}`);
                // If 404, maybe file is already gone?
                continue;
            }

            // Upload to R2
            const buffer = Buffer.from(await fileBlob.arrayBuffer());
            const contentType = fileBlob.type || 'image/jpeg';

            await r2Client.send(new PutObjectCommand({
                Bucket: R2_BUCKET,
                Key: r2Key,
                Body: buffer,
                ContentType: contentType
            }));
            console.log('  Uploaded to R2.');

            // Update DB
            await prisma.posts.update({
                where: { id: post.id },
                data: { cover_image: newUrl }
            });
            console.log('  DB Updated.');

        } catch (e) {
            console.error('  Migration failed:', e);
        }
    }
}

main()
    .catch(e => console.error(e))
    .finally(() => prisma.$disconnect());
