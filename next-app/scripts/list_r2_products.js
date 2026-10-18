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

async function listProductImages() {
    console.log('Listing files in product-images/ ...');

    // Try scanning the root or product-images prefix
    const command = new ListObjectsV2Command({
        Bucket: R2_BUCKET,
        Prefix: 'product-images/',
        MaxKeys: 20
    });

    try {
        const response = await r2Client.send(command);
        const contents = response.Contents || [];
        console.log('Files found:', contents.length);
        contents.forEach(f => console.log(` - ${f.Key} (${f.Size} bytes)`));

    } catch (err) {
        console.error('Error:', err);
    }
}

listProductImages();
