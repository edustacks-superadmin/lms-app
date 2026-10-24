/**
 * Cloudflare R2 Upload Helper
 * Uploads files directly to Cloudflare R2 via /api/upload
 */
export async function uploadToR2(file, folder = 'uploads') {
    if (!file) {
        throw new Error('No file provided for upload');
    }

    const formData = new FormData();
    formData.append('file', file);
    formData.append('folder', folder);

    const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
    });

    const data = await res.json();

    if (!res.ok || !data.success) {
        throw new Error(data.error || 'Upload to Cloudflare R2 failed');
    }

    return {
        success: true,
        url: data.url,
        key: data.key,
        bucket: data.bucket,
    };
}
