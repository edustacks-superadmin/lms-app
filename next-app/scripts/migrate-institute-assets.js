const { createClient } = require('@supabase/supabase-js');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const { PrismaClient } = require('@prisma/client');
// const fetch = require('node-fetch');

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

async function migrateInstituteAssets() {
    console.log('Starting institute-assets migration...');

    // institute_settings uses BigInt for ID, prisma handles it well usually but be validation
    const settingsList = await prisma.institute_settings.findMany();
    console.log(`Found ${settingsList.length} institute_settings records.`);

    let updatedCount = 0;
    let errorCount = 0;
    let skippedCount = 0;

    for (const settings of settingsList) {
        const updates = {};
        const fields = ['logo_url', 'favicon_url', 'upi_qr_url'];

        for (const field of fields) {
            const url = settings[field];
            if (!url) continue;

            if (url.includes(supabaseUrl) && url.includes('/storage/v1/object/public/')) {
                console.log(`Processing ${field} for ID ${settings.id}: ${url}`);

                try {
                    const parts = url.split('/storage/v1/object/public/')[1].split('/');
                    const bucket = parts[0];
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
                    const contentType = fileData.type || 'image/png';
                    const r2Key = `${bucket}/${filePath}`;

                    await r2.send(new PutObjectCommand({
                        Bucket: BUCKET_NAME,
                        Key: r2Key,
                        Body: buffer,
                        ContentType: contentType,
                    }));

                    const r2Url = `https://${R2_PUBLIC_DOMAIN}/${r2Key}`;
                    console.log(`  Uploaded to R2: ${r2Url}`);

                    updates[field] = r2Url;

                } catch (err) {
                    console.error(`  Error migrating ${field}:`, err.message);
                    errorCount++;
                }
            } else if (url.includes(R2_PUBLIC_DOMAIN)) {
                // already migrated
            } else {
                // unknown
            }
        }

        if (Object.keys(updates).length > 0) {
            if (process.argv.includes('--dry-run')) {
                console.log(`  [Dry Run] Would update institute_settings ID ${settings.id}:`, updates);
            } else {
                await prisma.institute_settings.update({
                    where: { id: settings.id },
                    data: updates,
                });
                console.log(`  Updated institute_settings ID ${settings.id}`);
                updatedCount++;
            }
        } else {
            skippedCount++;
        }
    }

    console.log('Migration complete.');
    console.log(`Updated: ${updatedCount}`);
    console.log(`Skipped: ${skippedCount}`);
    console.log(`Errors: ${errorCount}`);
}

migrateInstituteAssets()
    .catch((e) => console.error(e))
    .finally(async () => {
        await prisma.$disconnect();
    });
