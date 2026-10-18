require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'lms-assets';
const R2_PUBLIC_DOMAIN = 'https://pub-7ebc64389e3648b195eaa7d615ca4216.r2.dev'; // Hardcoded from previous context or env

const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

async function findUnique() {
    console.log('Scanning for unique files in R2...');

    let continuationToken = undefined;
    const TARGET_SIZE = 11559;

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
                if (file.Size !== TARGET_SIZE) {
                    console.log(`\nFound Unique File:`);
                    console.log(`Key: ${file.Key}`);
                    console.log(`Size: ${file.Size} bytes`);
                    console.log(`URL: ${R2_PUBLIC_DOMAIN}/${file.Key}`);
                }
            }

            continuationToken = response.NextContinuationToken;

        } catch (err) {
            console.error('Error listing objects:', err);
            break;
        }
    } while (continuationToken);

    console.log('\nScan complete.');
}

findUnique();
