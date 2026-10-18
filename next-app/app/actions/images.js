'use server';

import { uploadToR2, deleteFromR2, extractR2KeyFromUrl, replaceImageR2 } from '../../lib/r2';

/**
 * Upload an image to R2
 * @param {FormData} formData - Contains 'file' (File) and optional 'folder' (string)
 */
export async function uploadImage(formData) {
    try {
        const file = formData.get('file');
        const folder = formData.get('folder') || 'images';

        if (!file || !(file instanceof File)) {
            return { success: false, error: 'No file provided' };
        }

        // Generate unique filename
        const ext = file.name.split('.').pop();
        const key = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        // Convert file to buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Upload to R2
        const url = await uploadToR2(key, buffer, file.type);

        return { success: true, url, key };
    } catch (error) {
        console.error('Upload error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Delete an image from R2
 * @param {string} imageUrl - Full URL of the image to delete
 */
export async function deleteImage(imageUrl) {
    try {
        if (!imageUrl) {
            return { success: false, error: 'No image URL provided' };
        }

        const key = extractR2KeyFromUrl(imageUrl);
        if (!key) {
            return { success: false, error: 'Not an R2 URL, cannot delete' };
        }

        const result = await deleteFromR2(key);
        return result;
    } catch (error) {
        console.error('Delete error:', error);
        return { success: false, error: error.message };
    }
}

/**
 * Replace an image: delete old one and upload new one
 * @param {FormData} formData - Contains 'file', 'oldUrl' (optional), and 'folder'
 */
export async function replaceImage(formData) {
    try {
        const file = formData.get('file');
        const oldUrl = formData.get('oldUrl');
        const folder = formData.get('folder') || 'images';

        if (!file || !(file instanceof File)) {
            return { success: false, error: 'No file provided' };
        }

        // Generate unique filename
        const ext = file.name.split('.').pop();
        const newKey = `${folder}/${Date.now()}_${Math.random().toString(36).slice(2)}.${ext}`;

        // Convert file to buffer
        const buffer = Buffer.from(await file.arrayBuffer());

        // Replace (delete old + upload new)
        const newUrl = await replaceImageR2(oldUrl, newKey, buffer, file.type);

        return { success: true, url: newUrl, key: newKey, deletedOld: !!oldUrl };
    } catch (error) {
        console.error('Replace error:', error);
        return { success: false, error: error.message };
    }
}
