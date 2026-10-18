import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';

const accountId = process.env.R2_ACCOUNT_ID;
const accessKeyId = process.env.R2_ACCESS_KEY_ID;
const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY;

if (!accountId || !accessKeyId || !secretAccessKey) {
    // console.warn('Cloudflare R2 environment variables are missing.');
}

export const r2Client = new S3Client({
    region: 'auto',
    endpoint: `https://${accountId}.r2.cloudflarestorage.com`,
    credentials: {
        accessKeyId,
        secretAccessKey,
    },
});

// Sanitize R2_DOMAIN in case of env var concatenation issue (server restart pending)
let domain = process.env.R2_PUBLIC_DOMAIN;
if (domain && domain.includes('NEXT_PUBLIC_SUPABASE_URL')) {
    domain = domain.split('NEXT_PUBLIC_SUPABASE_URL')[0];
    if (domain.endsWith('"')) domain = domain.slice(0, -1); // Remove trailing quote if split left it
}
export const R2_DOMAIN = domain;
export const R2_BUCKET = process.env.R2_BUCKET_NAME || 'lms-assets';

/**
 * Upload a file to R2
 */
export async function uploadToR2(key, body, contentType) {
    if (!accountId) throw new Error("R2 Credentials Missing");

    const command = new PutObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
        Body: body,
        ContentType: contentType,
    });

    try {
        await r2Client.send(command);
        if (R2_DOMAIN) {
            return `${R2_DOMAIN}/${key}`;
        }
        return `https://${accountId}.r2.cloudflarestorage.com/${R2_BUCKET}/${key}`;
    } catch (error) {
        console.error("R2 Upload Error:", error);
        throw error;
    }
}

/**
 * Delete a file from R2
 * @param {string} key - The key/path of the file to delete
 */
export async function deleteFromR2(key) {
    if (!accountId) throw new Error("R2 Credentials Missing");
    if (!key) return { success: false, message: "No key provided" };

    const command = new DeleteObjectCommand({
        Bucket: R2_BUCKET,
        Key: key,
    });

    try {
        await r2Client.send(command);
        console.log(`✅ Deleted from R2: ${key}`);
        return { success: true };
    } catch (error) {
        console.error("R2 Delete Error:", error);
        return { success: false, error: error.message };
    }
}

/**
 * Extract the R2 key from a full URL
 * @param {string} url - Full URL like https://domain.com/posts/image.jpg
 * @returns {string|null} - The key like "posts/image.jpg" or null if not R2
 */
export function extractR2KeyFromUrl(url) {
    if (!url) return null;

    // Check for corrupted URL pattern specifically
    if (url.includes('NEXT_PUBLIC_SUPABASE_URL')) {
        // Corrupted: https://...r2.devNEXT_PUBLIC.../real/key
        // Attempt to find the real key starting with known buckets or just after the junk
        const parts = url.split('NEXT_PUBLIC_SUPABASE_URL');
        if (parts.length > 1) {
            const suffix = parts[1];
            // Look for start of path "/"
            const match = suffix.match(/"(\/[^"]+)/); // Matches ="/bucket/file"
            if (match) {
                return match[1].substring(1); // remove leading slash
            }
            // Fallback: finding first slash?
            const firstSlash = suffix.indexOf('/', 2); // skip potentially ="/
            if (firstSlash !== -1) {
                return suffix.substring(firstSlash + 1);
            }
        }
    }

    // Check if it's an R2 URL
    if (R2_DOMAIN && url.startsWith(R2_DOMAIN)) {
        return url.replace(`${R2_DOMAIN}/`, '');
    }

    // Check for direct R2 URL format
    const r2Pattern = /r2\.cloudflarestorage\.com\/[^/]+\/(.+)$/;
    const match = url.match(r2Pattern);
    if (match) {
        return match[1];
    }

    return null;
}

/**
 * Replace an image: delete old, upload new
 * @param {string|null} oldImageUrl - URL of old image to delete (null if none)
 * @param {string} newKey - Key for new image
 * @param {Buffer|Blob} newBody - New image content
 * @param {string} contentType - MIME type
 * @returns {string} - New image URL
 */
export async function replaceImageR2(oldImageUrl, newKey, newBody, contentType) {
    // 1. Delete old image if exists and is R2
    if (oldImageUrl) {
        const oldKey = extractR2KeyFromUrl(oldImageUrl);
        if (oldKey) {
            await deleteFromR2(oldKey);
        }
    }

    // 2. Upload new image
    const newUrl = await uploadToR2(newKey, newBody, contentType);
    return newUrl;
}
