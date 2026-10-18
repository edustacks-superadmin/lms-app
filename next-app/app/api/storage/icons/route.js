
import { NextResponse } from 'next/server';
import { S3Client, ListObjectsV2Command, PutObjectCommand } from '@aws-sdk/client-s3';

// R2 Configuration
const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;
const R2_BUCKET = process.env.R2_BUCKET_NAME || 'lms-assets';
const R2_PUBLIC_DOMAIN = process.env.R2_PUBLIC_DOMAIN?.split('NEXT_PUBLIC')[0].trim();
const BUCKET_FOLDER = 'icons';

const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
    },
});

export async function GET(request) {
    try {
        const { searchParams } = new URL(request.url);
        const categoryParam = searchParams.get('category');

        if (categoryParam) {
            // Fetch icons for specific category
            // R2 structure: icons/[category]/[filename]
            const prefix = `${BUCKET_FOLDER}/${categoryParam}/`;

            const command = new ListObjectsV2Command({
                Bucket: R2_BUCKET,
                Prefix: prefix,
                Delimiter: '/' // Standard delimiter, though we just want files
            });

            const { Contents } = await r2Client.send(command);
            const icons = [];

            if (Contents) {
                for (const item of Contents) {
                    // Skip the folder itself if it appears
                    if (item.Key === prefix) continue;

                    // Extract filename
                    const name = item.Key.split('/').pop();
                    const url = `${R2_PUBLIC_DOMAIN}/${item.Key}`;

                    icons.push({ name, url });
                }
            }

            return NextResponse.json({ icons });

        } else {
            // Fetch Categories (Subfolders in 'icons/')
            const command = new ListObjectsV2Command({
                Bucket: R2_BUCKET,
                Prefix: `${BUCKET_FOLDER}/`,
                Delimiter: '/'
            });

            const { CommonPrefixes } = await r2Client.send(command);

            const categories = new Set();

            // Add folders found in R2
            if (CommonPrefixes) {
                CommonPrefixes.forEach(prefixObj => {
                    // prefixObj.Prefix is like "icons/General/"
                    const parts = prefixObj.Prefix.split('/');
                    // parts = ["icons", "General", ""]
                    const categoryName = parts[1];
                    if (categoryName) categories.add(categoryName);
                });
            }

            // Ensure defaults exist if bucket strictly empty or just to be safe
            if (categories.size === 0) {
                categories.add('General');
            }
            categories.add('Custom');

            return NextResponse.json({
                categories: Array.from(categories).sort()
            });
        }

    } catch (error) {
        console.error('Error fetching icons from R2:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get('file');

        if (!file) {
            return NextResponse.json({ error: 'No file provided' }, { status: 400 });
        }

        const folderName = 'Custom';

        // Sanitize filename
        const timestamp = Date.now();
        const safeName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const fileName = `${timestamp}-${safeName}`;

        // Key: icons/Custom/filename
        const key = `${BUCKET_FOLDER}/${folderName}/${fileName}`;

        // Convert file to buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload to R2
        const command = new PutObjectCommand({
            Bucket: R2_BUCKET,
            Key: key,
            Body: buffer,
            ContentType: file.type || 'image/png' // Default fallback
        });

        await r2Client.send(command);

        const publicUrl = `${R2_PUBLIC_DOMAIN}/${key}`;

        return NextResponse.json({
            success: true,
            url: publicUrl,
            name: fileName
        });

    } catch (error) {
        console.error('Error uploading icon to R2:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
