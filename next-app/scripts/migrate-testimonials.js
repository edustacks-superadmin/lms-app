const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { PrismaClient } = require('@prisma/client');
// const fetch = require('node-fetch'); // Native fetch in Node 18+

require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });

// Initialize Supabase Client
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
    console.error('Error: NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.');
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);
const prisma = new PrismaClient();

// Initialize R2 Client
const r2 = new S3Client({
    region: 'auto',
    endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: process.env.R2_ACCESS_KEY_ID,
        secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
    },
});

const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN.replace(/^https?:\/\//, '').replace(/\/$/, '');
const BUCKET_NAME = process.env.R2_BUCKET_NAME;

async function migrateTestimonials() {
    console.log('Starting testimonials migration...');

    const settingsList = await prisma.testimonials.findMany();
    console.log(`Found ${settingsList.length} testimonials records.`);

    let updatedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const item of settingsList) {
        const url = item.image_url;
        if (!url) {
            skippedCount++;
            continue;
        }

        if (url.includes(supabaseUrl) && url.includes('/storage/v1/object/public/')) {
            console.log(`Processing ID ${item.id}: ${url}`);

            try {
                const parts = url.split('/storage/v1/object/public/')[1].split('/');
                const bucket = parts[0]; // Should be 'testimonials' usually
                const filePath = parts.slice(1).join('/');

                const { data: fileData, error: downloadError } = await supabase.storage
                    .from(bucket)
                    .download(filePath);

                if (downloadError) {
                    console.error(`  Failed to download from Supabase (${bucket}/${filePath}):`, downloadError.message);
                    errorCount++;
                    continue;
                }

                const buffer = Buffer.from(await fileData.arrayBuffer());
                const contentType = fileData.type || 'image/jpeg';
                const r2Key = `${bucket}/${filePath}`;

                await r2.send(new PutObjectCommand({
                    Bucket: BUCKET_NAME,
                    Key: r2Key,
                    Body: buffer,
                    ContentType: contentType,
                }));

                const r2Url = `https://${R2_PUBLIC_DOMAIN}/${r2Key}`;
                console.log(`  Uploaded to R2: ${r2Url}`);

                if (process.argv.includes('--dry-run')) {
                    console.log(`  [Dry Run] Would update testimonial ID ${item.id} to ${r2Url}`);
                } else {
                    await prisma.testimonials.update({
                        where: { id: item.id },
                        data: { image_url: r2Url },
                    });
                    console.log(`  Updated testimonial ID ${item.id}`);
                    updatedCount++;
                }

            } catch (err) {
                console.error(`  Error migrating ID ${item.id}:`, err.message);
                errorCount++;
            }
        } else if (url.includes(R2_PUBLIC_DOMAIN)) {
            skippedCount++;
        } else {
            console.log(`  ID ${item.id} unknown URL: ${url}`);
            skippedCount++;
        }
    }

    console.log('Migration complete.');
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
}

migrateTestimonials()
    .catch((e) => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
