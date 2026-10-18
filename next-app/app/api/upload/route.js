import { NextResponse } from 'next/server';
import { uploadToR2 } from '../../../lib/r2';

/**
 * Generic Public Upload API
 * Used by the mobile app to upload images to R2
 */
export async function POST(req) {
    try {
        const formData = await req.formData();
        const file = formData.get('file');
        const folder = formData.get('folder') || 'profiles';

        if (!file) {
            return NextResponse.json({ success: false, error: 'No file provided' }, { status: 400 });
        }

        // Generate unique filename
        // If file.name is missing (e.g. uploaded as blob without name), use a timestamp
        const originalName = file.name || 'image.jpg';
        const ext = originalName.split('.').pop();
        const key = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2, 11)}.${ext}`;

        // Convert file to buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload to R2
        const url = await uploadToR2(key, buffer, file.type || 'image/jpeg');

        return NextResponse.json({
            success: true,
            url,
            key
        });

    } catch (error) {
        console.error('API Upload error:', error);
        return NextResponse.json({
            success: false,
            error: 'Upload failed',
            details: error.message
        }, { status: 500 });
    }
}
