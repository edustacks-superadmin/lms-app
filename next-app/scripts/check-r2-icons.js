const { S3Client, ListObjectsV2Command } = require('@aws-sdk/client-s3');
require('dotenv').config({ path: '.env' });
require('dotenv').config({ path: '.env.local', override: true });

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'lms-assets';

const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId, secretAccessKey },
});

async function main() {
    console.log('Listing R2 icons/Custom folder...');

    const command = new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: 'icons/Custom/',
        MaxKeys: 20
    });

    const response = await r2Client.send(command);

    console.log(`Found ${response.Contents?.length || 0} files:`);
    response.Contents?.forEach(file => {
        console.log(`  - ${file.Key}`);
    });
}

main().catch(console.error);
