require('dotenv').config({ path: '.env.local' });
require('dotenv').config();

const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'lms-assets';

const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

async function checkSizes() {
    console.log('Checking file sizes in R2...');

    let continuationToken = undefined;
    let totalFiles = 0;
    let suspiciousCount = 0;
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

            totalFiles += contents.length;

            for (const file of contents) {
                if (file.Size === TARGET_SIZE) {
                    suspiciousCount++;
                }
            }

            continuationToken = response.NextContinuationToken;
            console.log(`Processed ${totalFiles} files...`);

        } catch (err) {
            console.error('Error listing objects:', err);
            break;
        }
    } while (continuationToken);

    console.log('\nResults:');
    console.log(`Total Files Scanned: ${totalFiles}`);
    console.log(`Files with size ${TARGET_SIZE} bytes: ${suspiciousCount}`);
    console.log(`Percentage: ${((suspiciousCount / totalFiles) * 100).toFixed(2)}%`);
}

checkSizes();
