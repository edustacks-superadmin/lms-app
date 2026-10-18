
import { NextResponse } from 'next/server';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'lms-assets';
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN?.split('NEXT_PUBLIC')[0].trim();

const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get('file');
        const folder = formData.get('folder') || 'uploads'; // Default folder

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        // Sanitize filename
        const timestamp = Date.now();
        const safeName = file.name ? file.name.replace(/[^a-zA-Z0-9.-]/g, '_') : 'image.png';
        const fileName = `${timestamp}-${safeName}`;

        const key = `${folder}/${fileName}`;

        // Convert file to buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload to R2
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: file.type || 'application/octet-stream'
        });

        await r2Client.send(command);

        const publicUrl = `${R2_PUBLIC_DOMAIN}/${key}`;

        return NextResponse.json({
            success: true,
            url: publicUrl,
            name: fileName
        });

    } catch (error) {
        console.error('Error uploading file to R2:', error);
        return NextResponse.json({ error: 'Internal Server Error', details: error.message }, { status: 500 });
    }
}
